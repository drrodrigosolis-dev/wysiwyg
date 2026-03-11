import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/html";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";

import { sampleDocument } from "../content/sampleDocument";
import {
  createRawChunkAttrs,
  createStructuredChunkAttrs,
  getChunkCapabilityTags,
  getChunkCategories,
  getChunkTemplate,
  getChunkTemplateConceptByTemplateId,
  getChunkTemplateConcepts,
  getStructuredChunkTemplates,
  parseChunkDataJson,
  RAW_CHUNK_TEMPLATE_ID,
  resolveChunkTemplateId,
} from "../editor/chunks/registry";
import {
  contentHasEnhancedInteractiveChunks,
  fromDomChunkAttributes,
  getInteractiveChunkCompatibilityBadgeText,
  getInteractiveChunkExportStyles,
  normalizeInteractiveChunkAttrs,
  renderInteractiveChunk,
} from "../editor/chunks/render";
import { getInteractiveChunkRuntimeScript, hydrateInteractiveChunkRuntime } from "../editor/chunks/runtime";
import type {
  ChunkCompatibility,
  ChunkData,
  ChunkField,
  ChunkMode,
  ChunkRepeaterField,
  ChunkRestriction,
  ChunkTemplateConcept,
  ChunkTemplateEngine,
  ChunkTemplate,
  InteractiveChunkAttrs,
} from "../editor/chunks/types";
import { buildEditorExtensions } from "../editor/extensions";
import { toMarkdown } from "../editor/export";
import { generateExportableHtml } from "../editor/html";
import { formatHtmlForCodeView, type HtmlCodeLayoutMode } from "../editor/htmlView";
import {
  findMatches,
  replaceAllMatches,
  replaceCurrentMatch,
  selectMatch,
  type SearchMatch,
  type SearchMatchOptions,
} from "../editor/search";
import { sanitizePastedHtml } from "../editor/sanitize";
import { duplicateTopLevelBlock, moveSection, moveTopLevelBlock, removeTopLevelBlock } from "../editor/sectionUtils";
import { getWorkspaceStorage, type WorkspaceStorage } from "../features/persistence/editorStorage";
import { buildRevisionDiff } from "../features/revisions/revisionDiff";
import { createSnapshot, createStructureSignature } from "../features/revisions/revisionPolicy";
import { computeStats } from "../lib/metrics";
import type {
  AccentName,
  CommandAction,
  EditorDocument,
  OutlineItem,
  RevisionSnapshot,
  RevisionDiffBlock,
  StatsSnapshot,
} from "../lib/types";

const editorExtensions = buildEditorExtensions();
const SAVE_DELAY = 350;
const IDLE_SNAPSHOT_DELAY = 90_000;
const STRUCTURE_SNAPSHOT_DELAY = 800;
const RAIL_PREFS_KEY = "velvet-ink/rail-prefs/v2";
const THEME_PREFS_KEY = "velvet-ink/theme-prefs/v1";
const SECTION_PREFS_KEY = "velvet-ink/section-prefs/v1";
const CHUNK_BUILDER_LAYOUT_PREFS_KEY = "velvet-ink/chunk-builder-layout/v1";
const CHUNK_BUILDER_DENSITY_PREFS_KEY = "velvet-ink/chunk-builder-density/v1";
const CHUNK_BUILDER_DENSITY_PROFILE_PREFS_KEY = "velvet-ink/chunk-builder-density-profile/v1";
const GUIDANCE_PREFS_KEY = "velvet-ink/guidance/v1";
const DENSITY_PREFS_KEY = "velvet-ink/density/v1";
const WORKFLOW_TRACK_PREFS_KEY = "velvet-ink/workflow-track/v1";
const NAVIGATION_PROFILE_PREFS_KEY = "velvet-ink/navigation-profile/v1";
const WORKSPACE_LAYOUT_PREFS_KEY = "velvet-ink/workspace-layout/v1";
const WORKSPACE_COACH_PREFS_KEY = "velvet-ink/workspace-coach/v1";
const MODE_SCENE_PREFS_KEY = "velvet-ink/mode-scene/v1";
const PULSE_LENS_PREFS_KEY = "velvet-ink/pulse-lens/v1";
const PULSE_TARGET_PREFS_KEY = "velvet-ink/pulse-target/v1";
const REVISION_FILTER_PREFS_KEY = "velvet-ink/revision-filter/v1";
const REVISION_DIFF_FOCUS_PREFS_KEY = "velvet-ink/revision-diff-focus/v1";
const MINIMAP_DEPTH_PREFS_KEY = "velvet-ink/minimap-depth/v1";
const MINIMAP_LABEL_PREFS_KEY = "velvet-ink/minimap-label/v1";
const MINIMAP_HIGHLIGHT_PREFS_KEY = "velvet-ink/minimap-highlight/v1";
const FIND_STRATEGY_PREFS_KEY = "velvet-ink/find-strategy/v1";
const FIND_RECENT_PREFS_KEY = "velvet-ink/find-recent/v1";
const CHUNK_BUILD_STRATEGY_PREFS_KEY = "velvet-ink/chunk-build-strategy/v1";
const OUTLINE_STRATEGY_PREFS_KEY = "velvet-ink/outline-strategy/v1";
const WORD_GOAL_MIN = 300;
const WORD_GOAL_MAX = 2400;
const WORD_GOAL_STEP = 25;
const CHARACTER_GOAL_MIN = 1200;
const CHARACTER_GOAL_MAX = 18000;
const CHARACTER_GOAL_STEP = 25;
const INTERACTIVE_CHUNK_STYLE_TAG_ID = "velvet-ink-interactive-chunk-styles";

const ACCENT_OPTIONS: Array<{ label: string; value: AccentName }> = [
  { label: "Ember", value: "ember" },
  { label: "Tide", value: "tide" },
  { label: "Moss", value: "moss" },
  { label: "Rose", value: "rose" },
  { label: "Gold", value: "gold" },
  { label: "Slate", value: "slate" },
];

const ACCENT_LINK_COLORS: Record<AccentName, string> = {
  ember: "#f26d3d",
  tide: "#2f6cf6",
  moss: "#14825d",
  rose: "#c94975",
  gold: "#ce9123",
  slate: "#485e7e",
};

type CommandDefinition = CommandAction & {
  description: string;
  surface: "palette" | "slash" | "both";
  searchText?: string;
  compatibilityLabel?: string;
  run: () => void;
};

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
type PanelCollapsePrefs = Record<string, boolean>;
type WorkspacePage = "editor" | "chunk-builder";
type ChunkBuilderLayoutMode = "split" | "tools-top" | "stacked";
type ChunkBuilderDensityMode = "dense" | "balanced" | "spacious" | "adaptive";
type ChunkBuilderDensityLevel = Exclude<ChunkBuilderDensityMode, "adaptive">;
type ChunkBuilderDensityProfile = {
  compact: ChunkBuilderDensityLevel;
  medium: ChunkBuilderDensityLevel;
  large: ChunkBuilderDensityLevel;
};
type GuidanceLevel = "guided" | "balanced" | "expert";
type InterfaceDensity = "compact" | "balanced" | "comfort";
type WorkflowTrack = "draft" | "revise" | "publish";
type NavigationProfile = "immersive" | "balanced" | "survey";
type WorkspaceLayoutPreset = "balanced" | "focus" | "panorama";
type WorkspaceCoachPresetId = "starter-guided" | "hybrid-balanced" | "ship-review";
type ModeScenePresetId = "draft-sprint" | "deep-focus" | "review-sweep";
type StyleRecipeId = "editorial" | "story" | "analysis" | "briefing";
type StylePersonaId = "clarity" | "narrative" | "contrast";
type ChunkIntentProfileId = "story" | "analysis" | "conversion";
type ChunkBuildStrategyId = "safe-lesson" | "interactive-lab" | "ship-ready";
type ReplaceTransform = "as-typed" | "lower" | "upper" | "title";
type FindStrategyId = "precision" | "sweep" | "normalize";
type OutlineDepthFilter = "all" | "h1" | "h2" | "h3";
type OutlineJumpMode = "focus" | "focus-and-fold";
type OutlineStrategyId = "structure-scan" | "active-draft" | "reorder-pass";
type MinimapDepthFilter = "all" | "h1-h2" | "h1";
type MinimapLabelMode = "full" | "compact" | "hidden";
type MinimapHighlightMode = "active" | "level";
type PulseLens = "flow" | "structure" | "delivery";
type PulseCadenceTarget = "calm" | "balanced" | "brisk";
type RevisionFilter = "all" | "checkpoint" | "autosave" | "restore";
type RevisionDiffFocus = "balanced" | "additions" | "deletions";

type ChunkBuilderTarget =
  | {
      mode: "insert";
    }
  | {
      mode: "update";
      anchorAttrs: InteractiveChunkAttrs;
    };

type ChunkBuilderState = {
  target: ChunkBuilderTarget;
  draft: InteractiveChunkAttrs;
  pickerTemplateId: string;
  rawDraft: string | null;
};

type WorkspaceProps = {
  storage: WorkspaceStorage;
  initialDocument: EditorDocument;
  initialSnapshots: RevisionSnapshot[];
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onThemePreferenceChange: (value: ThemePreference) => void;
};

type RgbaValue = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type ViewMode = "rich" | "html" | "exportable";
type CodeMode = "html" | "exportable";
type LengthUnit = "px" | "em" | "rem" | "%" | "pt" | "ch" | "vw" | "vh";
type LineHeightUnit = "unitless" | "px" | "em" | "rem" | "%";

const DEFAULT_TEXT_RGBA: RgbaValue = { r: 33, g: 22, b: 15, a: 1 };
const DEFAULT_HIGHLIGHT_RGBA: RgbaValue = { r: 242, g: 109, b: 61, a: 0.18 };
const DEFAULT_BLOCK_RGBA: RgbaValue = { r: 242, g: 109, b: 61, a: 0.12 };

const VIEW_MODE_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: "rich", label: "Rich text" },
  { value: "html", label: "HTML source" },
  { value: "exportable", label: "Exportable HTML" },
];

const BLOCK_BACKGROUNDS = [
  { label: "None", value: "none" },
  { label: "Note", value: "note" },
  { label: "Warning", value: "warning" },
  { label: "Success", value: "success" },
] as const;

const ALIGNMENTS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
  { label: "Justify", value: "justify" },
] as const;

const ICON_INSERTIONS = [
  { label: "Idea", value: "💡" },
  { label: "Spark", value: "✦" },
  { label: "Check", value: "✓" },
  { label: "Arrow", value: "→" },
  { label: "Alert", value: "⚑" },
] as const;

const CUSTOM_SELECT_VALUE = "__custom__";

const FONT_SIZE_OPTIONS = [
  { label: "9.5", value: "9.5px" },
  { label: "11", value: "11px" },
  { label: "12", value: "12px" },
  { label: "13", value: "13px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "30", value: "30px" },
  { label: "36", value: "36px" },
  { label: "2.4rem", value: "2.4rem" },
] as const;

const FONT_FAMILY_OPTIONS = [
  { label: "Serif default", value: `"Iowan Old Style", "Palatino Linotype", serif` },
  { label: "Sans", value: `"Avenir Next", "Segoe UI", sans-serif` },
  { label: "Mono", value: `"SFMono-Regular", Menlo, monospace` },
  { label: "Georgia", value: `"Georgia", "Times New Roman", serif` },
  { label: "Garamond", value: `"Garamond", "Times New Roman", serif` },
] as const;

const LINE_HEIGHT_OPTIONS = [
  { label: "Snug", value: "1.15" },
  { label: "Tight", value: "1.3" },
  { label: "Compact", value: "1.5" },
  { label: "Comfort", value: "1.8" },
  { label: "Airy", value: "2" },
] as const;

const FONT_WEIGHT_OPTIONS = [
  { label: "Thin 100", value: "100" },
  { label: "Light 300", value: "300" },
  { label: "Normal 400", value: "400" },
  { label: "Medium 500", value: "500" },
  { label: "Semibold 600", value: "600" },
  { label: "Bold 700", value: "700" },
  { label: "Black 900", value: "900" },
  { label: "Bolder", value: "bolder" },
  { label: "Lighter", value: "lighter" },
] as const;

const LETTER_SPACING_OPTIONS = [
  { label: "Tighter", value: "-0.02em" },
  { label: "Normal", value: "0em" },
  { label: "Loose", value: "0.03em" },
  { label: "Very loose", value: "0.06em" },
] as const;

const LENGTH_UNITS: readonly LengthUnit[] = ["px", "em", "rem", "%", "pt", "ch", "vw", "vh"];
const LINE_HEIGHT_UNITS: readonly LineHeightUnit[] = ["unitless", "%", "em", "rem", "px"];

const HTML_INTERACTIVE_CHUNK_TEMPLATES = getStructuredChunkTemplates("html");
const CHUNK_TEMPLATE_CONCEPTS = getChunkTemplateConcepts();
const INTERACTIVE_CHUNK_CATEGORIES = getChunkCategories();
const DEFAULT_CHUNK_TEMPLATE_ID = HTML_INTERACTIVE_CHUNK_TEMPLATES[0]?.id ?? "scroll-carousel";
const CHUNK_ENGINE_FILTER_OPTIONS: Array<{ label: string; value: ChunkTemplateEngine }> = [
  { label: "Pure HTML", value: "html" },
  { label: "JavaScript", value: "javascript" },
];
const CHUNK_BUILDER_LAYOUT_OPTIONS: Array<{ label: string; value: ChunkBuilderLayoutMode }> = [
  { label: "Tools top", value: "tools-top" },
  { label: "Split", value: "split" },
  { label: "Stacked", value: "stacked" },
];
const CHUNK_BUILDER_DENSITY_OPTIONS: Array<{ label: string; value: ChunkBuilderDensityMode }> = [
  { label: "Dense", value: "dense" },
  { label: "Balanced", value: "balanced" },
  { label: "Spacious", value: "spacious" },
  { label: "Adaptive", value: "adaptive" },
];
const CHUNK_BUILDER_DENSITY_LEVEL_OPTIONS: Array<{ label: string; value: ChunkBuilderDensityLevel }> = [
  { label: "Dense", value: "dense" },
  { label: "Balanced", value: "balanced" },
  { label: "Spacious", value: "spacious" },
];
const DEFAULT_CHUNK_BUILDER_DENSITY_PROFILE: ChunkBuilderDensityProfile = {
  compact: "dense",
  medium: "balanced",
  large: "spacious",
};
const GUIDANCE_OPTIONS: Array<{ label: string; value: GuidanceLevel; copy: string }> = [
  { label: "Guided", value: "guided", copy: "Shows richer coaching cues and starter presets." },
  { label: "Balanced", value: "balanced", copy: "Keeps tips concise while preserving all controls." },
  { label: "Expert", value: "expert", copy: "Minimal coaching and denser utility surfaces." },
];
const DENSITY_OPTIONS: Array<{ label: string; value: InterfaceDensity; copy: string }> = [
  { label: "Compact", value: "compact", copy: "Tighter spacing for high-density editing." },
  { label: "Balanced", value: "balanced", copy: "Default density for mixed drafting and review." },
  { label: "Comfort", value: "comfort", copy: "Larger spacing for slower, deliberate editing." },
];
const WORKFLOW_TRACK_OPTIONS: Array<{
  label: string;
  value: WorkflowTrack;
  copy: string;
}> = [
  { label: "Draft", value: "draft", copy: "Prioritizes momentum, scaffolding, and rapid iteration." },
  { label: "Revise", value: "revise", copy: "Balances structure checks, diff review, and readability." },
  { label: "Publish", value: "publish", copy: "Tightens final checks for concise, release-ready output." },
];
const NAVIGATION_PROFILE_OPTIONS: Array<{
  label: string;
  value: NavigationProfile;
  copy: string;
}> = [
  { label: "Immersive", value: "immersive", copy: "Deep-focus path with tighter minimap cues and fewer distractions." },
  { label: "Balanced", value: "balanced", copy: "Keeps drafting focus while preserving full navigation context." },
  { label: "Survey", value: "survey", copy: "Expands navigation and review surfaces for structural scanning." },
];
const WORKSPACE_LAYOUT_OPTIONS: Array<{
  label: string;
  value: WorkspaceLayoutPreset;
  copy: string;
}> = [
  { label: "Balanced", value: "balanced", copy: "Default split with equal drafting and review context." },
  { label: "Focus", value: "focus", copy: "Wider writing column with compact side rails." },
  { label: "Panorama", value: "panorama", copy: "Expanded rails for structure-heavy sweeps and audits." },
];
const WORKSPACE_COACH_OPTIONS: Array<{
  id: WorkspaceCoachPresetId;
  label: string;
  summary: string;
  tip: string;
  guidance: GuidanceLevel;
  density: InterfaceDensity;
  workflow: WorkflowTrack;
  navigation: NavigationProfile;
  layout: WorkspaceLayoutPreset;
  modeScene: ModeScenePresetId;
}> = [
  {
    id: "starter-guided",
    label: "Starter guided",
    summary: "Teaching-forward setup for early drafting and low-friction structure checks.",
    tip: "Apply this when onboarding a new draft or collaborator.",
    guidance: "guided",
    density: "comfort",
    workflow: "draft",
    navigation: "balanced",
    layout: "balanced",
    modeScene: "draft-sprint",
  },
  {
    id: "hybrid-balanced",
    label: "Hybrid balanced",
    summary: "Mixed drafting and review with concise coaching and visible rails.",
    tip: "Good default when switching between writing and chunk tuning.",
    guidance: "balanced",
    density: "balanced",
    workflow: "revise",
    navigation: "balanced",
    layout: "panorama",
    modeScene: "review-sweep",
  },
  {
    id: "ship-review",
    label: "Ship review",
    summary: "High-density checks for final passes, exports, and revision confidence.",
    tip: "Use before final export to tighten structure and consistency.",
    guidance: "expert",
    density: "compact",
    workflow: "publish",
    navigation: "survey",
    layout: "panorama",
    modeScene: "review-sweep",
  },
];
const MODE_SCENE_OPTIONS: Array<{
  id: ModeScenePresetId;
  label: string;
  summary: string;
  tip: string;
  focus: boolean;
  typewriter: boolean;
  leftRail: boolean;
  rightRail: boolean;
}> = [
  {
    id: "draft-sprint",
    label: "Draft sprint",
    summary: "Fast drafting with light structure nearby.",
    tip: "Capture a checkpoint every few paragraphs to anchor your revision timeline.",
    focus: false,
    typewriter: true,
    leftRail: true,
    rightRail: false,
  },
  {
    id: "deep-focus",
    label: "Deep focus",
    summary: "Distraction-minimized flow for concentrated writing.",
    tip: "Use Focus plus Typewriter together when pacing falls below your target cadence.",
    focus: true,
    typewriter: true,
    leftRail: true,
    rightRail: false,
  },
  {
    id: "review-sweep",
    label: "Review sweep",
    summary: "Structure-aware pass with both rails available.",
    tip: "Pair section jumps with checkpoints to make before/after decisions visible.",
    focus: false,
    typewriter: false,
    leftRail: true,
    rightRail: true,
  },
];
const MINIMAP_DEPTH_OPTIONS: Array<{ label: string; value: MinimapDepthFilter }> = [
  { label: "All levels", value: "all" },
  { label: "H1-H2", value: "h1-h2" },
  { label: "H1 only", value: "h1" },
];
const MINIMAP_LABEL_OPTIONS: Array<{ label: string; value: MinimapLabelMode }> = [
  { label: "Full", value: "full" },
  { label: "Compact", value: "compact" },
  { label: "Hidden", value: "hidden" },
];
const MINIMAP_HIGHLIGHT_OPTIONS: Array<{ label: string; value: MinimapHighlightMode }> = [
  { label: "Active", value: "active" },
  { label: "By level", value: "level" },
];
const PULSE_LENS_OPTIONS: Array<{
  label: string;
  value: PulseLens;
  copy: string;
}> = [
  { label: "Flow", value: "flow", copy: "Tracks reading pace and sentence rhythm." },
  { label: "Structure", value: "structure", copy: "Tracks heading and paragraph architecture." },
  { label: "Delivery", value: "delivery", copy: "Tracks publish readiness and revision freshness." },
];
const PULSE_TARGET_OPTIONS: Array<{
  label: string;
  value: PulseCadenceTarget;
  ratioMin: number;
  ratioMax: number;
}> = [
  { label: "Calm", value: "calm", ratioMin: 58, ratioMax: 86 },
  { label: "Balanced", value: "balanced", ratioMin: 40, ratioMax: 72 },
  { label: "Brisk", value: "brisk", ratioMin: 24, ratioMax: 56 },
];
const REVISION_FILTER_OPTIONS: Array<{
  label: string;
  value: RevisionFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Checkpoints", value: "checkpoint" },
  { label: "Autosaves", value: "autosave" },
  { label: "Restores", value: "restore" },
];
const REVISION_DIFF_FOCUS_OPTIONS: Array<{
  label: string;
  value: RevisionDiffFocus;
}> = [
  { label: "Balanced", value: "balanced" },
  { label: "Growth", value: "additions" },
  { label: "Trim", value: "deletions" },
];
const REPLACE_TRANSFORM_OPTIONS: Array<{ label: string; value: ReplaceTransform }> = [
  { label: "As typed", value: "as-typed" },
  { label: "lowercase", value: "lower" },
  { label: "UPPERCASE", value: "upper" },
  { label: "Title Case", value: "title" },
];
const FIND_STRATEGY_OPTIONS: Array<{
  id: FindStrategyId;
  label: string;
  summary: string;
  replaceTransform: ReplaceTransform;
  caseSensitive: boolean;
  wholeWord: boolean;
}> = [
  {
    id: "precision",
    label: "Precision",
    summary: "Exact terms only, preserving replacement casing.",
    replaceTransform: "as-typed",
    caseSensitive: true,
    wholeWord: true,
  },
  {
    id: "sweep",
    label: "Sweep",
    summary: "Broad scan for variants while keeping whole phrases intact.",
    replaceTransform: "title",
    caseSensitive: false,
    wholeWord: true,
  },
  {
    id: "normalize",
    label: "Normalize",
    summary: "Fast cleanup pass across all case variants.",
    replaceTransform: "lower",
    caseSensitive: false,
    wholeWord: false,
  },
];
const OUTLINE_DEPTH_OPTIONS: Array<{ label: string; value: OutlineDepthFilter }> = [
  { label: "All levels", value: "all" },
  { label: "H1 only", value: "h1" },
  { label: "H1-H2", value: "h2" },
  { label: "H1-H3", value: "h3" },
];
const OUTLINE_JUMP_OPTIONS: Array<{ label: string; value: OutlineJumpMode }> = [
  { label: "Focus only", value: "focus" },
  { label: "Focus + fold others", value: "focus-and-fold" },
];
const STYLE_RECIPES: Array<{
  id: StyleRecipeId;
  label: string;
  intent: string;
  summary: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  fontFamily: string;
}> = [
  {
    id: "editorial",
    label: "Editorial",
    intent: "Longform clarity",
    summary: "Comfortable rhythm for essays and narrative chapters.",
    fontSize: "1.12rem",
    fontWeight: "400",
    lineHeight: "1.85",
    letterSpacing: "0em",
    fontFamily: `"Iowan Old Style", "Palatino Linotype", serif`,
  },
  {
    id: "story",
    label: "Story",
    intent: "Warm narrative",
    summary: "Softer contrast with airy spacing for reflective sections.",
    fontSize: "1.05rem",
    fontWeight: "400",
    lineHeight: "1.95",
    letterSpacing: "0.01em",
    fontFamily: `"Garamond", "Times New Roman", serif`,
  },
  {
    id: "analysis",
    label: "Analysis",
    intent: "Dense insights",
    summary: "Sharper hierarchy for reports, benchmarks, and technical notes.",
    fontSize: "1rem",
    fontWeight: "500",
    lineHeight: "1.6",
    letterSpacing: "0em",
    fontFamily: `"Avenir Next", "Segoe UI", sans-serif`,
  },
  {
    id: "briefing",
    label: "Briefing",
    intent: "Executive skim",
    summary: "Compact cadence to support scanning and decision reviews.",
    fontSize: "0.96rem",
    fontWeight: "500",
    lineHeight: "1.45",
    letterSpacing: "0.02em",
    fontFamily: `"Avenir Next", "Segoe UI", sans-serif`,
  },
];
const STYLE_PERSONA_OPTIONS: Array<{
  id: StylePersonaId;
  label: string;
  summary: string;
  tip: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textColor: RgbaValue;
  highlight: RgbaValue;
  blockBackground: RgbaValue;
}> = [
  {
    id: "clarity",
    label: "Clarity",
    summary: "Crisp, neutral contrast for analytical paragraphs.",
    tip: "Use this for decision sections where scan speed matters more than tone.",
    fontSize: "1rem",
    fontWeight: "500",
    lineHeight: "1.58",
    letterSpacing: "0em",
    textColor: { r: 31, g: 29, b: 35, a: 1 },
    highlight: { r: 84, g: 125, b: 255, a: 0.2 },
    blockBackground: { r: 84, g: 125, b: 255, a: 0.12 },
  },
  {
    id: "narrative",
    label: "Narrative",
    summary: "Warm cadence with gentler line rhythm for story beats.",
    tip: "Use for character moments and reflective transitions.",
    fontSize: "1.08rem",
    fontWeight: "400",
    lineHeight: "1.9",
    letterSpacing: "0.01em",
    textColor: { r: 48, g: 29, b: 20, a: 1 },
    highlight: { r: 242, g: 148, b: 103, a: 0.22 },
    blockBackground: { r: 242, g: 148, b: 103, a: 0.14 },
  },
  {
    id: "contrast",
    label: "Contrast",
    summary: "Higher emphasis for announcements and key actions.",
    tip: "Use sparingly on callouts to avoid visual fatigue.",
    fontSize: "0.98rem",
    fontWeight: "600",
    lineHeight: "1.46",
    letterSpacing: "0.02em",
    textColor: { r: 16, g: 17, b: 30, a: 1 },
    highlight: { r: 240, g: 194, b: 66, a: 0.26 },
    blockBackground: { r: 240, g: 194, b: 66, a: 0.15 },
  },
];
const CHUNK_INTENT_PROFILES: Array<{
  id: ChunkIntentProfileId;
  label: string;
  summary: string;
  tip: string;
  templateId: string;
  layout: ChunkBuilderLayoutMode;
  density: ChunkBuilderDensityMode;
}> = [
  {
    id: "story",
    label: "Story flow",
    summary: "For narrative sections with momentum and chronology.",
    tip: "Use one visual anchor per chunk, then trim caption copy to one sentence.",
    templateId: "vertical-timeline",
    layout: "tools-top",
    density: "balanced",
  },
  {
    id: "analysis",
    label: "Analysis",
    summary: "For metrics, comparison, and evidence-heavy content.",
    tip: "Lead each metric with one interpretation line so numbers stay teachable.",
    templateId: "metric-cards-row",
    layout: "split",
    density: "dense",
  },
  {
    id: "conversion",
    label: "Action",
    summary: "For CTA and proof blocks near decision points.",
    tip: "Keep one primary action and one supporting proof signal inside each chunk.",
    templateId: "cta-banner",
    layout: "stacked",
    density: "spacious",
  },
];
const CHUNK_BUILD_STRATEGY_OPTIONS: Array<{
  id: ChunkBuildStrategyId;
  label: string;
  summary: string;
  tip: string;
  engine: ChunkTemplateEngine;
  capabilityTag: string;
  intentProfileId: ChunkIntentProfileId;
  layout: ChunkBuilderLayoutMode;
  density: ChunkBuilderDensityMode;
}> = [
  {
    id: "safe-lesson",
    label: "Safe lesson",
    summary: "Pure HTML defaults with predictable behavior and strong accessibility footing.",
    tip: "Use for dependable educational chunks where runtime-free output is preferred.",
    engine: "html",
    capabilityTag: "a11y",
    intentProfileId: "analysis",
    layout: "tools-top",
    density: "balanced",
  },
  {
    id: "interactive-lab",
    label: "Interactive lab",
    summary: "JavaScript-enabled templates for richer learner feedback and stateful controls.",
    tip: "Use when interaction data and immediate feedback are core to the section.",
    engine: "javascript",
    capabilityTag: "runtime",
    intentProfileId: "story",
    layout: "split",
    density: "dense",
  },
  {
    id: "ship-ready",
    label: "Ship ready",
    summary: "Conversion-oriented profile for concise, action-focused interaction blocks.",
    tip: "Use near decision points to keep calls-to-action obvious and lightweight.",
    engine: "html",
    capabilityTag: "analytics",
    intentProfileId: "conversion",
    layout: "stacked",
    density: "spacious",
  },
];
const OUTLINE_STRATEGY_OPTIONS: Array<{
  id: OutlineStrategyId;
  label: string;
  summary: string;
  tip: string;
  depth: OutlineDepthFilter;
  jumpMode: OutlineJumpMode;
  activeOnly: boolean;
}> = [
  {
    id: "structure-scan",
    label: "Structure scan",
    summary: "Broad map for hierarchy auditing and section ordering checks.",
    tip: "Use before revisions to catch heading-depth drift quickly.",
    depth: "h3",
    jumpMode: "focus",
    activeOnly: false,
  },
  {
    id: "active-draft",
    label: "Active draft",
    summary: "Single-locus drafting with contextual jumps around the current section.",
    tip: "Use while actively writing to reduce rail noise.",
    depth: "h2",
    jumpMode: "focus-and-fold",
    activeOnly: true,
  },
  {
    id: "reorder-pass",
    label: "Reorder pass",
    summary: "Open map for drag-reordering and cross-section refactors.",
    tip: "Use when resequencing large blocks or chapter groups.",
    depth: "all",
    jumpMode: "focus",
    activeOnly: false,
  },
];

export function App() {
  const [storage, setStorage] = useState<WorkspaceStorage | null>(null);
  const [initialDocument, setInitialDocument] = useState<EditorDocument | null>(null);
  const [initialSnapshots, setInitialSnapshots] = useState<RevisionSnapshot[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => readThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemePreference(
      readThemePreference(),
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false,
    ),
  );

  useEffect(() => {
    const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const initialResolvedTheme = resolveThemePreference(themePreference, mediaQuery?.matches ?? false);

    setResolvedTheme(initialResolvedTheme);
    document.body.dataset.theme = initialResolvedTheme;
    document.documentElement.style.colorScheme = initialResolvedTheme;
    writeThemePreference(themePreference);

    if (!mediaQuery || themePreference !== "system") {
      return;
    }

    const handleThemeChange = (event: MediaQueryListEvent) => {
      const nextResolvedTheme: ResolvedTheme = event.matches ? "dark" : "light";
      setResolvedTheme(nextResolvedTheme);
      document.body.dataset.theme = nextResolvedTheme;
      document.documentElement.style.colorScheme = nextResolvedTheme;
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleThemeChange);
      return () => {
        mediaQuery.removeEventListener("change", handleThemeChange);
      };
    }

    mediaQuery.addListener(handleThemeChange);
    return () => {
      mediaQuery.removeListener(handleThemeChange);
    };
  }, [themePreference]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const workspaceStorage = await getWorkspaceStorage();
        const [document, snapshots] = await Promise.all([
          workspaceStorage.loadDocument(),
          workspaceStorage.listSnapshots(),
        ]);

        if (!active) {
          return;
        }

        setStorage(workspaceStorage);
        setInitialDocument(document);
        setInitialSnapshots(snapshots);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Could not load the local workspace.";
        setBootError(message);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (bootError) {
    return (
      <div className="loading-shell">
        <p className="loading-eyebrow">Velvet Ink</p>
        <h1>Workspace failed to load.</h1>
        <p>{bootError}</p>
      </div>
    );
  }

  if (!storage || !initialDocument) {
    return (
      <div className="loading-shell">
        <p className="loading-eyebrow">Velvet Ink</p>
        <h1>Preparing the writer-first canvas.</h1>
        <p>Restoring the last local draft and revision history.</p>
      </div>
    );
  }

  return (
    <Workspace
      storage={storage}
      initialDocument={initialDocument}
      initialSnapshots={initialSnapshots}
      themePreference={themePreference}
      resolvedTheme={resolvedTheme}
      onThemePreferenceChange={setThemePreference}
    />
  );
}

function Workspace({
  storage,
  initialDocument,
  initialSnapshots,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
}: WorkspaceProps) {
  const [title, setTitle] = useState(initialDocument.title);
  const [wordGoal, setWordGoal] = useState(initialDocument.wordGoal);
  const [characterGoal, setCharacterGoal] = useState(initialDocument.characterGoal);
  const [accent, setAccent] = useState(initialDocument.accent);
  const [focusMode, setFocusMode] = useState(initialDocument.focusMode);
  const [typewriterMode, setTypewriterMode] = useState(initialDocument.typewriterMode);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [stats, setStats] = useState<StatsSnapshot>(() => computeStats(initialDocument.content));
  const [selectionLabel, setSelectionLabel] = useState("Cursor ready");
  const [saveLabel, setSaveLabel] = useState(storage.usingIndexedDb ? "Ready with IndexedDB" : "Local fallback active");
  const [leftRailOpen, setLeftRailOpen] = useState(() => readRailPref("left"));
  const [rightRailOpen, setRightRailOpen] = useState(() => readRailPref("right"));
  const [panelCollapsePrefs, setPanelCollapsePrefs] = useState<PanelCollapsePrefs>(() => readSectionPrefs());
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const [findPanelOpen, setFindPanelOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [snapshots, setSnapshots] = useState<RevisionSnapshot[]>(initialSnapshots);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(initialSnapshots[0]?.id ?? null);
  const [collapsedKeys, setCollapsedKeys] = useState<string[]>([]);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [blockHandle, setBlockHandle] = useState<{ index: number; top: number } | null>(null);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("rich");
  const [sideBySide, setSideBySide] = useState(false);
  const [htmlCodeLayout, setHtmlCodeLayout] = useState<HtmlCodeLayoutMode>("paragraphs");
  const [codeDrafts, setCodeDrafts] = useState<Record<CodeMode, string | null>>({
    html: null,
    exportable: null,
  });
  const [codeEditing, setCodeEditing] = useState<Record<CodeMode, boolean>>({
    html: false,
    exportable: false,
  });
  const [codeErrors, setCodeErrors] = useState<Record<CodeMode, string | null>>({
    html: null,
    exportable: null,
  });
  const [workspacePage, setWorkspacePage] = useState<WorkspacePage>("editor");
  const [chunkTemplateEngineFilter, setChunkTemplateEngineFilter] = useState<ChunkTemplateEngine>("html");
  const [chunkCapabilityFilter, setChunkCapabilityFilter] = useState("all");
  const [chunkPickerTemplateId, setChunkPickerTemplateId] = useState(DEFAULT_CHUNK_TEMPLATE_ID);
  const [rawChunkDraft, setRawChunkDraft] = useState<string | null>(null);
  const [chunkBuilderState, setChunkBuilderState] = useState<ChunkBuilderState | null>(null);
  const [chunkBuilderLayout, setChunkBuilderLayout] = useState<ChunkBuilderLayoutMode>(() =>
    readChunkBuilderLayoutPreference(),
  );
  const [chunkBuilderDensity, setChunkBuilderDensity] = useState<ChunkBuilderDensityMode>(() =>
    readChunkBuilderDensityPreference(),
  );
  const [chunkBuilderDensityProfile, setChunkBuilderDensityProfile] = useState<ChunkBuilderDensityProfile>(() =>
    readChunkBuilderDensityProfilePreference(),
  );
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>(() => readGuidancePreference());
  const [interfaceDensity, setInterfaceDensity] = useState<InterfaceDensity>(() => readDensityPreference());
  const [workflowTrack, setWorkflowTrack] = useState<WorkflowTrack>(() => readWorkflowTrackPreference());
  const [navigationProfile, setNavigationProfile] = useState<NavigationProfile>(() => readNavigationProfilePreference());
  const [workspaceLayoutPreset, setWorkspaceLayoutPreset] = useState<WorkspaceLayoutPreset>(() =>
    readWorkspaceLayoutPreference(),
  );
  const [workspaceCoachPresetId, setWorkspaceCoachPresetId] = useState<WorkspaceCoachPresetId>(() =>
    readWorkspaceCoachPreference(),
  );
  const [modeScenePresetId, setModeScenePresetId] = useState<ModeScenePresetId>(() => readModeScenePreference());
  const [styleRecipeId, setStyleRecipeId] = useState<StyleRecipeId>("editorial");
  const [stylePersonaId, setStylePersonaId] = useState<StylePersonaId>("clarity");
  const [chunkIntentProfileId, setChunkIntentProfileId] = useState<ChunkIntentProfileId>("analysis");
  const [chunkBuildStrategyId, setChunkBuildStrategyId] = useState<ChunkBuildStrategyId>(() =>
    readChunkBuildStrategyPreference(),
  );
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [findWholeWord, setFindWholeWord] = useState(false);
  const [replaceTransform, setReplaceTransform] = useState<ReplaceTransform>("as-typed");
  const [findStrategyId, setFindStrategyId] = useState<FindStrategyId>(() => readFindStrategyPreference());
  const [recentFindQueries, setRecentFindQueries] = useState<string[]>(() => readRecentFindQueriesPreference());
  const [outlineDepthFilter, setOutlineDepthFilter] = useState<OutlineDepthFilter>("all");
  const [outlineActiveOnly, setOutlineActiveOnly] = useState(false);
  const [outlineJumpMode, setOutlineJumpMode] = useState<OutlineJumpMode>("focus");
  const [outlineStrategyId, setOutlineStrategyId] = useState<OutlineStrategyId>(() => readOutlineStrategyPreference());
  const [minimapDepthFilter, setMinimapDepthFilter] = useState<MinimapDepthFilter>(() => readMinimapDepthPreference());
  const [minimapLabelMode, setMinimapLabelMode] = useState<MinimapLabelMode>(() => readMinimapLabelPreference());
  const [minimapHighlightMode, setMinimapHighlightMode] = useState<MinimapHighlightMode>(() =>
    readMinimapHighlightPreference(),
  );
  const [pulseLens, setPulseLens] = useState<PulseLens>(() => readPulseLensPreference());
  const [pulseCadenceTarget, setPulseCadenceTarget] = useState<PulseCadenceTarget>(() => readPulseTargetPreference());
  const [revisionFilter, setRevisionFilter] = useState<RevisionFilter>(() => readRevisionFilterPreference());
  const [revisionDiffFocus, setRevisionDiffFocus] = useState<RevisionDiffFocus>(() => readRevisionDiffFocusPreference());
  const [textColorRgba, setTextColorRgba] = useState<RgbaValue>(DEFAULT_TEXT_RGBA);
  const [highlightRgba, setHighlightRgba] = useState<RgbaValue>(DEFAULT_HIGHLIGHT_RGBA);
  const [blockBackgroundRgba, setBlockBackgroundRgba] = useState<RgbaValue>(DEFAULT_BLOCK_RGBA);
  const [fontSizeNumberDraft, setFontSizeNumberDraft] = useState("16");
  const [fontSizeUnitDraft, setFontSizeUnitDraft] = useState<LengthUnit>("px");
  const [lineHeightNumberDraft, setLineHeightNumberDraft] = useState("1.8");
  const [lineHeightUnitDraft, setLineHeightUnitDraft] = useState<LineHeightUnit>("unitless");
  const [fontWeightDraft, setFontWeightDraft] = useState("400");
  const [letterSpacingNumberDraft, setLetterSpacingNumberDraft] = useState("0");
  const [letterSpacingUnitDraft, setLetterSpacingUnitDraft] = useState<LengthUnit>("em");
  const [fontFamilyDraft, setFontFamilyDraft] = useState("");
  const [customIconValue, setCustomIconValue] = useState("");

  const saveTimerRef = useRef<number | null>(null);
  const idleSnapshotTimerRef = useRef<number | null>(null);
  const structureSnapshotTimerRef = useRef<number | null>(null);
  const latestStructureSignatureRef = useRef(createStructureSignature(initialDocument.content));
  const lastSnapshotSignatureRef = useRef(
    createStructureSignature(initialSnapshots[0]?.content ?? initialDocument.content),
  );
  const latestMetaRef = useRef({
    title: initialDocument.title,
    wordGoal: initialDocument.wordGoal,
    characterGoal: initialDocument.characterGoal,
    accent: initialDocument.accent,
    focusMode: initialDocument.focusMode,
    typewriterMode: initialDocument.typewriterMode,
  });
  const typewriterModeRef = useRef(initialDocument.typewriterMode);
  const slashStateRef = useRef({ open: false, query: "", index: 0 });
  const commandRef = useRef<CommandDefinition[]>([]);
  const snapshotsRef = useRef(initialSnapshots);
  const chunkBuilderPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    latestMetaRef.current = {
      title,
      wordGoal,
      characterGoal,
      accent,
      focusMode,
      typewriterMode,
    };
  }, [title, wordGoal, characterGoal, accent, focusMode, typewriterMode]);

  useEffect(() => {
    typewriterModeRef.current = typewriterMode;
  }, [typewriterMode]);

  useEffect(() => {
    slashStateRef.current = { open: slashOpen, query: slashQuery, index: slashIndex };
  }, [slashOpen, slashQuery, slashIndex]);

  useEffect(() => {
    snapshotsRef.current = snapshots;
  }, [snapshots]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: initialDocument.content,
    autofocus: "end",
    editorProps: {
      attributes: {
        class: "velvet-prosemirror",
      },
      transformPastedHTML: sanitizePastedHtml,
      handleKeyDown: (_view, event) => {
        if (event.defaultPrevented) {
          return false;
        }

        const isModifier = event.metaKey || event.ctrlKey;

        if (isModifier && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setCommandPaletteOpen(true);
          setCommandQuery("");
          return true;
        }

        if (isModifier && event.key.toLowerCase() === "f") {
          event.preventDefault();
          setFindPanelOpen(true);
          return true;
        }

        if (event.key === "Escape") {
          setCommandPaletteOpen(false);
          setFindPanelOpen(false);
          setSlashOpen(false);
          setLinkEditorOpen(false);
          setShortcutOpen(false);
          setBlockMenuOpen(false);
          setFocusMode(false);
        }

        if (!isModifier && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
          event.preventDefault();
          if (!editor) {
            return true;
          }

          const direction: 1 | -1 = event.key === "ArrowUp" ? 1 : -1;
          if (event.shiftKey) {
            nudgeFontWeightWithKeyboard(editor, direction);
          } else {
            nudgeFontSizeWithKeyboard(editor, direction);
          }

          return true;
        }

        if (
          !isModifier &&
          event.altKey &&
          !event.shiftKey &&
          (event.key === "." || event.key === "," || event.code === "Period" || event.code === "Comma")
        ) {
          event.preventDefault();
          if (!editor) {
            return true;
          }

          const direction: 1 | -1 = event.key === "," || event.code === "Comma" ? -1 : 1;
          nudgeLetterSpacingWithKeyboard(editor, direction);
          return true;
        }

        if (slashStateRef.current.open) {
          const filtered = getFilteredCommands(commandRef.current, slashStateRef.current.query, "slash");
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSlashIndex((current) => (current + 1) % Math.max(filtered.length, 1));
            return true;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSlashIndex((current) => (current - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
            return true;
          }

          if (event.key === "Backspace") {
            event.preventDefault();
            setSlashIndex(0);
            if (!slashStateRef.current.query) {
              setSlashOpen(false);
              return true;
            }

            setSlashQuery((current) => current.slice(0, -1));
            return true;
          }

          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            filtered[slashStateRef.current.index]?.run();
            setSlashOpen(false);
            setSlashQuery("");
            setSlashIndex(0);
            return true;
          }

          if (event.key.length === 1 && /\S/.test(event.key)) {
            event.preventDefault();
            setSlashQuery((current) => current + event.key.toLowerCase());
            setSlashIndex(0);
            return true;
          }
        }

        if (event.key === "/" && shouldOpenSlash(editor)) {
          event.preventDefault();
          const coords = editor?.view.coordsAtPos(editor.state.selection.from) ?? { top: 0, left: 0, right: 0, bottom: 0 };
          setSlashOpen(true);
          setSlashQuery("");
          setSlashIndex(0);
          setSlashPosition({ top: coords.bottom + 10, left: coords.left + 8 });
          return true;
        }

        if (event.key === "?" && !isModifier) {
          event.preventDefault();
          setShortcutOpen(true);
          return true;
        }

        return false;
      },
    },
    onCreate: ({ editor: nextEditor }) => {
      refreshDerived(
        nextEditor,
        findQuery,
        { caseSensitive: findCaseSensitive, wholeWord: findWholeWord },
        setOutline,
        setStats,
        setMatches,
        setActiveMatchIndex,
        setActiveSectionKey,
        setSelectionLabel,
        setBlockHandle,
      );
      syncInteractiveChunkPreviewsInEditor(nextEditor);
    },
    onUpdate: ({ editor: nextEditor }) => {
      refreshDerived(
        nextEditor,
        findQuery,
        { caseSensitive: findCaseSensitive, wholeWord: findWholeWord },
        setOutline,
        setStats,
        setMatches,
        setActiveMatchIndex,
        setActiveSectionKey,
        setSelectionLabel,
        setBlockHandle,
      );
      syncInteractiveChunkPreviewsInEditor(nextEditor);
      queueSave(nextEditor);

      const signature = createStructureSignature(nextEditor.getJSON());
      window.clearTimeout(idleSnapshotTimerRef.current ?? undefined);
      idleSnapshotTimerRef.current = window.setTimeout(() => {
        if (signature !== lastSnapshotSignatureRef.current) {
          void createRevision(nextEditor, "autosave");
        }
      }, IDLE_SNAPSHOT_DELAY);

      if (signature !== latestStructureSignatureRef.current) {
        latestStructureSignatureRef.current = signature;
        window.clearTimeout(structureSnapshotTimerRef.current ?? undefined);
        structureSnapshotTimerRef.current = window.setTimeout(() => {
          if (signature !== lastSnapshotSignatureRef.current) {
            void createRevision(nextEditor, "autosave");
          }
        }, STRUCTURE_SNAPSHOT_DELAY);
      }
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      refreshSelectionDerived(nextEditor, setSelectionLabel, setBlockHandle, setActiveSectionKey, outline);
      syncInteractiveChunkPreviewsInEditor(nextEditor);
      setRawChunkDraft(null);
      if (typewriterModeRef.current) {
        scrollCurrentBlockIntoView(nextEditor);
      }
    },
  });

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const isModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isModifier && key === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        setCommandQuery("");
        return;
      }

      if (isModifier && key === "f") {
        event.preventDefault();
        setFindPanelOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
        setFindPanelOpen(false);
        setSlashOpen(false);
        setLinkEditorOpen(false);
        setShortcutOpen(false);
        setBlockMenuOpen(false);
        setFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts, true);
    };
  }, []);

  function insertStructuredChunk(templateId: string) {
    if (!editor) {
      return;
    }

    const nextTemplate =
      resolveStructuredTemplateSelection(templateId, chunkTemplateEngineFilter) ??
      resolveStructuredTemplateSelection(chunkPickerTemplateId, chunkTemplateEngineFilter) ??
      resolveStructuredTemplateSelection(DEFAULT_CHUNK_TEMPLATE_ID, "html");
    if (!nextTemplate) {
      return;
    }
    const attrs = createStructuredChunkAttrs(nextTemplate.id);
    editor.commands.insertInteractiveChunk(attrs);
    selectInsertedInteractiveChunk(editor);
    setChunkTemplateEngineFilter(nextTemplate.engine);
    setChunkPickerTemplateId(nextTemplate.id);
    setRightRailOpen(true);
  }

  function insertRawChunk() {
    if (!editor) {
      return;
    }

    const initialRawHtml = `<section><h3>Raw HTML Block</h3><p>Paste strict-safe markup here.</p></section>`;
    const attrs = createRawChunkAttrs(initialRawHtml, "strict");
    editor.commands.insertInteractiveChunk(attrs);
    selectInsertedInteractiveChunk(editor);
    setChunkTemplateEngineFilter("html");
    setRawChunkDraft(initialRawHtml);
    setRightRailOpen(true);
  }

  useEffect(() => {
    commandRef.current = buildCommands(editor, {
      openFind: () => setFindPanelOpen(true),
      openLinkEditor: () => {
        if (!editor) {
          return;
        }
        setLinkValue(String(editor.getAttributes("link").href ?? ""));
        setLinkEditorOpen(true);
      },
      toggleFocus: () => setFocusMode((current) => !current),
      toggleTypewriter: () => setTypewriterMode((current) => !current),
      checkpoint: () => {
        if (editor) {
          void createRevision(editor, "manual-checkpoint");
        }
      },
      insertFootnote: () => {
        if (editor) {
          insertFootnote(editor);
        }
      },
      copyMarkdown: async () => {
        if (!editor) {
          return;
        }
        await copyMarkdown(editor);
      },
      exportHtml: () => {
        if (editor) {
          exportHtml(editor, title, accent);
        }
      },
      openRevisions: () => setRightRailOpen(true),
      insertChunk: (templateId) => insertStructuredChunk(templateId),
      insertRawChunk: () => insertRawChunk(),
    });
  }, [editor, title, accent]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const root = editor.view.dom as HTMLElement;
    const handleActionClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const chunkElement = target?.closest<HTMLElement>('div[data-interactive-chunk="true"]');
      if (!chunkElement) {
        return;
      }

      const focused = focusInteractiveChunkDomNode(editor, chunkElement);
      if (!focused) {
        return;
      }

      const actionElement = target?.closest<HTMLElement>("[data-vi-editor-action]");
      if (!actionElement) {
        setRightRailOpen(true);
        return;
      }

      const action = String(actionElement.getAttribute("data-vi-editor-action") ?? "");
      const attrs = fromDomChunkAttributes(chunkElement);
      const normalizedAttrs = normalizeInteractiveChunkAttrs(attrs);
      event.preventDefault();
      event.stopPropagation();

      if (action === "edit") {
        openChunkBuilder(normalizedAttrs);
        return;
      }

      if (action === "toggle-mode") {
        if (normalizedAttrs.mode === "raw") {
          const fallbackTemplate = getChunkTemplate(chunkPickerTemplateId) ?? HTML_INTERACTIVE_CHUNK_TEMPLATES[0];
          const nextAttrs = createStructuredChunkAttrs(fallbackTemplate?.id ?? DEFAULT_CHUNK_TEMPLATE_ID);
          editor.commands.updateInteractiveChunk(nextAttrs);
        } else {
          const rendered = renderInteractiveChunk(normalizedAttrs);
          const nextAttrs = createRawChunkAttrs(rendered.html, "strict");
          editor.commands.updateInteractiveChunk(nextAttrs);
          setRawChunkDraft(rendered.html);
        }
        setRightRailOpen(true);
        return;
      }

      if (action === "add-item" && normalizedAttrs.mode === "structured") {
        const template = getChunkTemplate(normalizedAttrs.templateId);
        if (!template || template.id === RAW_CHUNK_TEMPLATE_ID) {
          return;
        }

        const current = parseChunkDataJson(normalizedAttrs.dataJson, template.defaultData);
        const nextItems = normalizeRepeaterItems(current.items);
        const repeaterField = template.fields.find((field): field is ChunkRepeaterField => field.type === "repeater");
        if (!repeaterField) {
          return;
        }
        const nextItem = buildRepeaterItemDefaults(repeaterField, nextItems.length, template.id);
        nextItems.push(nextItem);

        editor.commands.updateInteractiveChunk({
          ...normalizedAttrs,
          dataJson: JSON.stringify({
            ...current,
            items: nextItems,
          }),
        });
        setRightRailOpen(true);
      }
    };

    root.addEventListener("click", handleActionClick, true);
    return () => {
      root.removeEventListener("click", handleActionClick, true);
    };
  }, [editor, chunkPickerTemplateId]);

  const paletteCommands = getFilteredCommands(commandRef.current, commandQuery, "palette");
  const slashCommands = getFilteredCommands(commandRef.current, slashQuery, "slash");
  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null;
  const revisionDiff = selectedSnapshot && editor ? buildRevisionDiff(editor.getJSON(), selectedSnapshot.content) : [];
  const focusedRevisionDiff = revisionDiff.filter((block) => {
    if (revisionDiffFocus === "balanced") {
      return true;
    }
    if (revisionDiffFocus === "additions") {
      return block.kind === "insert" || block.kind === "change";
    }
    return block.kind === "delete" || block.kind === "change";
  });
  const revisionSummary = summarizeDiff(revisionDiff);
  const selectionCount = matches.length > 0 ? `${activeMatchIndex + 1}/${matches.length}` : "0/0";
  const findBehavior: SearchMatchOptions = {
    caseSensitive: findCaseSensitive,
    wholeWord: findWholeWord,
  };
  const wordGoalProgress = Math.min(100, (stats.words / Math.max(wordGoal, 1)) * 100);
  const characterGoalProgress = Math.min(100, (stats.charactersWithSpaces / Math.max(characterGoal, 1)) * 100);

  useEffect(() => {
    if (!editor) {
      return;
    }

    refreshDerived(
      editor,
      findQuery,
      findBehavior,
      setOutline,
      setStats,
      setMatches,
      setActiveMatchIndex,
      setActiveSectionKey,
      setSelectionLabel,
      setBlockHandle,
    );
  }, [editor, findQuery, findCaseSensitive, findWholeWord]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    applyCollapsedSections(editor, outline, collapsedKeys);
  }, [editor, outline, collapsedKeys]);

  useEffect(() => {
    if (!selectedSnapshotId && snapshots[0]) {
      setSelectedSnapshotId(snapshots[0].id);
    }
  }, [selectedSnapshotId, snapshots]);

  useEffect(() => {
    writeRailPrefs(leftRailOpen, rightRailOpen);
  }, [leftRailOpen, rightRailOpen]);

  useEffect(() => {
    writeSectionPrefs(panelCollapsePrefs);
  }, [panelCollapsePrefs]);

  useEffect(() => {
    writeChunkBuilderLayoutPreference(chunkBuilderLayout);
  }, [chunkBuilderLayout]);

  useEffect(() => {
    writeChunkBuilderDensityPreference(chunkBuilderDensity);
  }, [chunkBuilderDensity]);

  useEffect(() => {
    writeChunkBuilderDensityProfilePreference(chunkBuilderDensityProfile);
  }, [chunkBuilderDensityProfile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    writeGuidancePreference(guidanceLevel);
  }, [guidanceLevel]);

  useEffect(() => {
    writeDensityPreference(interfaceDensity);
  }, [interfaceDensity]);

  useEffect(() => {
    writeWorkflowTrackPreference(workflowTrack);
  }, [workflowTrack]);

  useEffect(() => {
    writeNavigationProfilePreference(navigationProfile);
  }, [navigationProfile]);

  useEffect(() => {
    writeWorkspaceLayoutPreference(workspaceLayoutPreset);
  }, [workspaceLayoutPreset]);

  useEffect(() => {
    writeWorkspaceCoachPreference(workspaceCoachPresetId);
  }, [workspaceCoachPresetId]);

  useEffect(() => {
    writeModeScenePreference(modeScenePresetId);
  }, [modeScenePresetId]);

  useEffect(() => {
    writeMinimapDepthPreference(minimapDepthFilter);
  }, [minimapDepthFilter]);

  useEffect(() => {
    writeMinimapLabelPreference(minimapLabelMode);
  }, [minimapLabelMode]);

  useEffect(() => {
    writeMinimapHighlightPreference(minimapHighlightMode);
  }, [minimapHighlightMode]);

  useEffect(() => {
    writePulseLensPreference(pulseLens);
  }, [pulseLens]);

  useEffect(() => {
    writePulseTargetPreference(pulseCadenceTarget);
  }, [pulseCadenceTarget]);

  useEffect(() => {
    writeRevisionFilterPreference(revisionFilter);
  }, [revisionFilter]);

  useEffect(() => {
    writeRevisionDiffFocusPreference(revisionDiffFocus);
  }, [revisionDiffFocus]);

  useEffect(() => {
    writeFindStrategyPreference(findStrategyId);
  }, [findStrategyId]);

  useEffect(() => {
    writeRecentFindQueriesPreference(recentFindQueries);
  }, [recentFindQueries]);

  useEffect(() => {
    writeChunkBuildStrategyPreference(chunkBuildStrategyId);
  }, [chunkBuildStrategyId]);

  useEffect(() => {
    writeOutlineStrategyPreference(outlineStrategyId);
  }, [outlineStrategyId]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    queueSave(editor);
  }, [editor, title, wordGoal, characterGoal, accent, focusMode, typewriterMode]);

  useEffect(() => {
    if (!editor || !typewriterMode) {
      return;
    }

    scrollCurrentBlockIntoView(editor);
  }, [editor, typewriterMode]);

  useEffect(() => {
    if (!editor || workspacePage !== "editor") {
      return;
    }

    syncInteractiveChunkPreviewsInEditor(editor);
  }, [editor, workspacePage]);

  useEffect(() => {
    if (workspacePage !== "chunk-builder") {
      return;
    }
    const previewNode = chunkBuilderPreviewRef.current;
    if (!previewNode) {
      return;
    }

    hydrateInteractiveChunkPreview(previewNode);
    const frame = window.requestAnimationFrame(() => {
      hydrateInteractiveChunkPreview(previewNode);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    workspacePage,
    chunkBuilderState?.draft.mode,
    chunkBuilderState?.draft.templateId,
    chunkBuilderState?.draft.dataJson,
    chunkBuilderState?.draft.rawHtml,
    chunkBuilderState?.rawDraft,
  ]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleBeforeUnload = () => {
      void persistDocument(editor);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [editor, storage]);

  const currentTextColor = String(editor?.getAttributes("textStyle").color ?? "");
  const currentFontSize = String(editor?.getAttributes("textStyle").fontSize ?? "");
  const currentFontFamily = String(editor?.getAttributes("textStyle").fontFamily ?? "");
  const currentFontWeight = String(editor?.getAttributes("textStyle").fontWeight ?? "");
  const currentLetterSpacing = String(editor?.getAttributes("textStyle").letterSpacing ?? "");
  const currentHighlightColor = String(editor?.getAttributes("highlight").color ?? "");
  const currentCalloutBackground = String(editor?.getAttributes("callout").backgroundColor ?? "");
  const currentAlignment = String(editor?.getAttributes("heading").textAlign ?? editor?.getAttributes("paragraph").textAlign ?? "left");
  const currentLineHeight = resolveLineHeight(editor);
  const currentCalloutTone = editor?.isActive("callout") ? String(editor.getAttributes("callout").tone ?? "note") : "none";
  const fontSizeSelectValue = resolveSelectValue(currentFontSize, FONT_SIZE_OPTIONS.map((option) => option.value));
  const fontFamilySelectValue = resolveSelectValue(currentFontFamily, FONT_FAMILY_OPTIONS.map((option) => option.value));
  const fontWeightSelectValue = resolveSelectValue(currentFontWeight, FONT_WEIGHT_OPTIONS.map((option) => option.value));
  const letterSpacingSelectValue = resolveSelectValue(currentLetterSpacing, LETTER_SPACING_OPTIONS.map((option) => option.value));
  const lineHeightSelectValue = resolveSelectValue(currentLineHeight, LINE_HEIGHT_OPTIONS.map((option) => option.value));

  useEffect(() => {
    setTextColorRgba(parseCssColor(currentTextColor, DEFAULT_TEXT_RGBA));
  }, [currentTextColor]);

  useEffect(() => {
    setHighlightRgba(parseCssColor(currentHighlightColor, DEFAULT_HIGHLIGHT_RGBA));
  }, [currentHighlightColor]);

  useEffect(() => {
    setBlockBackgroundRgba(parseCssColor(currentCalloutBackground, DEFAULT_BLOCK_RGBA));
  }, [currentCalloutBackground]);

  useEffect(() => {
    const parsed = parseLengthValue(currentFontSize, "16", "px");
    setFontSizeNumberDraft(parsed.numberValue);
    setFontSizeUnitDraft(parsed.unit);
  }, [currentFontSize]);

  useEffect(() => {
    const parsed = parseLineHeightValue(currentLineHeight, "1.8");
    setLineHeightNumberDraft(parsed.numberValue);
    setLineHeightUnitDraft(parsed.unit);
  }, [currentLineHeight]);

  useEffect(() => {
    const normalized = currentFontWeight.trim();
    setFontWeightDraft(normalized || "400");
  }, [currentFontWeight]);

  useEffect(() => {
    const parsed = parseLengthValue(currentLetterSpacing, "0", "em");
    setLetterSpacingNumberDraft(parsed.numberValue);
    setLetterSpacingUnitDraft(parsed.unit);
  }, [currentLetterSpacing]);

  useEffect(() => {
    setFontFamilyDraft(currentFontFamily.trim());
  }, [currentFontFamily]);

  const parsedFontSizeDraft = parseLengthDraft(fontSizeNumberDraft, fontSizeUnitDraft, false);
  const parsedLineHeightDraft = parseLineHeightDraft(lineHeightNumberDraft, lineHeightUnitDraft);
  const parsedFontWeightDraft = parseFontWeightDraft(fontWeightDraft);
  const parsedLetterSpacingDraft = parseLengthDraft(letterSpacingNumberDraft, letterSpacingUnitDraft, true);
  const selectedGuidanceOption =
    GUIDANCE_OPTIONS.find((option) => option.value === guidanceLevel) ?? GUIDANCE_OPTIONS[1];
  const selectedDensityOption =
    DENSITY_OPTIONS.find((option) => option.value === interfaceDensity) ?? DENSITY_OPTIONS[1];
  const selectedWorkflowTrack =
    WORKFLOW_TRACK_OPTIONS.find((option) => option.value === workflowTrack) ?? WORKFLOW_TRACK_OPTIONS[1];
  const selectedNavigationProfile =
    NAVIGATION_PROFILE_OPTIONS.find((option) => option.value === navigationProfile) ?? NAVIGATION_PROFILE_OPTIONS[1];
  const selectedWorkspaceLayout =
    WORKSPACE_LAYOUT_OPTIONS.find((option) => option.value === workspaceLayoutPreset) ?? WORKSPACE_LAYOUT_OPTIONS[0];
  const selectedWorkspaceCoach =
    WORKSPACE_COACH_OPTIONS.find((option) => option.id === workspaceCoachPresetId) ?? WORKSPACE_COACH_OPTIONS[1];
  const selectedModeScenePreset =
    MODE_SCENE_OPTIONS.find((option) => option.id === modeScenePresetId) ?? MODE_SCENE_OPTIONS[0];
  const selectedMinimapDepthOption =
    MINIMAP_DEPTH_OPTIONS.find((option) => option.value === minimapDepthFilter) ?? MINIMAP_DEPTH_OPTIONS[0];
  const selectedMinimapLabelOption =
    MINIMAP_LABEL_OPTIONS.find((option) => option.value === minimapLabelMode) ?? MINIMAP_LABEL_OPTIONS[0];
  const selectedMinimapHighlightOption =
    MINIMAP_HIGHLIGHT_OPTIONS.find((option) => option.value === minimapHighlightMode) ?? MINIMAP_HIGHLIGHT_OPTIONS[0];
  const selectedPulseLens = PULSE_LENS_OPTIONS.find((option) => option.value === pulseLens) ?? PULSE_LENS_OPTIONS[1];
  const selectedPulseTarget =
    PULSE_TARGET_OPTIONS.find((option) => option.value === pulseCadenceTarget) ?? PULSE_TARGET_OPTIONS[1];
  const selectedStyleRecipe = STYLE_RECIPES.find((recipe) => recipe.id === styleRecipeId) ?? STYLE_RECIPES[0];
  const selectedStylePersona = STYLE_PERSONA_OPTIONS.find((persona) => persona.id === stylePersonaId) ?? STYLE_PERSONA_OPTIONS[0];
  const selectedFindStrategy = FIND_STRATEGY_OPTIONS.find((strategy) => strategy.id === findStrategyId) ?? FIND_STRATEGY_OPTIONS[0];
  const selectedChunkIntentProfile =
    CHUNK_INTENT_PROFILES.find((profile) => profile.id === chunkIntentProfileId) ?? CHUNK_INTENT_PROFILES[1];
  const selectedChunkBuildStrategy =
    CHUNK_BUILD_STRATEGY_OPTIONS.find((strategy) => strategy.id === chunkBuildStrategyId) ?? CHUNK_BUILD_STRATEGY_OPTIONS[0];
  const selectedOutlineStrategy =
    OUTLINE_STRATEGY_OPTIONS.find((strategy) => strategy.id === outlineStrategyId) ?? OUTLINE_STRATEGY_OPTIONS[0];
  const selectedChunkIntentTemplate = getChunkTemplate(selectedChunkIntentProfile.templateId);
  const filteredSnapshots = snapshots.filter((snapshot) => {
    if (revisionFilter === "all") {
      return true;
    }
    if (revisionFilter === "checkpoint") {
      return snapshot.reason === "manual-checkpoint";
    }
    return snapshot.reason === revisionFilter;
  });
  const snapshotIntervals = getSnapshotIntervalsInMinutes(snapshots);
  const averageSnapshotCadence = snapshotIntervals.length
    ? Math.round(snapshotIntervals.reduce((sum, value) => sum + value, 0) / snapshotIntervals.length)
    : null;
  const latestSnapshotAgeMinutes = snapshots[0] ? getMinutesSince(snapshots[0].createdAt) : null;
  const pulseStructureHeadingDensity = stats.words > 0 ? Math.round((stats.headings / stats.words) * 1000 * 10) / 10 : 0;
  const pulseStructureParagraphDensity = stats.words > 0 ? Math.round((stats.paragraphs / stats.words) * 1000 * 10) / 10 : 0;
  const pulseCadenceInTarget =
    stats.cadenceRatio >= selectedPulseTarget.ratioMin && stats.cadenceRatio <= selectedPulseTarget.ratioMax;
  const pulseReadinessScore = clampPercent(Math.round((wordGoalProgress + characterGoalProgress + stats.cadenceRatio) / 3));
  const pulseLensScore =
    pulseLens === "flow"
      ? clampPercent(Math.round((stats.cadenceRatio + wordGoalProgress) / 2))
      : pulseLens === "structure"
        ? clampPercent(Math.round(Math.min(100, pulseStructureHeadingDensity * 24 + pulseStructureParagraphDensity * 7)))
        : pulseReadinessScore;
  const pulseTip =
    pulseLens === "flow"
      ? pulseCadenceInTarget
        ? "Cadence is inside target. Keep sentence variety while drafting."
        : `Cadence is outside the ${selectedPulseTarget.label.toLowerCase()} target. Adjust sentence length mix.`
      : pulseLens === "structure"
        ? "Use heading clusters and shorter paragraphs to support scanning."
        : "Use revisions + cadence together before exporting final HTML.";
  const findMatchDensity = stats.words > 0 ? Math.round((matches.length / stats.words) * 1000 * 10) / 10 : 0;
  const findDensityTip =
    findMatchDensity > 12
      ? "High match density: run Replace all carefully with a narrow strategy."
      : findMatchDensity > 4
        ? "Moderate match density: preview next/prev before bulk changes."
        : "Low match density: broader strategy can speed cleanup passes.";
  const visibleOutline = outline.filter((item) => {
    if (outlineDepthFilter === "h1" && item.level > 1) {
      return false;
    }
    if (outlineDepthFilter === "h2" && item.level > 2) {
      return false;
    }
    if (outlineDepthFilter === "h3" && item.level > 3) {
      return false;
    }

    if (outlineActiveOnly && activeSectionKey && item.key !== activeSectionKey) {
      return false;
    }

    return true;
  });
  const outlineLevelCounts = {
    h1: outline.filter((item) => item.level === 1).length,
    h2: outline.filter((item) => item.level === 2).length,
    h3: outline.filter((item) => item.level === 3).length,
    deeper: outline.filter((item) => item.level > 3).length,
  };
  const outlineDepthDriftCount = outline.reduce((count, item, index) => {
    if (index === 0) {
      return count;
    }
    const previous = outline[index - 1];
    return previous && item.level - previous.level > 1 ? count + 1 : count;
  }, 0);
  const outlineCoverageRatio = outline.length > 0 ? Math.round((visibleOutline.length / outline.length) * 100) : 0;
  const outlineCoachTip =
    outlineLevelCounts.h1 === 0
      ? "Add at least one H1 heading so large sections anchor correctly."
      : outlineDepthDriftCount > 0
        ? "Depth jumps detected. Consider adding bridge headings for smoother hierarchy."
        : "Hierarchy is steady. Use Reorder pass when sequencing chapters.";
  const minimapVisibleOutline = outline.filter((item) => {
    if (minimapDepthFilter === "h1" && item.level > 1) {
      return false;
    }
    if (minimapDepthFilter === "h1-h2" && item.level > 2) {
      return false;
    }
    return true;
  });
  const minimapActiveIndex = minimapVisibleOutline.findIndex((item) => item.key === activeSectionKey);

  if (!editor) {
    return (
      <div className="loading-shell">
        <p className="loading-eyebrow">Velvet Ink</p>
        <h1>Building the editor surface.</h1>
        <p>Loading the structured document model and command system.</p>
      </div>
    );
  }

  const activeEditor = editor;
  const documentJson = activeEditor.getJSON() as JSONContent;
  const htmlSource = generateHTML(documentJson, editorExtensions);
  const exportableHtmlSource = generateExportableHtml(documentJson, editorExtensions);
  const activeCodeMode: CodeMode = viewMode === "exportable" ? "exportable" : "html";
  const codeSources: Record<CodeMode, string> = {
    html: htmlSource,
    exportable: exportableHtmlSource,
  };
  const codeLabels: Record<CodeMode, string> = {
    html: "HTML source view",
    exportable: "Exportable HTML view",
  };
  const generatedCodeValue = formatHtmlForEditing(codeSources[activeCodeMode], htmlCodeLayout);
  const codeViewValue = codeDrafts[activeCodeMode] ?? generatedCodeValue;
  const codeViewLabel = codeLabels[activeCodeMode];
  const codeIsDirty = codeDrafts[activeCodeMode] !== null && codeDrafts[activeCodeMode] !== generatedCodeValue;
  const showRichView = sideBySide || viewMode === "rich";
  const showCodeView = sideBySide || viewMode !== "rich";
  const workspaceClassName = `workspace workspace-layout-${workspaceLayoutPreset} ${leftRailOpen ? "left-open" : "left-closed"} ${rightRailOpen ? "right-open" : "right-closed"}`;
  const chunkCapabilityTags = getChunkCapabilityTags({ engine: chunkTemplateEngineFilter });
  const filteredChunkConcepts = getChunkTemplateConcepts({
    engine: chunkTemplateEngineFilter,
    capabilityTag: chunkCapabilityFilter === "all" ? undefined : chunkCapabilityFilter,
  });
  const selectedChunkTemplate = getChunkTemplate(chunkPickerTemplateId);
  const selectedChunkConcept =
    (selectedChunkTemplate && selectedChunkTemplate.id !== RAW_CHUNK_TEMPLATE_ID
      ? getChunkTemplateConceptByTemplateId(selectedChunkTemplate.id)
      : null) ??
    filteredChunkConcepts[0] ??
    CHUNK_TEMPLATE_CONCEPTS[0] ??
    null;
  const activeChunk = resolveActiveInteractiveChunk(activeEditor);
  const activeChunkAttrs = activeChunk ? normalizeInteractiveChunkAttrs(activeChunk.attrs) : null;
  const activeChunkTemplate =
    activeChunkAttrs && activeChunkAttrs.mode === "structured" ? getChunkTemplate(activeChunkAttrs.templateId) : null;
  const activeChunkConcept =
    activeChunkTemplate && activeChunkTemplate.id !== RAW_CHUNK_TEMPLATE_ID
      ? getChunkTemplateConceptByTemplateId(activeChunkTemplate.id)
      : null;
  const activeChunkData =
    activeChunkAttrs && activeChunkTemplate ? parseChunkDataJson(activeChunkAttrs.dataJson, activeChunkTemplate.defaultData) : null;
  const activeChunkPreview = activeChunkAttrs ? renderInteractiveChunk(activeChunkAttrs) : null;
  const activeRawChunkPreview =
    activeChunkAttrs && activeChunkAttrs.mode === "raw"
      ? renderInteractiveChunk({
          ...activeChunkAttrs,
          mode: "raw",
          rawHtml: rawChunkDraft ?? activeChunkAttrs.rawHtml,
        })
      : null;
  const chunkBuilderDraft = chunkBuilderState?.draft ?? null;
  const chunkBuilderTemplate =
    chunkBuilderDraft && chunkBuilderDraft.mode === "structured" ? getChunkTemplate(chunkBuilderDraft.templateId) : null;
  const chunkBuilderConcept =
    chunkBuilderTemplate && chunkBuilderTemplate.id !== RAW_CHUNK_TEMPLATE_ID
      ? getChunkTemplateConceptByTemplateId(chunkBuilderTemplate.id)
      : null;
  const chunkBuilderData =
    chunkBuilderDraft && chunkBuilderTemplate ? parseChunkDataJson(chunkBuilderDraft.dataJson, chunkBuilderTemplate.defaultData) : null;
  const chunkBuilderFields = chunkBuilderTemplate?.fields ?? [];
  const chunkBuilderRepeaterFields = chunkBuilderFields.filter(
    (field): field is ChunkRepeaterField => field.type === "repeater",
  );
  const chunkBuilderToolFields = chunkBuilderFields.filter((field) => field.type !== "repeater");
  const chunkBuilderHasRepeaterPanel = Boolean(
    chunkBuilderDraft &&
      chunkBuilderDraft.mode === "structured" &&
      chunkBuilderTemplate &&
      chunkBuilderData &&
      chunkBuilderRepeaterFields.length > 0,
  );
  const chunkBuilderRepeaterPanelTitle =
    chunkBuilderRepeaterFields.length === 1 ? chunkBuilderRepeaterFields[0].label : "Carousel items";
  const chunkBuilderEffectiveDensity = resolveChunkBuilderDensity(
    chunkBuilderDensity,
    chunkBuilderDensityProfile,
    viewportWidth,
  );
  const chunkBuilderPreview = chunkBuilderDraft ? renderInteractiveChunk(chunkBuilderDraft) : null;
  const chunkBuilderRawPreview =
    chunkBuilderDraft && chunkBuilderDraft.mode === "raw"
      ? renderInteractiveChunk({
          ...chunkBuilderDraft,
          mode: "raw",
          rawHtml: chunkBuilderState?.rawDraft ?? chunkBuilderDraft.rawHtml,
        })
      : null;
  const chunkBuilderRuntimeSummary =
    chunkBuilderTemplate?.engine === "javascript" && chunkBuilderData ? buildChunkRuntimeSummary(chunkBuilderData) : [];
  const chunkBuilderCoverage = chunkBuilderTemplate && chunkBuilderData
    ? computeChunkBuilderCoverage(chunkBuilderTemplate.fields, chunkBuilderData)
    : { filled: 0, total: 0, ratio: 0, missingLabels: [] as string[] };

  async function persistDocument(nextEditor: Editor) {
    const document = buildDocument(nextEditor.getJSON());
    await storage.saveDocument(document);
    setSaveLabel(`${storage.usingIndexedDb ? "Saved to IndexedDB" : "Saved locally"} at ${formatTime(document.updatedAt)}`);
    return document;
  }

  function queueSave(nextEditor: Editor) {
    setSaveLabel("Saving...");
    window.clearTimeout(saveTimerRef.current ?? undefined);
    saveTimerRef.current = window.setTimeout(() => {
      void persistDocument(nextEditor);
    }, SAVE_DELAY);
  }

  async function createRevision(nextEditor: Editor, reason: RevisionSnapshot["reason"]) {
    const document = await persistDocument(nextEditor);
    const snapshot = createSnapshot(document, reason);
    const nextSnapshots = await storage.saveSnapshot(snapshot);
    setSnapshots(nextSnapshots);
    setSelectedSnapshotId(snapshot.id);
    setSaveLabel(reason === "manual-checkpoint" ? "Checkpoint captured" : "Revision captured");
    lastSnapshotSignatureRef.current = createStructureSignature(document.content);
  }

  function buildDocument(content: JSONContent): EditorDocument {
    return {
      id: "local-default",
      title: title.trim() || "Untitled document",
      content,
      wordGoal,
      characterGoal,
      accent,
      focusMode,
      typewriterMode,
      updatedAt: new Date().toISOString(),
    };
  }

  function handleToolbar(action: () => void) {
    action();
    activeEditor.commands.focus();
  }

  function applyLink() {
    const value = normalizeUrl(linkValue);
    if (!value) {
      activeEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkEditorOpen(false);
      return;
    }

    activeEditor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    setLinkEditorOpen(false);
  }

  function updateCodeDraft(mode: CodeMode, value: string) {
    setCodeDrafts((current) => ({ ...current, [mode]: value }));
    setCodeEditing((current) => ({ ...current, [mode]: true }));
    setCodeErrors((current) => ({ ...current, [mode]: null }));
  }

  function resetCodeDraft(mode: CodeMode) {
    setCodeDrafts((current) => ({ ...current, [mode]: null }));
    setCodeErrors((current) => ({ ...current, [mode]: null }));
  }

  function applyCodeDraft(mode: CodeMode) {
    const source = codeDrafts[mode];
    const baseValue = formatHtmlForEditing(codeSources[mode], htmlCodeLayout);
    const nextValue = source ?? baseValue;

    if (source === null || source === baseValue) {
      setCodeErrors((current) => ({ ...current, [mode]: null }));
      return;
    }

    try {
      const normalized = normalizeEditableHtml(nextValue);
      const nextDocument = generateJSON(normalized, editorExtensions) as JSONContent;
      replaceEditorDocument(activeEditor, nextDocument);
      setCodeDrafts((current) => ({ ...current, [mode]: null }));
      setCodeErrors((current) => ({ ...current, [mode]: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not parse HTML.";
      setCodeErrors((current) => ({ ...current, [mode]: `Could not apply changes: ${message}` }));
    }
  }

  async function copyCodeText(mode: CodeMode) {
    const source = codeDrafts[mode] ?? formatHtmlForEditing(codeSources[mode], htmlCodeLayout);
    await navigator.clipboard.writeText(source);
  }

  function rememberFindQuery(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    setRecentFindQueries((current) => [normalized, ...current.filter((entry) => entry !== normalized)].slice(0, 6));
  }

  function jumpToMatch(direction: 1 | -1) {
    if (!matches.length) {
      return;
    }

    rememberFindQuery(findQuery);
    const nextIndex = (activeMatchIndex + direction + matches.length) % matches.length;
    setActiveMatchIndex(nextIndex);
    selectMatch(activeEditor, matches[nextIndex]);
  }

  function replaceActiveMatch() {
    const match = matches[activeMatchIndex];
    if (!match) {
      return;
    }

    rememberFindQuery(findQuery);
    const nextReplacement = transformReplacement(replaceValue, replaceTransform);
    replaceCurrentMatch(activeEditor, match, nextReplacement);
    const nextMatches = findMatches(activeEditor.state.doc, findQuery, findBehavior);
    setMatches(nextMatches);
    setActiveMatchIndex(0);
  }

  function replaceEveryMatch() {
    rememberFindQuery(findQuery);
    const nextReplacement = transformReplacement(replaceValue, replaceTransform);
    const replaced = replaceAllMatches(activeEditor, matches, nextReplacement);
    if (replaced > 0) {
      const nextMatches = findMatches(activeEditor.state.doc, findQuery, findBehavior);
      setMatches(nextMatches);
      setActiveMatchIndex(0);
    }
  }

  function restoreSnapshot(snapshot: RevisionSnapshot) {
    replaceEditorDocument(activeEditor, snapshot.content);
    void createRevision(activeEditor, "restore");
  }

  function toggleSection(item: OutlineItem) {
    setCollapsedKeys((current) =>
      current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key],
    );
  }

  function foldAllOutlineSections() {
    setCollapsedKeys(outline.map((item) => item.key));
  }

  function openAllOutlineSections() {
    setCollapsedKeys([]);
  }

  function jumpToOutlineItem(item: OutlineItem) {
    activeEditor.chain().focus(item.pos).run();
    scrollCurrentBlockIntoView(activeEditor);

    if (outlineJumpMode !== "focus-and-fold") {
      return;
    }

    setCollapsedKeys(outline.filter((candidate) => candidate.key !== item.key).map((candidate) => candidate.key));
  }

  function moveOutlineSection(from: OutlineItem, to: OutlineItem) {
    replaceEditorDocument(activeEditor, moveSection(activeEditor.getJSON() as JSONContent, from.topLevelIndex, to.topLevelIndex));
  }

  function runBlockAction(action: "up" | "down" | "duplicate" | "delete") {
    if (!blockHandle) {
      return;
    }

    const currentContent: JSONContent = activeEditor.getJSON() as JSONContent;
    let nextContent: JSONContent = currentContent;

    if (action === "up" && blockHandle.index > 0) {
      nextContent = moveTopLevelBlock(currentContent, blockHandle.index, blockHandle.index - 1);
    }

    if (action === "down") {
      nextContent = moveTopLevelBlock(currentContent, blockHandle.index, blockHandle.index + 1);
    }

    if (action === "duplicate") {
      nextContent = duplicateTopLevelBlock(currentContent, blockHandle.index);
    }

    if (action === "delete") {
      nextContent = ensureDocumentHasContent(removeTopLevelBlock(currentContent, blockHandle.index));
    }

    replaceEditorDocument(activeEditor, nextContent);
    setBlockMenuOpen(false);
  }

  function applyTextColor(color: string | null) {
    if (color) {
      activeEditor.chain().focus().setColor(color).run();
      return;
    }

    activeEditor.chain().focus().unsetColor().run();
  }

  function applyTextBackground(color: string | null) {
    if (color) {
      activeEditor.chain().focus().setHighlight({ color }).run();
      return;
    }

    activeEditor.chain().focus().unsetHighlight().run();
  }

  function applyAlignment(alignment: "left" | "center" | "right" | "justify") {
    activeEditor.chain().focus().setTextAlign(alignment).run();
  }

  function applyFontSize(size: string | null) {
    if (size) {
      activeEditor.chain().focus().setFontSize(size).run();
      return;
    }

    activeEditor.chain().focus().unsetFontSize().run();
  }

  function applyFontFamily(fontFamily: string | null) {
    if (fontFamily) {
      activeEditor.chain().focus().setFontFamily(fontFamily).run();
      return;
    }

    activeEditor.chain().focus().unsetFontFamily().run();
  }

  function applyFontWeight(fontWeight: string | null) {
    if (fontWeight) {
      activeEditor.chain().focus().setFontWeight(fontWeight).run();
      return;
    }

    activeEditor.chain().focus().unsetFontWeight().run();
  }

  function applyLineHeight(lineHeight: string | null) {
    if (lineHeight) {
      activeEditor.chain().focus().setLineHeight(lineHeight).run();
      return;
    }

    activeEditor.chain().focus().unsetLineHeight().run();
  }

  function applyLetterSpacing(letterSpacing: string | null) {
    if (letterSpacing) {
      activeEditor.chain().focus().setLetterSpacing(letterSpacing).run();
      return;
    }

    activeEditor.chain().focus().unsetLetterSpacing().run();
  }

  function stepFontSize(direction: 1 | -1) {
    const available = FONT_SIZE_OPTIONS.map((option) => option.value);
    const normalized = normalizeCssValue(currentFontSize);
    const currentIndex = available.findIndex((value) => normalizeCssValue(value) === normalized);
    const anchorIndex = currentIndex === -1 ? 2 : currentIndex;
    const nextIndex = Math.max(0, Math.min(available.length - 1, anchorIndex + direction));
    applyFontSize(available[nextIndex] ?? null);
  }

  function nudgeFontSizeWithKeyboard(targetEditor: Editor, direction: 1 | -1) {
    const source = String(targetEditor.getAttributes("textStyle").fontSize ?? "");
    const parsed = parseLengthValue(source, fontSizeNumberDraft || "16", fontSizeUnitDraft);
    const current = Number.parseFloat(parsed.numberValue);
    if (!Number.isFinite(current)) {
      return;
    }

    const next = current + direction * 0.5;
    if (next <= 0) {
      return;
    }

    targetEditor.chain().focus().setFontSize(`${formatCssNumber(next)}${parsed.unit}`).run();
  }

  function nudgeFontWeightWithKeyboard(targetEditor: Editor, direction: 1 | -1) {
    const source = String(targetEditor.getAttributes("textStyle").fontWeight ?? "");
    const current = resolveNumericFontWeight(source || fontWeightDraft);
    const snapped = Math.round(current / 100) * 100;
    const next = Math.max(100, Math.min(900, snapped + direction * 100));
    targetEditor.chain().focus().setFontWeight(String(next)).run();
  }

  function nudgeLetterSpacingWithKeyboard(targetEditor: Editor, direction: 1 | -1) {
    const source = String(targetEditor.getAttributes("textStyle").letterSpacing ?? "");
    const parsed = parseLengthValue(source, letterSpacingNumberDraft || "0", letterSpacingUnitDraft);
    const current = Number.parseFloat(parsed.numberValue);
    if (!Number.isFinite(current)) {
      return;
    }

    const next = current + direction * 0.01;
    targetEditor.chain().focus().setLetterSpacing(`${formatCssNumber(next)}${parsed.unit}`).run();
  }

  function applyDraftFontSize() {
    const parsed = parseLengthDraft(fontSizeNumberDraft, fontSizeUnitDraft, false);
    if (!parsed) {
      return;
    }

    applyFontSize(parsed);
  }

  function applyDraftLineHeight() {
    const parsed = parseLineHeightDraft(lineHeightNumberDraft, lineHeightUnitDraft);
    if (!parsed) {
      return;
    }

    applyLineHeight(parsed);
  }

  function applyDraftFontWeight() {
    const parsed = parseFontWeightDraft(fontWeightDraft);
    if (!parsed) {
      return;
    }

    applyFontWeight(parsed);
  }

  function applyDraftLetterSpacing() {
    const parsed = parseLengthDraft(letterSpacingNumberDraft, letterSpacingUnitDraft, true);
    if (!parsed) {
      return;
    }

    applyLetterSpacing(parsed);
  }

  function applyDraftFontFamily() {
    const normalized = fontFamilyDraft.trim();
    if (!normalized) {
      applyFontFamily(null);
      return;
    }

    applyFontFamily(normalized);
  }

  function applyBlockBackgroundTone(tone: "note" | "warning" | "success" | "none") {
    if (tone === "none") {
      activeEditor.chain().focus().unsetCallout().run();
      return;
    }

    if (activeEditor.isActive("callout")) {
      activeEditor.chain().focus().updateAttributes("callout", { tone, backgroundColor: null }).run();
      return;
    }

    activeEditor.chain().focus().setCallout(tone).updateAttributes("callout", { backgroundColor: null }).run();
  }

  function applyBlockBackgroundColor(color: string | null) {
    if (!activeEditor.isActive("callout")) {
      if (!color) {
        return;
      }

      activeEditor.chain().focus().setCallout("note").updateAttributes("callout", { backgroundColor: color }).run();
      return;
    }

    activeEditor.chain().focus().updateAttributes("callout", { backgroundColor: color }).run();
  }

  function insertIcon(icon: string) {
    activeEditor.chain().focus().insertContent(`${icon} `).run();
  }

  function insertCustomIcon() {
    const icon = customIconValue.trim();
    if (!icon) {
      return;
    }

    insertIcon(icon);
    setCustomIconValue("");
  }

  function updateActiveChunkAttrs(partial: Partial<InteractiveChunkAttrs>) {
    if (!activeChunkAttrs) {
      return;
    }

    const next = normalizeInteractiveChunkAttrs({ ...activeChunkAttrs, ...partial });
    const updated = activeEditor.commands.updateInteractiveChunk(next);
    if (!updated) {
      selectInteractiveChunkByAttrs(activeEditor, activeChunkAttrs);
      activeEditor.commands.updateInteractiveChunk(next);
    }
  }

  function updateActiveChunkData(update: (current: ChunkData) => ChunkData) {
    if (!activeChunkAttrs || activeChunkAttrs.mode !== "structured" || !activeChunkTemplate) {
      return;
    }

    const current = parseChunkDataJson(activeChunkAttrs.dataJson, activeChunkTemplate.defaultData);
    const next = update(current);
    updateActiveChunkAttrs({
      templateId: activeChunkTemplate.id,
      mode: "structured",
      dataJson: JSON.stringify(next),
      restriction: activeChunkTemplate.restriction,
    });
  }

  function setChunkMode(nextMode: ChunkMode) {
    if (!activeChunkAttrs) {
      return;
    }

    if (nextMode === "raw") {
      const currentHtml = activeChunkPreview?.html ?? "<section><h3>Raw HTML Block</h3><p>Add markup.</p></section>";
      setRawChunkDraft(currentHtml);
      updateActiveChunkAttrs({
        mode: "raw",
        templateId: RAW_CHUNK_TEMPLATE_ID,
        rawHtml: currentHtml,
        restriction: "strict",
      });
      return;
    }

    const nextTemplate = getChunkTemplate(chunkPickerTemplateId) ?? HTML_INTERACTIVE_CHUNK_TEMPLATES[0];
    const nextAttrs = createStructuredChunkAttrs(nextTemplate?.id ?? DEFAULT_CHUNK_TEMPLATE_ID);
    updateActiveChunkAttrs(nextAttrs);
    setRawChunkDraft(null);
  }

  function setChunkTemplate(templateId: string) {
    const nextTemplate = resolveStructuredTemplateSelection(templateId, chunkTemplateEngineFilter);
    if (!nextTemplate) {
      return;
    }
    setChunkPickerTemplateId(nextTemplate.id);

    if (!activeChunkAttrs || activeChunkAttrs.mode !== "structured") {
      setChunkTemplateEngineFilter(nextTemplate.engine);
      return;
    }

    setChunkTemplateEngineFilter(nextTemplate.engine);

    const currentData = parseChunkDataJson(activeChunkAttrs.dataJson, activeChunkTemplate?.defaultData ?? {});
    const nextData = { ...nextTemplate.defaultData, ...currentData };

    updateActiveChunkAttrs({
      templateId: nextTemplate.id,
      mode: "structured",
      dataJson: JSON.stringify(nextData),
      restriction: nextTemplate.restriction,
    });
  }

  function setChunkPickerConcept(conceptId: string) {
    const preferredTemplate = getChunkTemplate(chunkPickerTemplateId);
    const preferredEngine =
      preferredTemplate && preferredTemplate.id !== RAW_CHUNK_TEMPLATE_ID ? preferredTemplate.engine : chunkTemplateEngineFilter;
    const nextTemplateId =
      resolveChunkTemplateId(conceptId, preferredEngine, "html") ??
      resolveChunkTemplateId(conceptId, "html", "javascript");
    if (!nextTemplateId) {
      return;
    }
    setChunkTemplate(nextTemplateId);
  }

  function setChunkPickerVariant(engine: ChunkTemplateEngine) {
    if (!selectedChunkConcept) {
      return;
    }
    const nextTemplateId =
      resolveChunkTemplateId(selectedChunkConcept.id, engine, "html") ??
      resolveChunkTemplateId(selectedChunkConcept.id, "html", "javascript");
    if (!nextTemplateId) {
      return;
    }
    setChunkTemplate(nextTemplateId);
  }

  function setChunkTemplateEngine(nextEngine: ChunkTemplateEngine) {
    setChunkTemplateEngineFilter(nextEngine);
    const availableTags = getChunkCapabilityTags({ engine: nextEngine });
    if (chunkCapabilityFilter !== "all" && !availableTags.includes(chunkCapabilityFilter)) {
      setChunkCapabilityFilter("all");
    }
    if (!selectedChunkConcept) {
      return;
    }
    const nextTemplateId =
      resolveChunkTemplateId(selectedChunkConcept.id, nextEngine, "html") ??
      resolveChunkTemplateId(selectedChunkConcept.id, "html", "javascript");
    if (nextTemplateId) {
      setChunkPickerTemplateId(nextTemplateId);
    }

    if (chunkBuilderState?.draft.mode === "structured" && chunkBuilderConcept) {
      const builderNextTemplateId =
        resolveChunkTemplateId(chunkBuilderConcept.id, nextEngine, "html") ??
        resolveChunkTemplateId(chunkBuilderConcept.id, "html", "javascript");
      if (builderNextTemplateId) {
        setChunkBuilderTemplate(builderNextTemplateId);
      }
    }
  }

  function setChunkCapability(nextTag: string) {
    setChunkCapabilityFilter(nextTag);
    const filteredConcepts = getChunkTemplateConcepts({
      engine: chunkTemplateEngineFilter,
      capabilityTag: nextTag === "all" ? undefined : nextTag,
    });
    const selectedTemplate = getChunkTemplate(chunkPickerTemplateId);
    const selectedConceptId =
      selectedTemplate && selectedTemplate.id !== RAW_CHUNK_TEMPLATE_ID ? selectedTemplate.conceptId : selectedChunkConcept?.id;
    if (selectedConceptId && filteredConcepts.some((concept) => concept.id === selectedConceptId)) {
      return;
    }

    const fallbackConcept = filteredConcepts[0] ?? CHUNK_TEMPLATE_CONCEPTS[0];
    if (!fallbackConcept) {
      return;
    }
    const nextTemplateId =
      resolveChunkTemplateId(fallbackConcept.id, chunkTemplateEngineFilter, "html") ??
      resolveChunkTemplateId(fallbackConcept.id, "html", "javascript");
    if (nextTemplateId) {
      setChunkPickerTemplateId(nextTemplateId);
    }

    if (chunkBuilderState?.draft.mode === "structured" && chunkBuilderConcept) {
      if (filteredConcepts.some((concept) => concept.id === chunkBuilderConcept.id)) {
        return;
      }
      const builderFallback = filteredConcepts[0];
      if (!builderFallback) {
        return;
      }
      const builderTemplateId =
        resolveChunkTemplateId(builderFallback.id, chunkTemplateEngineFilter, "html") ??
        resolveChunkTemplateId(builderFallback.id, "html", "javascript");
      if (builderTemplateId) {
        setChunkBuilderTemplate(builderTemplateId);
      }
    }
  }

  function setChunkFieldValue(fieldKey: string, value: unknown) {
    updateActiveChunkData((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function setChunkRepeaterItemValue(itemIndex: number, fieldKey: string, value: unknown) {
    updateActiveChunkData((current) => {
      const items = normalizeRepeaterItems(current.items);
      const target = items[itemIndex] ?? {};
      items[itemIndex] = { ...target, [fieldKey]: value };
      return { ...current, items };
    });
  }

  function addChunkRepeaterItem(field: ChunkField) {
    if (field.type !== "repeater") {
      return;
    }

    updateActiveChunkData((current) => {
      const items = normalizeRepeaterItems(current.items);
      const templateId = activeChunkTemplate?.id ?? "interactive-item";
      const nextItem = buildRepeaterItemDefaults(field, items.length, templateId);
      items.push(nextItem);
      return { ...current, items };
    });
  }

  function removeChunkRepeaterItem(itemIndex: number) {
    updateActiveChunkData((current) => {
      const items = normalizeRepeaterItems(current.items).filter((_, index) => index !== itemIndex);
      return { ...current, items };
    });
  }

  function applyRawChunkDraft() {
    if (!activeChunkAttrs || activeChunkAttrs.mode !== "raw") {
      return;
    }

    const rawHtml = rawChunkDraft ?? activeChunkAttrs.rawHtml;
    const report = renderInteractiveChunk({ ...activeChunkAttrs, rawHtml, mode: "raw" }).report;
    const nextRestriction: ChunkRestriction = report?.enhancedRuntime === "required" ? "enhanced" : "strict";

    updateActiveChunkAttrs({
      mode: "raw",
      rawHtml,
      restriction: nextRestriction,
    });
  }

  function applyStyleRecipe(recipeId: StyleRecipeId) {
    const recipe = STYLE_RECIPES.find((candidate) => candidate.id === recipeId);
    if (!recipe) {
      return;
    }

    setStyleRecipeId(recipe.id);
    applyFontSize(recipe.fontSize);
    applyFontWeight(recipe.fontWeight);
    applyLineHeight(recipe.lineHeight);
    applyLetterSpacing(recipe.letterSpacing);
    applyFontFamily(recipe.fontFamily);
  }

  function applyStylePersona(personaId: StylePersonaId = stylePersonaId) {
    const persona = STYLE_PERSONA_OPTIONS.find((candidate) => candidate.id === personaId);
    if (!persona) {
      return;
    }

    setStylePersonaId(persona.id);
    applyFontSize(persona.fontSize);
    applyFontWeight(persona.fontWeight);
    applyLineHeight(persona.lineHeight);
    applyLetterSpacing(persona.letterSpacing);
    setTextColorRgba(persona.textColor);
    setHighlightRgba(persona.highlight);
    setBlockBackgroundRgba(persona.blockBackground);
    applyTextColor(toRgbaString(persona.textColor));
    applyTextBackground(toRgbaString(persona.highlight));
    applyBlockBackgroundColor(toRgbaString(persona.blockBackground));
  }

  function applyFindStrategy(nextStrategy: FindStrategyId = findStrategyId) {
    const strategy = FIND_STRATEGY_OPTIONS.find((option) => option.id === nextStrategy);
    if (!strategy) {
      return;
    }
    setFindStrategyId(strategy.id);
    setReplaceTransform(strategy.replaceTransform);
    setFindCaseSensitive(strategy.caseSensitive);
    setFindWholeWord(strategy.wholeWord);
    rememberFindQuery(findQuery);
  }

  function applyWorkspaceLayoutPreset(nextPreset: WorkspaceLayoutPreset = workspaceLayoutPreset) {
    const preset = WORKSPACE_LAYOUT_OPTIONS.find((option) => option.value === nextPreset);
    if (!preset) {
      return;
    }
    setWorkspaceLayoutPreset(preset.value);
  }

  function applyWorkspaceCoachPreset(nextPreset: WorkspaceCoachPresetId = workspaceCoachPresetId) {
    const preset = WORKSPACE_COACH_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }

    setWorkspaceCoachPresetId(preset.id);
    setGuidanceLevel(preset.guidance);
    setInterfaceDensity(preset.density);
    setWorkflowTrack(preset.workflow);
    applyWorkspaceLayoutPreset(preset.layout);
    applyModeScenePreset(preset.modeScene);
    setNavigationProfile(preset.navigation);
    if (preset.id === "ship-review") {
      setSideBySide(true);
      setViewMode("exportable");
      setRightRailOpen(true);
      return;
    }

    setViewMode("rich");
    setSideBySide(false);
  }

  function applyWorkflowTrackPreset(nextTrack: WorkflowTrack = workflowTrack) {
    setWorkflowTrack(nextTrack);
    if (nextTrack === "draft") {
      setGuidanceLevel("guided");
      setInterfaceDensity("comfort");
      setSideBySide(false);
      setViewMode("rich");
      setLeftRailOpen(true);
      setRightRailOpen(true);
      return;
    }

    if (nextTrack === "publish") {
      setGuidanceLevel("expert");
      setInterfaceDensity("compact");
      setSideBySide(true);
      setViewMode("exportable");
      setLeftRailOpen(false);
      setRightRailOpen(true);
      return;
    }

    setGuidanceLevel("balanced");
    setInterfaceDensity("balanced");
    setSideBySide(true);
    setViewMode("rich");
    setLeftRailOpen(true);
    setRightRailOpen(true);
  }

  function applyNavigationProfilePreset(nextProfile: NavigationProfile = navigationProfile) {
    setNavigationProfile(nextProfile);
    if (nextProfile === "immersive") {
      setFocusMode(true);
      setTypewriterMode(true);
      setLeftRailOpen(true);
      setRightRailOpen(false);
      setMinimapDepthFilter("h1-h2");
      setMinimapLabelMode("compact");
      setMinimapHighlightMode("active");
      return;
    }

    if (nextProfile === "survey") {
      setFocusMode(false);
      setTypewriterMode(false);
      setLeftRailOpen(true);
      setRightRailOpen(true);
      setMinimapDepthFilter("all");
      setMinimapLabelMode("full");
      setMinimapHighlightMode("level");
      return;
    }

    setFocusMode(false);
    setTypewriterMode(true);
    setLeftRailOpen(true);
    setRightRailOpen(true);
    setMinimapDepthFilter("h1-h2");
    setMinimapLabelMode("full");
    setMinimapHighlightMode("active");
  }

  function applyModeScenePreset(nextScene: ModeScenePresetId = modeScenePresetId) {
    const preset = MODE_SCENE_OPTIONS.find((option) => option.id === nextScene);
    if (!preset) {
      return;
    }
    setModeScenePresetId(preset.id);
    setFocusMode(preset.focus);
    setTypewriterMode(preset.typewriter);
    setLeftRailOpen(preset.leftRail);
    setRightRailOpen(preset.rightRail);
    if (preset.id === "deep-focus") {
      setNavigationProfile("immersive");
    }
    if (preset.id === "review-sweep") {
      setNavigationProfile("survey");
    }
  }

  function applyOutlineStrategy(nextStrategy: OutlineStrategyId = outlineStrategyId) {
    const strategy = OUTLINE_STRATEGY_OPTIONS.find((option) => option.id === nextStrategy);
    if (!strategy) {
      return;
    }

    setOutlineStrategyId(strategy.id);
    setOutlineDepthFilter(strategy.depth);
    setOutlineJumpMode(strategy.jumpMode);
    setOutlineActiveOnly(strategy.activeOnly);
    if (strategy.id === "active-draft") {
      foldAllOutlineSections();
      return;
    }
    openAllOutlineSections();
  }

  function moveMinimapSelection(step: 1 | -1) {
    if (!minimapVisibleOutline.length) {
      return;
    }
    const currentIndex = minimapVisibleOutline.findIndex((item) => item.key === activeSectionKey);
    const nextIndex =
      currentIndex < 0
        ? step > 0
          ? 0
          : minimapVisibleOutline.length - 1
        : Math.min(minimapVisibleOutline.length - 1, Math.max(0, currentIndex + step));
    const nextItem = minimapVisibleOutline[nextIndex];
    if (!nextItem) {
      return;
    }
    activeEditor.chain().focus(nextItem.pos).run();
  }

  function applyPulseLensPreset(nextLens: PulseLens = pulseLens) {
    setPulseLens(nextLens);
    if (nextLens === "flow") {
      setGuidanceLevel("guided");
      setTypewriterMode(true);
      return;
    }

    if (nextLens === "delivery") {
      setRevisionFilter("checkpoint");
      setRevisionDiffFocus("balanced");
      setRightRailOpen(true);
      setViewMode("exportable");
      return;
    }

    setLeftRailOpen(true);
    setOutlineDepthFilter("h2");
    setOutlineActiveOnly(false);
  }

  function openChunkBuilderWithTemplate(templateId: string) {
    const nextTemplate = getChunkTemplate(templateId);
    if (!nextTemplate || nextTemplate.id === RAW_CHUNK_TEMPLATE_ID) {
      return;
    }

    setChunkTemplateEngineFilter(nextTemplate.engine);
    setChunkPickerTemplateId(nextTemplate.id);
    setChunkBuilderState(createInsertChunkBuilderState(nextTemplate.id));
    setWorkspacePage("chunk-builder");
    setRightRailOpen(false);
  }

  function applyChunkIntentProfile(profileId: ChunkIntentProfileId, preferredEngine: ChunkTemplateEngine = "html") {
    const profile = CHUNK_INTENT_PROFILES.find((candidate) => candidate.id === profileId);
    if (!profile) {
      return;
    }

    const nextTemplateId = resolveChunkTemplateId(profile.templateId, preferredEngine, "html") ?? profile.templateId;
    setChunkIntentProfileId(profile.id);
    setChunkTemplateEngineFilter(preferredEngine);
    setChunkPickerTemplateId(nextTemplateId);
    setChunkBuilderLayout(profile.layout);
    setChunkBuilderDensity(profile.density);
  }

  function applyChunkBuildStrategy(nextStrategy: ChunkBuildStrategyId = chunkBuildStrategyId) {
    const strategy = CHUNK_BUILD_STRATEGY_OPTIONS.find((option) => option.id === nextStrategy);
    if (!strategy) {
      return;
    }
    const resolvedCapability = chunkCapabilityTags.includes(strategy.capabilityTag) ? strategy.capabilityTag : "all";
    setChunkBuildStrategyId(strategy.id);
    setChunkCapabilityFilter(resolvedCapability);
    applyChunkIntentProfile(strategy.intentProfileId, strategy.engine);
    setChunkBuilderLayout(strategy.layout);
    setChunkBuilderDensity(strategy.density);
  }

  function createInsertChunkBuilderState(templateId: string): ChunkBuilderState {
    const template = getChunkTemplate(templateId) ?? HTML_INTERACTIVE_CHUNK_TEMPLATES[0];
    const nextTemplateId = template?.id ?? DEFAULT_CHUNK_TEMPLATE_ID;
    return {
      target: { mode: "insert" },
      draft: createStructuredChunkAttrs(nextTemplateId),
      pickerTemplateId: nextTemplateId,
      rawDraft: null,
    };
  }

  function createUpdateChunkBuilderState(attrs: InteractiveChunkAttrs): ChunkBuilderState {
    const normalizedAttrs = normalizeInteractiveChunkAttrs(attrs);
    return {
      target: { mode: "update", anchorAttrs: normalizedAttrs },
      draft: normalizedAttrs,
      pickerTemplateId: normalizedAttrs.mode === "structured" ? normalizedAttrs.templateId : chunkPickerTemplateId,
      rawDraft: normalizedAttrs.mode === "raw" ? normalizedAttrs.rawHtml : null,
    };
  }

  function openChunkBuilder(anchorAttrs?: InteractiveChunkAttrs | null) {
    const resolvedChunk = resolveActiveInteractiveChunk(activeEditor);
    const selectedAttrs = anchorAttrs
      ? normalizeInteractiveChunkAttrs(anchorAttrs)
      : resolvedChunk
        ? normalizeInteractiveChunkAttrs(resolvedChunk.attrs)
        : null;

    if (selectedAttrs?.mode === "structured") {
      const template = getChunkTemplate(selectedAttrs.templateId);
      if (template && template.id !== RAW_CHUNK_TEMPLATE_ID) {
        setChunkTemplateEngineFilter(template.engine);
      }
    }

    setChunkBuilderState(
      selectedAttrs
        ? createUpdateChunkBuilderState(selectedAttrs)
        : createInsertChunkBuilderState(chunkPickerTemplateId),
    );
    setWorkspacePage("chunk-builder");
    setRightRailOpen(false);
  }

  function closeChunkBuilder() {
    setWorkspacePage("editor");
    setChunkBuilderState(null);
    activeEditor.commands.focus();
  }

  function updateChunkBuilderAttrs(partial: Partial<InteractiveChunkAttrs>) {
    setChunkBuilderState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        draft: normalizeInteractiveChunkAttrs({ ...current.draft, ...partial }),
      };
    });
  }

  function updateChunkBuilderData(update: (current: ChunkData) => ChunkData) {
    setChunkBuilderState((current) => {
      if (!current || current.draft.mode !== "structured") {
        return current;
      }

      const template = getChunkTemplate(current.draft.templateId);
      if (!template || template.id === RAW_CHUNK_TEMPLATE_ID) {
        return current;
      }

      const nextData = update(parseChunkDataJson(current.draft.dataJson, template.defaultData));
      return {
        ...current,
        draft: normalizeInteractiveChunkAttrs({
          ...current.draft,
          mode: "structured",
          templateId: template.id,
          dataJson: JSON.stringify(nextData),
          restriction: template.restriction,
        }),
      };
    });
  }

  function setChunkBuilderMode(nextMode: ChunkMode) {
    setChunkBuilderState((current) => {
      if (!current) {
        return current;
      }

      if (nextMode === "raw") {
        const currentHtml = renderInteractiveChunk(current.draft).html ?? "<section><h3>Raw HTML Block</h3><p>Add markup.</p></section>";
        return {
          ...current,
          draft: normalizeInteractiveChunkAttrs({
            ...current.draft,
            mode: "raw",
            templateId: RAW_CHUNK_TEMPLATE_ID,
            rawHtml: currentHtml,
            restriction: "strict",
          }),
          rawDraft: currentHtml,
        };
      }

      const nextTemplate = getChunkTemplate(current.pickerTemplateId) ?? HTML_INTERACTIVE_CHUNK_TEMPLATES[0];
      const nextTemplateId = nextTemplate?.id ?? DEFAULT_CHUNK_TEMPLATE_ID;
      return {
        ...current,
        draft: createStructuredChunkAttrs(nextTemplateId),
        pickerTemplateId: nextTemplateId,
        rawDraft: null,
      };
    });
  }

  function setChunkBuilderTemplate(templateId: string) {
    const globalTemplate = getChunkTemplate(templateId);
    if (globalTemplate && globalTemplate.id !== RAW_CHUNK_TEMPLATE_ID) {
      setChunkTemplateEngineFilter(globalTemplate.engine);
    }
    setChunkBuilderState((current) => {
      if (!current) {
        return current;
      }

      const nextTemplate = getChunkTemplate(templateId);
      if (!nextTemplate || nextTemplate.id === RAW_CHUNK_TEMPLATE_ID) {
        return {
          ...current,
          pickerTemplateId: templateId,
        };
      }

      const currentTemplate = getChunkTemplate(current.draft.templateId);
      const currentData = parseChunkDataJson(current.draft.dataJson, currentTemplate?.defaultData ?? {});
      const nextData = { ...nextTemplate.defaultData, ...currentData };

      return {
        ...current,
        pickerTemplateId: templateId,
        draft: normalizeInteractiveChunkAttrs({
          ...current.draft,
          templateId: nextTemplate.id,
          mode: "structured",
          dataJson: JSON.stringify(nextData),
          restriction: nextTemplate.restriction,
        }),
      };
    });
  }

  function setChunkBuilderConcept(conceptId: string) {
    const template = chunkBuilderTemplate;
    const preferredEngine = template && template.id !== RAW_CHUNK_TEMPLATE_ID ? template.engine : chunkTemplateEngineFilter;
    const nextTemplateId =
      resolveChunkTemplateId(conceptId, preferredEngine, "html") ??
      resolveChunkTemplateId(conceptId, "html", "javascript");
    if (!nextTemplateId) {
      return;
    }
    setChunkBuilderTemplate(nextTemplateId);
  }

  function setChunkBuilderVariant(engine: ChunkTemplateEngine) {
    if (!chunkBuilderConcept) {
      return;
    }
    const nextTemplateId =
      resolveChunkTemplateId(chunkBuilderConcept.id, engine, "html") ??
      resolveChunkTemplateId(chunkBuilderConcept.id, "html", "javascript");
    if (!nextTemplateId) {
      return;
    }
    setChunkBuilderTemplate(nextTemplateId);
  }

  function setChunkBuilderFieldValue(fieldKey: string, value: unknown) {
    updateChunkBuilderData((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function setChunkBuilderRepeaterItemValue(itemIndex: number, fieldKey: string, value: unknown) {
    updateChunkBuilderData((current) => {
      const items = normalizeRepeaterItems(current.items);
      const target = items[itemIndex] ?? {};
      items[itemIndex] = { ...target, [fieldKey]: value };
      return { ...current, items };
    });
  }

  function addChunkBuilderRepeaterItem(field: ChunkField) {
    if (field.type !== "repeater") {
      return;
    }

    updateChunkBuilderData((current) => {
      const items = normalizeRepeaterItems(current.items);
      const templateId = chunkBuilderTemplate?.id ?? "interactive-item";
      const nextItem = buildRepeaterItemDefaults(field, items.length, templateId);
      items.push(nextItem);
      return { ...current, items };
    });
  }

  function removeChunkBuilderRepeaterItem(itemIndex: number) {
    updateChunkBuilderData((current) => {
      const items = normalizeRepeaterItems(current.items).filter((_, index) => index !== itemIndex);
      return { ...current, items };
    });
  }

  function applyChunkBuilderRawDraft() {
    setChunkBuilderState((current) => {
      if (!current || current.draft.mode !== "raw") {
        return current;
      }

      const rawHtml = current.rawDraft ?? current.draft.rawHtml;
      const report = renderInteractiveChunk({ ...current.draft, rawHtml, mode: "raw" }).report;
      const nextRestriction: ChunkRestriction = report?.enhancedRuntime === "required" ? "enhanced" : "strict";

      return {
        ...current,
        draft: normalizeInteractiveChunkAttrs({
          ...current.draft,
          mode: "raw",
          rawHtml,
          restriction: nextRestriction,
        }),
      };
    });
  }

  function applyChunkBuilderToEditor() {
    if (!chunkBuilderState) {
      return;
    }

    const rawHtml =
      chunkBuilderState.draft.mode === "raw"
        ? chunkBuilderState.rawDraft ?? chunkBuilderState.draft.rawHtml
        : chunkBuilderState.draft.rawHtml;
    const nextAttrs = normalizeInteractiveChunkAttrs({
      ...chunkBuilderState.draft,
      rawHtml,
    });

    if (chunkBuilderState.target.mode === "update") {
      selectInteractiveChunkByAttrs(activeEditor, chunkBuilderState.target.anchorAttrs);
      activeEditor.commands.updateInteractiveChunk(nextAttrs);
    } else {
      activeEditor.commands.insertInteractiveChunk(nextAttrs);
      selectInsertedInteractiveChunk(activeEditor);
    }

    if (nextAttrs.mode === "structured") {
      const template = getChunkTemplate(nextAttrs.templateId);
      if (template && template.id !== RAW_CHUNK_TEMPLATE_ID) {
        setChunkTemplateEngineFilter(template.engine);
      }
      setChunkPickerTemplateId(nextAttrs.templateId);
    }
    setRawChunkDraft(nextAttrs.mode === "raw" ? nextAttrs.rawHtml : null);
    setChunkBuilderState(null);
    setWorkspacePage("editor");
    setRightRailOpen(true);
    activeEditor.commands.focus();
  }

  function isPanelCollapsed(sectionId: string) {
    return panelCollapsePrefs[sectionId] === true;
  }

  function togglePanel(sectionId: string) {
    setPanelCollapsePrefs((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  return (
    <div
      className={`app-shell accent-${accent} density-${interfaceDensity} workflow-${workflowTrack} nav-${navigationProfile} workspace-layout-${workspaceLayoutPreset} ${focusMode ? "focus-mode" : ""}`}
    >
      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>
      <div className="ambient ambient-three"></div>

      <header className="topbar">
        <div className="title-stack">
          <span className="eyebrow">Velvet Ink</span>
          <input
            className="doc-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled document"
          />
          <div className="meta-row">
            <span className="meta-pill">
              <span className="meta-dot"></span>
              {storage.usingIndexedDb ? "IndexedDB" : "Local fallback"}
            </span>
            <span className="meta-pill">{saveLabel}</span>
            <span className="meta-pill">{selectionLabel}</span>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="theme-selector" htmlFor="theme-selector">
            <span>Theme</span>
            <select
              id="theme-selector"
              value={themePreference}
              aria-label="Theme"
              title={themePreference === "system" ? `System (${resolvedTheme})` : `Using ${resolvedTheme} mode`}
              onChange={(event) => onThemePreferenceChange(event.target.value as ThemePreference)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <label className="theme-selector guidance-selector" htmlFor="guidance-selector">
            <span>Guidance</span>
            <select
              id="guidance-selector"
              value={guidanceLevel}
              aria-label="Guidance level"
              title={selectedGuidanceOption.copy}
              onChange={(event) => setGuidanceLevel(event.target.value as GuidanceLevel)}
            >
              {GUIDANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-selector density-selector" htmlFor="density-selector">
            <span>Density</span>
            <select
              id="density-selector"
              value={interfaceDensity}
              aria-label="Interface density"
              title={selectedDensityOption.copy}
              onChange={(event) => setInterfaceDensity(event.target.value as InterfaceDensity)}
            >
              {DENSITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-selector workflow-selector" htmlFor="workflow-selector">
            <span>Workflow</span>
            <select
              id="workflow-selector"
              value={workflowTrack}
              aria-label="Workflow track"
              title={selectedWorkflowTrack.copy}
              onChange={(event) => setWorkflowTrack(event.target.value as WorkflowTrack)}
            >
              {WORKFLOW_TRACK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-selector navigation-selector" htmlFor="navigation-selector">
            <span>Navigation</span>
            <select
              id="navigation-selector"
              value={navigationProfile}
              aria-label="Navigation profile"
              title={selectedNavigationProfile.copy}
              onChange={(event) => setNavigationProfile(event.target.value as NavigationProfile)}
            >
              {NAVIGATION_PROFILE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-selector layout-selector" htmlFor="workspace-layout-selector">
            <span>Layout</span>
            <select
              id="workspace-layout-selector"
              value={workspaceLayoutPreset}
              aria-label="Workspace layout"
              title={selectedWorkspaceLayout.copy}
              onChange={(event) => applyWorkspaceLayoutPreset(event.target.value as WorkspaceLayoutPreset)}
            >
              {WORKSPACE_LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-selector coach-selector" htmlFor="workspace-coach-selector">
            <span>Coach scene</span>
            <select
              id="workspace-coach-selector"
              value={workspaceCoachPresetId}
              aria-label="Workspace coach scene"
              title={selectedWorkspaceCoach.summary}
              onChange={(event) => setWorkspaceCoachPresetId(event.target.value as WorkspaceCoachPresetId)}
            >
              {WORKSPACE_COACH_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-action" type="button" title={selectedWorkspaceCoach.tip} onClick={() => applyWorkspaceCoachPreset()}>
            Apply coach scene
          </button>
          <button
            className={`ghost-action ${focusMode ? "active" : ""}`}
            type="button"
            aria-pressed={focusMode}
            onClick={() => setFocusMode((current) => !current)}
          >
            {focusMode ? "Exit focus" : "Focus"}
          </button>
          <button
            className="ghost-action"
            type="button"
            aria-pressed={leftRailOpen}
            onClick={() => setLeftRailOpen((current) => !current)}
          >
            Structure
          </button>
          <button
            className="ghost-action"
            type="button"
            onClick={() => {
              setCommandPaletteOpen(true);
              setCommandQuery("");
            }}
          >
            Command
          </button>
          <button className="ghost-action" type="button" onClick={() => setFindPanelOpen(true)}>
            Find
          </button>
          <button
            className={`ghost-action ${workspacePage === "chunk-builder" ? "active" : ""}`}
            type="button"
            onClick={() => {
              if (workspacePage === "chunk-builder") {
                closeChunkBuilder();
                return;
              }
              openChunkBuilder();
            }}
          >
            {workspacePage === "chunk-builder" ? "Back to editor" : "Chunk builder"}
          </button>
          <div className="view-mode-group" role="group" aria-label="View mode">
            {VIEW_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`ghost-action view-mode-toggle ${viewMode === option.value ? "active" : ""}`}
                type="button"
                aria-pressed={viewMode === option.value}
                onClick={() => setViewMode(option.value)}
              >
                {option.label}
              </button>
            ))}
            <button
              className={`ghost-action view-mode-toggle ${sideBySide ? "active" : ""}`}
              type="button"
              aria-pressed={sideBySide}
              onClick={() => setSideBySide((current) => !current)}
            >
              Side by side
            </button>
          </div>
          {showCodeView ? (
            <button
              className="ghost-action"
              type="button"
              aria-pressed={htmlCodeLayout === "oneline"}
              onClick={() =>
                setHtmlCodeLayout((current) => (current === "paragraphs" ? "oneline" : "paragraphs"))
              }
            >
              HTML layout: {htmlCodeLayout === "paragraphs" ? "Paragraph breaks" : "One line"}
            </button>
          ) : null}
          <button
            className="ghost-action"
            type="button"
            aria-pressed={rightRailOpen}
            onClick={() => setRightRailOpen((current) => !current)}
          >
            Revisions
          </button>
          <button className="primary-action" type="button" onClick={() => exportHtml(activeEditor, title, accent)}>
            Export HTML
          </button>
        </div>
      </header>

      {workspacePage === "chunk-builder" && chunkBuilderState && chunkBuilderDraft ? (
        <main className="chunk-builder-stage">
          <section
            className={`editor-card chunk-builder-shell chunk-builder-shell-${chunkBuilderLayout} chunk-builder-shell-density-${chunkBuilderEffectiveDensity} chunk-builder-shell-density-mode-${chunkBuilderDensity}`}
          >
            <div className="chunk-builder-head">
              <div className="chunk-builder-title">
                <h2>Chunk Builder</h2>
                <p className="small-copy">
                  {chunkBuilderState.target.mode === "update"
                    ? "Editing the selected chunk. Apply to pass changes back to the main editor."
                    : "Build a new chunk and apply it back into the main editor when ready."}
                </p>
              </div>
              <div className="chunk-builder-actions">
                <div className="chunk-builder-controls">
                  <div className="chunk-builder-intent-toggle" role="group" aria-label="Chunk intent profile">
                    {CHUNK_INTENT_PROFILES.map((profile) => (
                      <button
                        key={profile.id}
                        className={`ghost-action view-mode-toggle ${chunkIntentProfileId === profile.id ? "active" : ""}`}
                        type="button"
                        aria-pressed={chunkIntentProfileId === profile.id}
                        title={profile.summary}
                        onClick={() => applyChunkIntentProfile(profile.id)}
                      >
                        {profile.label}
                      </button>
                    ))}
                  </div>
                  <div className="chunk-builder-layout-toggle" role="group" aria-label="Chunk builder layout">
                    {CHUNK_BUILDER_LAYOUT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`ghost-action view-mode-toggle ${chunkBuilderLayout === option.value ? "active" : ""}`}
                        type="button"
                        aria-pressed={chunkBuilderLayout === option.value}
                        onClick={() => setChunkBuilderLayout(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="chunk-builder-density-toggle" role="group" aria-label="Chunk builder density">
                    {CHUNK_BUILDER_DENSITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`ghost-action view-mode-toggle ${chunkBuilderDensity === option.value ? "active" : ""}`}
                        type="button"
                        aria-pressed={chunkBuilderDensity === option.value}
                        onClick={() => setChunkBuilderDensity(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="chunk-build-strategy-head">
                    <label className="chunk-control">
                      <span>Build strategy</span>
                      <select
                        value={chunkBuildStrategyId}
                        title={selectedChunkBuildStrategy.summary}
                        onChange={(event) => setChunkBuildStrategyId(event.target.value as ChunkBuildStrategyId)}
                      >
                        {CHUNK_BUILD_STRATEGY_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="chip" type="button" onClick={() => applyChunkBuildStrategy()}>
                      Apply strategy
                    </button>
                    <p className="small-copy chunk-build-strategy-tip">
                      {selectedChunkBuildStrategy.summary} Tip: {selectedChunkBuildStrategy.tip}
                    </p>
                  </div>
                </div>
                {chunkBuilderDensity === "adaptive" ? (
                  <div className="chunk-builder-density-profile" aria-label="Adaptive density profile">
                    <label className="chunk-control">
                      <span>Compact</span>
                      <select
                        value={chunkBuilderDensityProfile.compact}
                        onChange={(event) =>
                          setChunkBuilderDensityProfile((current) => ({
                            ...current,
                            compact: event.target.value as ChunkBuilderDensityLevel,
                          }))
                        }
                      >
                        {CHUNK_BUILDER_DENSITY_LEVEL_OPTIONS.map((option) => (
                          <option key={`compact-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="chunk-control">
                      <span>Medium</span>
                      <select
                        value={chunkBuilderDensityProfile.medium}
                        onChange={(event) =>
                          setChunkBuilderDensityProfile((current) => ({
                            ...current,
                            medium: event.target.value as ChunkBuilderDensityLevel,
                          }))
                        }
                      >
                        {CHUNK_BUILDER_DENSITY_LEVEL_OPTIONS.map((option) => (
                          <option key={`medium-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="chunk-control">
                      <span>Large</span>
                      <select
                        value={chunkBuilderDensityProfile.large}
                        onChange={(event) =>
                          setChunkBuilderDensityProfile((current) => ({
                            ...current,
                            large: event.target.value as ChunkBuilderDensityLevel,
                          }))
                        }
                      >
                        {CHUNK_BUILDER_DENSITY_LEVEL_OPTIONS.map((option) => (
                          <option key={`large-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="small-copy">
                      Active now: <strong>{capitalizeSentence(chunkBuilderEffectiveDensity)}</strong> ({Math.round(viewportWidth)}
                      px viewport)
                    </p>
                  </div>
                ) : null}
                <button className="ghost-action" type="button" onClick={closeChunkBuilder}>
                  Back to editor
                </button>
                <button className="primary-action" type="button" onClick={applyChunkBuilderToEditor}>
                  {chunkBuilderState.target.mode === "update" ? "Update selected chunk" : "Insert chunk in editor"}
                </button>
              </div>
            </div>

            <div
              className={`chunk-builder-grid chunk-builder-grid-${chunkBuilderLayout} ${chunkBuilderHasRepeaterPanel ? "chunk-builder-grid-has-repeater" : "chunk-builder-grid-no-repeater"}`}
            >
              {chunkBuilderHasRepeaterPanel ? (
                <section className="chunk-builder-panel chunk-builder-repeater-panel">
                  <div className="chunk-editor-header">
                    <strong>{chunkBuilderRepeaterPanelTitle}</strong>
                  </div>
                  {chunkBuilderRepeaterFields.length > 1 ? (
                    <p className="small-copy">{chunkBuilderRepeaterFields.length} repeatable groups in this template.</p>
                  ) : null}
                  <div className={`chunk-field-stack chunk-field-stack-${chunkBuilderLayout}`}>
                    {chunkBuilderRepeaterFields.map((field) => (
                      <ChunkFieldEditor
                        key={field.key}
                        field={field}
                        value={(chunkBuilderData as Record<string, unknown>)[field.key]}
                        onChange={(value) => setChunkBuilderFieldValue(field.key, value)}
                        onRepeaterItemChange={setChunkBuilderRepeaterItemValue}
                        onRepeaterItemAdd={() => addChunkBuilderRepeaterItem(field)}
                        onRepeaterItemRemove={removeChunkBuilderRepeaterItem}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="chunk-builder-panel chunk-builder-tools-panel">
                <div className="chunk-editor">
                  <div className="chunk-editor-header">
                    <strong>{chunkBuilderPreview?.templateLabel ?? "Interactive chunk"}</strong>
                    {chunkBuilderTemplate ? (
                      <span className={`chunk-badge engine-${chunkBuilderTemplate.engine}`}>
                        {chunkBuilderTemplate.engine === "javascript" ? "JavaScript" : "Pure HTML"}
                      </span>
                    ) : null}
                    <span className={`chunk-badge ${chunkBuilderDraft.restriction}`}>
                      {chunkBuilderPreview
                        ? getInteractiveChunkCompatibilityBadgeText(chunkBuilderPreview.compatibility)
                        : "No compatibility data"}
                    </span>
                  </div>
                  {chunkBuilderTemplate ? <p className="small-copy">{chunkBuilderTemplate.description}</p> : null}
                  {chunkBuilderTemplate ? (
                    <div className="chunk-template-guidance">
                      <p className="small-copy">
                        <strong>When to use:</strong> {chunkBuilderTemplate.didactic.whenToUse}
                      </p>
                      <p className="small-copy">
                        <strong>{chunkBuilderTemplate.engine === "javascript" ? "Why JavaScript:" : "Why HTML:"}</strong>{" "}
                        {chunkBuilderTemplate.engine === "javascript"
                          ? chunkBuilderTemplate.didactic.whyJavaScript
                          : chunkBuilderTemplate.didactic.whyHtml}
                      </p>
                      <p className="small-copy">
                        <strong>Constraints:</strong> {chunkBuilderTemplate.didactic.constraints}
                      </p>
                      {chunkBuilderTemplate.engine === "javascript" && chunkBuilderRuntimeSummary.length > 0 ? (
                        <div className="chunk-runtime-summary">
                          <p className="small-copy">
                            <strong>JavaScript capability profile:</strong>
                          </p>
                          <ul>
                            {chunkBuilderRuntimeSummary.map((line) => (
                              <li key={`runtime-${line}`} className="small-copy">
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="chunk-builder-top-controls">
                    <label className="chunk-control">
                      <span>Mode</span>
                      <select value={chunkBuilderDraft.mode} onChange={(event) => setChunkBuilderMode(event.target.value as ChunkMode)}>
                        <option value="structured">Structured template</option>
                        <option value="raw">Raw HTML</option>
                      </select>
                    </label>

                    {chunkBuilderDraft.mode === "structured" && chunkBuilderTemplate ? (
                      <>
                        <label className="chunk-control">
                          <span>Chunk type</span>
                          <select
                            value={chunkTemplateEngineFilter}
                            onChange={(event) => {
                              const nextEngine = event.target.value as ChunkTemplateEngine;
                              setChunkTemplateEngine(nextEngine);
                              if (chunkBuilderConcept) {
                                const nextTemplateId =
                                  resolveChunkTemplateId(chunkBuilderConcept.id, nextEngine, "html") ??
                                  resolveChunkTemplateId(chunkBuilderConcept.id, "html", "javascript");
                                if (nextTemplateId) {
                                  setChunkBuilderTemplate(nextTemplateId);
                                }
                              }
                            }}
                          >
                            {CHUNK_ENGINE_FILTER_OPTIONS.map((option) => (
                              <option key={`builder-engine-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="chunk-control">
                          <span>Capability tag</span>
                          <select
                            value={chunkCapabilityFilter}
                            onChange={(event) => setChunkCapability(event.target.value)}
                          >
                            <option value="all">All capabilities</option>
                            {chunkCapabilityTags.map((tag) => (
                              <option key={`builder-capability-${tag}`} value={tag}>
                                {formatCapabilityTag(tag)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="chunk-control">
                          <span>Concept</span>
                          <select value={chunkBuilderConcept?.id ?? ""} onChange={(event) => setChunkBuilderConcept(event.target.value)}>
                            {INTERACTIVE_CHUNK_CATEGORIES.map((category) => (
                              <optgroup key={`builder-${category}`} label={category}>
                                {filteredChunkConcepts
                                  .filter((concept) => concept.category === category)
                                  .map((concept) => (
                                    <option key={`builder-concept-${concept.id}`} value={concept.id}>
                                      {formatChunkConceptLabel(concept)}
                                    </option>
                                  ))}
                              </optgroup>
                            ))}
                          </select>
                        </label>

                        {chunkBuilderConcept?.templateIds.html && chunkBuilderConcept?.templateIds.javascript ? (
                          <label className="chunk-control">
                            <span>Variant</span>
                            <select
                              value={chunkBuilderTemplate.engine}
                              onChange={(event) => setChunkBuilderVariant(event.target.value as ChunkTemplateEngine)}
                            >
                              <option value="html">Pure HTML</option>
                              <option value="javascript">JavaScript</option>
                            </select>
                          </label>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  {chunkBuilderDraft.mode === "structured" ? (
                    <div className="chunk-capability-strip">
                      <span className="small-copy">Capability focus</span>
                      <div className="chunk-capability-chips" role="group" aria-label="Chunk capability focus">
                        <button
                          className={`chip ${chunkCapabilityFilter === "all" ? "active" : ""}`}
                          type="button"
                          aria-pressed={chunkCapabilityFilter === "all"}
                          onClick={() => setChunkCapability("all")}
                        >
                          All
                        </button>
                        {chunkCapabilityTags.slice(0, 6).map((tag) => (
                          <button
                            key={`cap-chip-${tag}`}
                            className={`chip ${chunkCapabilityFilter === tag ? "active" : ""}`}
                            type="button"
                            aria-pressed={chunkCapabilityFilter === tag}
                            onClick={() => setChunkCapability(tag)}
                          >
                            {formatCapabilityTag(tag)}
                          </button>
                        ))}
                      </div>
                      <p className="small-copy">
                        Coverage: {chunkBuilderCoverage.filled}/{chunkBuilderCoverage.total} core fields set ({chunkBuilderCoverage.ratio}
                        %).{" "}
                        {chunkBuilderCoverage.missingLabels.length
                          ? `Next: ${chunkBuilderCoverage.missingLabels.slice(0, 2).join(", ")}.`
                          : "All key fields look ready."}
                      </p>
                    </div>
                  ) : null}

                  {chunkBuilderDraft.mode === "structured" && chunkBuilderTemplate && chunkBuilderData ? (
                    <>
                      {chunkBuilderToolFields.length ? (
                        <div className={`chunk-field-stack chunk-field-stack-${chunkBuilderLayout}`}>
                          {chunkBuilderToolFields.map((field) => (
                            <ChunkFieldEditor
                              key={field.key}
                              field={field}
                              value={(chunkBuilderData as Record<string, unknown>)[field.key]}
                              onChange={(value) => setChunkBuilderFieldValue(field.key, value)}
                              onRepeaterItemChange={setChunkBuilderRepeaterItemValue}
                              onRepeaterItemAdd={() => addChunkBuilderRepeaterItem(field)}
                              onRepeaterItemRemove={removeChunkBuilderRepeaterItem}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="small-copy">This template only exposes repeatable item controls.</p>
                      )}
                    </>
                  ) : null}

                  {chunkBuilderDraft.mode === "raw" ? (
                    <div className="chunk-raw-editor">
                      <label className="chunk-control chunk-control-wide">
                        <span>Raw HTML</span>
                        <textarea
                          rows={12}
                          value={chunkBuilderState.rawDraft ?? chunkBuilderDraft.rawHtml}
                          onChange={(event) =>
                            setChunkBuilderState((current) =>
                              current
                                ? {
                                    ...current,
                                    rawDraft: event.target.value,
                                  }
                                : current,
                            )
                          }
                        />
                      </label>
                      <button type="button" onClick={applyChunkBuilderRawDraft}>
                        Validate raw HTML
                      </button>

                      <div className="chunk-report">
                        <p className="small-copy">
                          {chunkBuilderRawPreview
                            ? getInteractiveChunkCompatibilityBadgeText(chunkBuilderRawPreview.compatibility)
                            : "No validation report"}
                        </p>
                        {chunkBuilderRawPreview?.report?.issues.length ? (
                          <ul>
                            {chunkBuilderRawPreview.report.issues.slice(0, 8).map((issue, index) => (
                              <li key={`${issue.code}-${index}`} className={issue.level}>
                                {issue.message}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="small-copy">No issues detected.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="chunk-builder-panel chunk-builder-preview-panel">
                <div className="chunk-editor-header">
                  <strong>Rendered preview</strong>
                  {chunkBuilderTemplate ? (
                    <span className={`chunk-badge engine-${chunkBuilderTemplate.engine}`}>
                      {chunkBuilderTemplate.engine === "javascript" ? "JavaScript" : "Pure HTML"}
                    </span>
                  ) : null}
                  <span className={`chunk-badge ${chunkBuilderDraft.restriction}`}>
                    {chunkBuilderPreview
                      ? getInteractiveChunkCompatibilityBadgeText(chunkBuilderPreview.compatibility)
                      : "No compatibility data"}
                  </span>
                </div>
                <p className="small-copy">
                  {chunkBuilderDraft.mode === "raw"
                    ? "Raw HTML previews after strict allowlist validation."
                    : "Structured preview updates as you edit fields."}
                </p>
                <div
                  className="chunk-builder-preview"
                  ref={chunkBuilderPreviewRef}
                  dangerouslySetInnerHTML={{
                    __html: chunkBuilderPreview?.html ?? "<p>No preview available.</p>",
                  }}
                ></div>
              </section>
            </div>
          </section>
        </main>
      ) : (
        <main className={workspaceClassName}>
        <aside className={`rail left-rail ${leftRailOpen ? "is-open" : ""}`}>
          <PanelSection
            sectionId="left-mode"
            title="Mode"
            copy="Calm on first glance, but deep once you start shaping the draft."
            collapsed={isPanelCollapsed("left-mode")}
            onToggle={() => togglePanel("left-mode")}
          >
            <div className="mode-scene-stack">
              <div className="mode-scene-head">
                <span className="style-label">Mode scenes</span>
                <span className="small-copy">Structured presets for focus and rail visibility.</span>
              </div>
              <label className="mode-scene-select">
                <span>Preset</span>
                <select
                  value={modeScenePresetId}
                  onChange={(event) => setModeScenePresetId(event.target.value as ModeScenePresetId)}
                >
                  {MODE_SCENE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mode-scene-grid">
                {MODE_SCENE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`mode-scene-card ${modeScenePresetId === option.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setModeScenePresetId(option.id)}
                    aria-pressed={modeScenePresetId === option.id}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                  </button>
                ))}
              </div>
              <div className="compact-grid">
                <button className="chip" type="button" onClick={() => applyModeScenePreset(modeScenePresetId)}>
                  Apply mode scene
                </button>
                <button className="chip" type="button" onClick={() => applyNavigationProfilePreset()}>
                  Align to navigation profile
                </button>
              </div>
              <p className="small-copy mode-scene-tip">
                Tip: {selectedModeScenePreset.tip}
                {guidanceLevel === "expert" ? " Expert mode keeps this panel lean; advanced toggles stay available below." : ""}
              </p>
            </div>
            <div className="toggle-grid">
              <button
                className={`chip ${focusMode ? "active" : ""}`}
                type="button"
                aria-pressed={focusMode}
                onClick={() => setFocusMode((current) => !current)}
              >
                Focus mode
              </button>
              <button
                className={`chip ${typewriterMode ? "active" : ""}`}
                type="button"
                aria-pressed={typewriterMode}
                onClick={() => setTypewriterMode((current) => !current)}
              >
                Typewriter
              </button>
              <button className="chip" type="button" onClick={() => void createRevision(activeEditor, "manual-checkpoint")}>
                Checkpoint
              </button>
              <button className="chip" type="button" onClick={() => setShortcutOpen(true)}>
                Shortcuts
              </button>
            </div>
          </PanelSection>

          <PanelSection
            sectionId="left-style-lab"
            title="Style Lab"
            copy="Complete controls for type, spacing, color, alignment, icons, and block backgrounds."
            collapsed={isPanelCollapsed("left-style-lab")}
            onToggle={() => togglePanel("left-style-lab")}
          >
            <div className="style-stack">
              <div className="style-group style-recipe-group">
                <div className="style-recipe-head">
                  <span className="style-label">Style recipes</span>
                  <span className="small-copy">Structured presets with full manual override below.</span>
                </div>
                <div className="style-recipe-grid">
                  {STYLE_RECIPES.map((recipe) => (
                    <button
                      key={recipe.id}
                      className={`style-recipe-card ${styleRecipeId === recipe.id ? "active" : ""}`}
                      type="button"
                      onClick={() => setStyleRecipeId(recipe.id)}
                      aria-pressed={styleRecipeId === recipe.id}
                    >
                      <strong>{recipe.label}</strong>
                      <span>{recipe.intent}</span>
                      <small>{recipe.summary}</small>
                    </button>
                  ))}
                </div>
                <div className="compact-grid">
                  <button className="chip" type="button" onClick={() => applyStyleRecipe(styleRecipeId)}>
                    Apply recipe to selection
                  </button>
                  <button className="chip" type="button" onClick={() => applyStyleRecipe("editorial")}>
                    Reset to Editorial
                  </button>
                </div>
                <p className="small-copy style-learning-tip">
                  Tip: {selectedStyleRecipe.summary}
                  {guidanceLevel === "expert"
                    ? " Expert mode keeps previews concise and assumes fine-grained adjustments."
                    : " Guided and Balanced modes pair recipes with the detailed controls below."}
                </p>
              </div>

              <div className="style-group">
                <div className="style-recipe-head">
                  <span className="style-label">Persona coach</span>
                  <span className="small-copy">Structured bundles for tone, rhythm, and color contrast.</span>
                </div>
                <div className="style-persona-grid">
                  {STYLE_PERSONA_OPTIONS.map((persona) => (
                    <button
                      key={persona.id}
                      className={`style-persona-card ${stylePersonaId === persona.id ? "active" : ""}`}
                      type="button"
                      onClick={() => setStylePersonaId(persona.id)}
                      aria-pressed={stylePersonaId === persona.id}
                    >
                      <strong>{persona.label}</strong>
                      <span>{persona.summary}</span>
                      <div className="style-persona-swatches" aria-hidden="true">
                        <span style={{ background: toRgbaString(persona.textColor) }}></span>
                        <span style={{ background: toRgbaString(persona.highlight) }}></span>
                        <span style={{ background: toRgbaString(persona.blockBackground) }}></span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="compact-grid">
                  <button className="chip" type="button" onClick={() => applyStylePersona(stylePersonaId)}>
                    Apply persona to selection
                  </button>
                </div>
                <p className="small-copy style-learning-tip">
                  Tip: {selectedStylePersona.tip}
                  {guidanceLevel === "expert" ? " Expert mode keeps the swatch cues minimal." : ""}
                </p>
              </div>

              <div className="style-group">
                <span className="style-label">Typography</span>
                <div className="style-control-grid">
                  <label className="style-control">
                    <span>Font size</span>
                    <select
                      value={fontSizeSelectValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue === CUSTOM_SELECT_VALUE) {
                          return;
                        }
                        applyFontSize(nextValue || null);
                      }}
                    >
                      <option value="">Document default</option>
                      {FONT_SIZE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {fontSizeSelectValue === CUSTOM_SELECT_VALUE ? (
                        <option value={CUSTOM_SELECT_VALUE} disabled>
                          Custom ({currentFontSize})
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="style-control">
                    <span>Font weight</span>
                    <select
                      value={fontWeightSelectValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue === CUSTOM_SELECT_VALUE) {
                          return;
                        }

                        applyFontWeight(nextValue || null);
                      }}
                    >
                      <option value="">Document default</option>
                      {FONT_WEIGHT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {fontWeightSelectValue === CUSTOM_SELECT_VALUE ? (
                        <option value={CUSTOM_SELECT_VALUE} disabled>
                          Custom ({currentFontWeight})
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="style-control">
                    <span>Line height preset</span>
                    <select
                      value={lineHeightSelectValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue === CUSTOM_SELECT_VALUE) {
                          return;
                        }

                        applyLineHeight(nextValue || null);
                      }}
                    >
                      <option value="">Document default</option>
                      {LINE_HEIGHT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {lineHeightSelectValue === CUSTOM_SELECT_VALUE ? (
                        <option value={CUSTOM_SELECT_VALUE} disabled>
                          Custom ({currentLineHeight})
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="style-control">
                    <span>Tracking preset</span>
                    <select
                      value={letterSpacingSelectValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue === CUSTOM_SELECT_VALUE) {
                          return;
                        }

                        applyLetterSpacing(nextValue || null);
                      }}
                    >
                      <option value="">Document default</option>
                      {LETTER_SPACING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {letterSpacingSelectValue === CUSTOM_SELECT_VALUE ? (
                        <option value={CUSTOM_SELECT_VALUE} disabled>
                          Custom ({currentLetterSpacing})
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="style-control">
                    <span>Font family preset</span>
                    <select
                      value={fontFamilySelectValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue === CUSTOM_SELECT_VALUE) {
                          return;
                        }

                        applyFontFamily(nextValue || null);
                      }}
                    >
                      <option value="">Document default</option>
                      {FONT_FAMILY_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {fontFamilySelectValue === CUSTOM_SELECT_VALUE ? (
                        <option value={CUSTOM_SELECT_VALUE} disabled>
                          Custom family
                        </option>
                      ) : null}
                    </select>
                  </label>
                </div>
                <div className="style-dimension-grid">
                  <label className="style-control">
                    <span>Text size value</span>
                    <input
                      type="number"
                      step="0.1"
                      value={fontSizeNumberDraft}
                      onChange={(event) => setFontSizeNumberDraft(event.target.value)}
                    />
                  </label>
                  <label className="style-control">
                    <span>Text size unit</span>
                    <select
                      value={fontSizeUnitDraft}
                      onChange={(event) => setFontSizeUnitDraft(event.target.value as LengthUnit)}
                    >
                      {LENGTH_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="chip" type="button" onClick={applyDraftFontSize} disabled={!parsedFontSizeDraft}>
                    Apply size
                  </button>

                  <label className="style-control">
                    <span>Line height value</span>
                    <input
                      type="number"
                      step="0.05"
                      value={lineHeightNumberDraft}
                      onChange={(event) => setLineHeightNumberDraft(event.target.value)}
                    />
                  </label>
                  <label className="style-control">
                    <span>Line height unit</span>
                    <select
                      value={lineHeightUnitDraft}
                      onChange={(event) => setLineHeightUnitDraft(event.target.value as LineHeightUnit)}
                    >
                      {LINE_HEIGHT_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit === "unitless" ? "unitless" : unit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="chip" type="button" onClick={applyDraftLineHeight} disabled={!parsedLineHeightDraft}>
                    Apply line
                  </button>

                  <label className="style-control">
                    <span>Font weight value</span>
                    <input
                      type="text"
                      value={fontWeightDraft}
                      placeholder="400 or bolder"
                      onChange={(event) => setFontWeightDraft(event.target.value)}
                    />
                  </label>
                  <button className="chip" type="button" onClick={applyDraftFontWeight} disabled={!parsedFontWeightDraft}>
                    Apply weight
                  </button>

                  <label className="style-control">
                    <span>Tracking value</span>
                    <input
                      type="number"
                      step="0.01"
                      value={letterSpacingNumberDraft}
                      onChange={(event) => setLetterSpacingNumberDraft(event.target.value)}
                    />
                  </label>
                  <label className="style-control">
                    <span>Tracking unit</span>
                    <select
                      value={letterSpacingUnitDraft}
                      onChange={(event) => setLetterSpacingUnitDraft(event.target.value as LengthUnit)}
                    >
                      {LENGTH_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="chip"
                    type="button"
                    onClick={applyDraftLetterSpacing}
                    disabled={!parsedLetterSpacingDraft}
                  >
                    Apply track
                  </button>
                </div>
                <label className="style-control">
                  <span>Custom font family stack</span>
                  <input
                    type="text"
                    value={fontFamilyDraft}
                    placeholder='e.g. "IBM Plex Serif", serif'
                    onChange={(event) => setFontFamilyDraft(event.target.value)}
                  />
                </label>
                <div className="compact-grid">
                  <button className="chip" type="button" onClick={() => stepFontSize(-1)}>
                    A-
                  </button>
                  <button className="chip" type="button" onClick={() => stepFontSize(1)}>
                    A+
                  </button>
                  <button className="chip" type="button" onClick={applyDraftFontFamily}>
                    Apply family
                  </button>
                  <button
                    className="chip"
                    type="button"
                    onClick={() => {
                      applyFontSize(null);
                      applyFontFamily(null);
                      applyFontWeight(null);
                      applyLineHeight(null);
                      applyLetterSpacing(null);
                    }}
                  >
                    Reset type
                  </button>
                </div>
              </div>

              <div className="style-group">
                <span className="style-label">Text color</span>
                <RgbaEditor
                  label="Selected text"
                  value={textColorRgba}
                  onChange={setTextColorRgba}
                  onApply={() => applyTextColor(toRgbaString(textColorRgba))}
                  onReset={() => applyTextColor(null)}
                />
              </div>

              <div className="style-group">
                <span className="style-label">Text highlight</span>
                <RgbaEditor
                  label="Selected text"
                  value={highlightRgba}
                  onChange={setHighlightRgba}
                  onApply={() => applyTextBackground(toRgbaString(highlightRgba))}
                  onReset={() => applyTextBackground(null)}
                />
              </div>

              <div className="style-group">
                <span className="style-label">Block background</span>
                <RgbaEditor
                  label="Current block"
                  value={blockBackgroundRgba}
                  onChange={setBlockBackgroundRgba}
                  onApply={() => applyBlockBackgroundColor(toRgbaString(blockBackgroundRgba))}
                  onReset={() => applyBlockBackgroundColor(null)}
                />
              </div>

              <div className="style-group">
                <span className="style-label">Block presets</span>
                <div className="compact-grid">
                  {BLOCK_BACKGROUNDS.map((tone) => (
                    <button
                      key={tone.value}
                      className={`chip ${currentCalloutTone === tone.value ? "active" : ""}`}
                      type="button"
                      onClick={() => applyBlockBackgroundTone(tone.value)}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="style-group">
                <span className="style-label">Alignment</span>
                <div className="compact-grid">
                  {ALIGNMENTS.map((alignment) => (
                    <button
                      key={alignment.value}
                      className={`chip ${currentAlignment === alignment.value ? "active" : ""}`}
                      type="button"
                      onClick={() => applyAlignment(alignment.value)}
                    >
                      {alignment.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="style-group">
                <span className="style-label">Icons</span>
                <div className="icon-grid">
                  {ICON_INSERTIONS.map((icon) => (
                    <button key={icon.label} className="icon-button" type="button" onClick={() => insertIcon(icon.value)}>
                      <span>{icon.value}</span>
                      {icon.label}
                    </button>
                  ))}
                </div>
                <div className="icon-custom-row">
                  <input
                    type="text"
                    value={customIconValue}
                    onChange={(event) => setCustomIconValue(event.target.value)}
                    placeholder="Custom symbol or emoji"
                  />
                  <button className="chip" type="button" onClick={insertCustomIcon} disabled={!customIconValue.trim()}>
                    Insert custom
                  </button>
                </div>
              </div>
            </div>
          </PanelSection>

          <PanelSection
            sectionId="left-outline"
            title="Outline"
            copy="Drag sections, jump to structure, and fold what you are not touching."
            collapsed={isPanelCollapsed("left-outline")}
            onToggle={() => togglePanel("left-outline")}
          >
            <div className="outline-strategy-group">
              <label className="style-control">
                <span>Outline strategy</span>
                <select
                  value={outlineStrategyId}
                  title={selectedOutlineStrategy.summary}
                  onChange={(event) => setOutlineStrategyId(event.target.value as OutlineStrategyId)}
                >
                  {OUTLINE_STRATEGY_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="compact-grid">
                {OUTLINE_STRATEGY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`chip ${outlineStrategyId === option.id ? "active" : ""}`}
                    type="button"
                    aria-pressed={outlineStrategyId === option.id}
                    onClick={() => setOutlineStrategyId(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
                <button className="chip" type="button" onClick={() => applyOutlineStrategy()}>
                  Apply strategy
                </button>
              </div>
              <p className="small-copy">{selectedOutlineStrategy.summary}</p>
            </div>
            <div className="outline-controls">
              <label className="style-control">
                <span>Depth</span>
                <select
                  value={outlineDepthFilter}
                  onChange={(event) => setOutlineDepthFilter(event.target.value as OutlineDepthFilter)}
                >
                  {OUTLINE_DEPTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="style-control">
                <span>Jump mode</span>
                <select
                  value={outlineJumpMode}
                  onChange={(event) => setOutlineJumpMode(event.target.value as OutlineJumpMode)}
                >
                  {OUTLINE_JUMP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="compact-grid">
                <button
                  className={`chip ${outlineActiveOnly ? "active" : ""}`}
                  type="button"
                  aria-pressed={outlineActiveOnly}
                  onClick={() => setOutlineActiveOnly((current) => !current)}
                >
                  Active section only
                </button>
                <button className="chip" type="button" onClick={foldAllOutlineSections}>
                  Fold all
                </button>
                <button className="chip" type="button" onClick={openAllOutlineSections}>
                  Open all
                </button>
              </div>
              <p className="small-copy">
                {outlineJumpMode === "focus-and-fold"
                  ? "Jump mode folds non-selected sections to reduce visual noise."
                  : "Jump mode keeps surrounding sections open for context."}
              </p>
              <div className="outline-coach-card">
                <strong>Structure coach</strong>
                <p className="small-copy">
                  Visible {visibleOutline.length}/{outline.length} sections ({outlineCoverageRatio}% coverage). H1 {outlineLevelCounts.h1}
                  , H2 {outlineLevelCounts.h2}, H3 {outlineLevelCounts.h3}
                  {outlineLevelCounts.deeper ? `, H4+ ${outlineLevelCounts.deeper}` : ""}. Depth jumps: {outlineDepthDriftCount}.
                </p>
                <p className="small-copy">
                  Tip: {outlineCoachTip}
                  {guidanceLevel === "expert" ? " Expert mode keeps this diagnostic compact." : ""}
                </p>
              </div>
            </div>
            <div className="outline-list">
              {visibleOutline.map((item) => (
                <div
                  key={item.key}
                  className={`outline-item ${activeSectionKey === item.key ? "active" : ""}`}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", item.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const source = outline.find((candidate) => candidate.key === event.dataTransfer.getData("text/plain"));
                    if (source) {
                      moveOutlineSection(source, item);
                    }
                  }}
                >
                  <button
                    className="outline-main"
                    type="button"
                    onClick={() => jumpToOutlineItem(item)}
                  >
                    <span className="outline-level">H{item.level}</span>
                    <span className="outline-text">{item.text}</span>
                  </button>
                  <button className="outline-toggle" type="button" onClick={() => toggleSection(item)}>
                    {collapsedKeys.includes(item.key) ? "Open" : "Fold"}
                  </button>
                </div>
              ))}
            </div>
          </PanelSection>

          <PanelSection
            sectionId="left-minimap"
            title="Minimap"
            copy="A compressed skyline of the document, tuned for fast navigation."
            collapsed={isPanelCollapsed("left-minimap")}
            onToggle={() => togglePanel("left-minimap")}
          >
            <div className="minimap-controls">
              <label className="minimap-control">
                <span>Depth</span>
                <select
                  value={minimapDepthFilter}
                  title={selectedMinimapDepthOption.label}
                  onChange={(event) => setMinimapDepthFilter(event.target.value as MinimapDepthFilter)}
                >
                  {MINIMAP_DEPTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="minimap-control">
                <span>Labels</span>
                <select
                  value={minimapLabelMode}
                  title={selectedMinimapLabelOption.label}
                  onChange={(event) => setMinimapLabelMode(event.target.value as MinimapLabelMode)}
                >
                  {MINIMAP_LABEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="minimap-control">
                <span>Highlight</span>
                <select
                  value={minimapHighlightMode}
                  title={selectedMinimapHighlightOption.label}
                  onChange={(event) => setMinimapHighlightMode(event.target.value as MinimapHighlightMode)}
                >
                  {MINIMAP_HIGHLIGHT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="compact-grid minimap-actions">
              <button className="chip" type="button" onClick={() => moveMinimapSelection(-1)}>
                Previous section
              </button>
              <button className="chip" type="button" onClick={() => moveMinimapSelection(1)}>
                Next section
              </button>
              <button className="chip" type="button" onClick={() => applyNavigationProfilePreset()}>
                Apply navigation profile
              </button>
            </div>
            <p className="small-copy minimap-tip">
              {selectedNavigationProfile.copy} Depth: {selectedMinimapDepthOption.label}.{" "}
              {minimapVisibleOutline.length} sections shown.
            </p>
            <div className="minimap">
              {minimapVisibleOutline.map((item) => (
                <button
                  key={item.key}
                  className={`minimap-segment minimap-level-${item.level} minimap-label-${minimapLabelMode} minimap-highlight-${minimapHighlightMode} ${activeSectionKey === item.key ? "active" : ""}`}
                  style={{ height: `${Math.max(28, 74 - item.level * 10)}px` }}
                  type="button"
                  onClick={() => activeEditor.chain().focus(item.pos).run()}
                  aria-label={`Jump to ${item.text}`}
                  title={item.text}
                >
                  <span>{formatMinimapLabel(item.text, minimapLabelMode)}</span>
                </button>
              ))}
            </div>
            {minimapActiveIndex >= 0 ? (
              <p className="small-copy minimap-active-note">
                Active section {minimapActiveIndex + 1} of {minimapVisibleOutline.length}.
              </p>
            ) : null}
          </PanelSection>
        </aside>

        <section className="editor-stage">
          <div className="editor-card">
            {focusMode ? (
              <div className="focus-mode-banner">
                <span>Focus mode is active. Press Esc or use this button to restore all panels.</span>
                <button className="ghost-action" type="button" onClick={() => setFocusMode(false)}>
                  Exit focus mode
                </button>
              </div>
            ) : null}
            <div className="toolbar">
              <ToolbarSelect
                label="Chunk type"
                value={chunkTemplateEngineFilter}
                onChange={(nextValue) => setChunkTemplateEngine(nextValue as ChunkTemplateEngine)}
              >
                {CHUNK_ENGINE_FILTER_OPTIONS.map((option) => (
                  <option key={`toolbar-engine-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </ToolbarSelect>
              <ToolbarSelect
                label="Capability"
                value={chunkCapabilityFilter}
                onChange={(nextValue) => setChunkCapability(nextValue)}
              >
                <option value="all">All capabilities</option>
                {chunkCapabilityTags.map((tag) => (
                  <option key={`toolbar-capability-${tag}`} value={tag}>
                    {formatCapabilityTag(tag)}
                  </option>
                ))}
              </ToolbarSelect>
              <ToolbarSelect
                label="Chunk"
                value={selectedChunkConcept?.id ?? ""}
                onChange={(nextValue) => setChunkPickerConcept(nextValue)}
              >
                {INTERACTIVE_CHUNK_CATEGORIES.map((category) => (
                  <optgroup key={`toolbar-${category}`} label={category}>
                    {filteredChunkConcepts.filter((concept) => concept.category === category).map((concept) => (
                      <option key={`toolbar-concept-${concept.id}`} value={concept.id}>
                        {formatChunkConceptLabel(concept)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </ToolbarSelect>
              {selectedChunkConcept?.templateIds.html && selectedChunkConcept.templateIds.javascript ? (
                <ToolbarSelect
                  label="Variant"
                  value={selectedChunkTemplate?.engine ?? "html"}
                  onChange={(nextValue) => setChunkPickerVariant(nextValue as ChunkTemplateEngine)}
                >
                  <option value="html">Pure HTML</option>
                  <option value="javascript">JavaScript</option>
                </ToolbarSelect>
              ) : null}
              <ToolbarButton
                label="Add chunk"
                active={false}
                onClick={() => insertStructuredChunk(chunkPickerTemplateId)}
              />
              <ToolbarButton
                label="Raw HTML [Advanced]"
                active={false}
                onClick={() => insertRawChunk()}
                disabled={chunkTemplateEngineFilter === "javascript"}
              />
              <ToolbarButton label="Undo" active={false} onClick={() => handleToolbar(() => activeEditor.chain().focus().undo().run())} />
              <ToolbarButton label="Redo" active={false} onClick={() => handleToolbar(() => activeEditor.chain().focus().redo().run())} />
              <ToolbarSelect
                label="Size"
                value={fontSizeSelectValue}
                onChange={(nextValue) => {
                  if (nextValue === CUSTOM_SELECT_VALUE) {
                    return;
                  }

                  applyFontSize(nextValue || null);
                }}
              >
                <option value="">Size</option>
                {FONT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {fontSizeSelectValue === CUSTOM_SELECT_VALUE ? (
                  <option value={CUSTOM_SELECT_VALUE} disabled>
                    Custom
                  </option>
                ) : null}
              </ToolbarSelect>
              <ToolbarInput label="Size value">
                <input
                  type="number"
                  step="0.1"
                  value={fontSizeNumberDraft}
                  onChange={(event) => setFontSizeNumberDraft(event.target.value)}
                  onBlur={applyDraftFontSize}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyDraftFontSize();
                    }
                  }}
                />
              </ToolbarInput>
              <ToolbarInput label="Size unit">
                <select
                  value={fontSizeUnitDraft}
                  onChange={(event) => {
                    const nextUnit = event.target.value as LengthUnit;
                    setFontSizeUnitDraft(nextUnit);
                    const parsed = parseLengthDraft(fontSizeNumberDraft, nextUnit, false);
                    if (parsed) {
                      applyFontSize(parsed);
                    }
                  }}
                >
                  {LENGTH_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </ToolbarInput>
              <ToolbarSelect
                label="Font"
                value={fontFamilySelectValue}
                onChange={(nextValue) => {
                  if (nextValue === CUSTOM_SELECT_VALUE) {
                    return;
                  }

                  applyFontFamily(nextValue || null);
                }}
              >
                <option value="">Font</option>
                {FONT_FAMILY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {fontFamilySelectValue === CUSTOM_SELECT_VALUE ? (
                  <option value={CUSTOM_SELECT_VALUE} disabled>
                    Custom
                  </option>
                ) : null}
              </ToolbarSelect>
              <ToolbarInput label="Font stack">
                <input
                  type="text"
                  value={fontFamilyDraft}
                  placeholder="Custom family"
                  onChange={(event) => setFontFamilyDraft(event.target.value)}
                  onBlur={applyDraftFontFamily}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyDraftFontFamily();
                    }
                  }}
                />
              </ToolbarInput>
              <ToolbarSelect
                label="Weight"
                value={fontWeightSelectValue}
                onChange={(nextValue) => {
                  if (nextValue === CUSTOM_SELECT_VALUE) {
                    return;
                  }

                  applyFontWeight(nextValue || null);
                }}
              >
                <option value="">Weight</option>
                {FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {fontWeightSelectValue === CUSTOM_SELECT_VALUE ? (
                  <option value={CUSTOM_SELECT_VALUE} disabled>
                    Custom
                  </option>
                ) : null}
              </ToolbarSelect>
              <ToolbarInput label="Weight value">
                <input
                  type="text"
                  value={fontWeightDraft}
                  onChange={(event) => setFontWeightDraft(event.target.value)}
                  onBlur={applyDraftFontWeight}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyDraftFontWeight();
                    }
                  }}
                />
              </ToolbarInput>
              <ToolbarSelect
                label="Line"
                value={lineHeightSelectValue}
                onChange={(nextValue) => {
                  if (nextValue === CUSTOM_SELECT_VALUE) {
                    return;
                  }

                  applyLineHeight(nextValue || null);
                }}
              >
                <option value="">Line</option>
                {LINE_HEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {lineHeightSelectValue === CUSTOM_SELECT_VALUE ? (
                  <option value={CUSTOM_SELECT_VALUE} disabled>
                    Custom
                  </option>
                ) : null}
              </ToolbarSelect>
              <ToolbarInput label="Line value">
                <input
                  type="number"
                  step="0.05"
                  value={lineHeightNumberDraft}
                  onChange={(event) => setLineHeightNumberDraft(event.target.value)}
                  onBlur={applyDraftLineHeight}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyDraftLineHeight();
                    }
                  }}
                />
              </ToolbarInput>
              <ToolbarInput label="Line unit">
                <select
                  value={lineHeightUnitDraft}
                  onChange={(event) => {
                    const nextUnit = event.target.value as LineHeightUnit;
                    setLineHeightUnitDraft(nextUnit);
                    const parsed = parseLineHeightDraft(lineHeightNumberDraft, nextUnit);
                    if (parsed) {
                      applyLineHeight(parsed);
                    }
                  }}
                >
                  {LINE_HEIGHT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit === "unitless" ? "unitless" : unit}
                    </option>
                  ))}
                </select>
              </ToolbarInput>
              <ToolbarSelect
                label="Track"
                value={letterSpacingSelectValue}
                onChange={(nextValue) => {
                  if (nextValue === CUSTOM_SELECT_VALUE) {
                    return;
                  }

                  applyLetterSpacing(nextValue || null);
                }}
              >
                <option value="">Track</option>
                {LETTER_SPACING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {letterSpacingSelectValue === CUSTOM_SELECT_VALUE ? (
                  <option value={CUSTOM_SELECT_VALUE} disabled>
                    Custom
                  </option>
                ) : null}
              </ToolbarSelect>
              <ToolbarInput label="Track value">
                <input
                  type="number"
                  step="0.01"
                  value={letterSpacingNumberDraft}
                  onChange={(event) => setLetterSpacingNumberDraft(event.target.value)}
                  onBlur={applyDraftLetterSpacing}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyDraftLetterSpacing();
                    }
                  }}
                />
              </ToolbarInput>
              <ToolbarInput label="Track unit">
                <select
                  value={letterSpacingUnitDraft}
                  onChange={(event) => {
                    const nextUnit = event.target.value as LengthUnit;
                    setLetterSpacingUnitDraft(nextUnit);
                    const parsed = parseLengthDraft(letterSpacingNumberDraft, nextUnit, true);
                    if (parsed) {
                      applyLetterSpacing(parsed);
                    }
                  }}
                >
                  {LENGTH_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </ToolbarInput>
              <ToolbarButton label="B" active={activeEditor.isActive("bold")} onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleBold().run())} />
              <ToolbarButton label="I" active={activeEditor.isActive("italic")} onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleItalic().run())} />
              <ToolbarButton
                label="U"
                active={activeEditor.isActive("underline")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleUnderline().run())}
              />
              <ToolbarButton
                label="S"
                active={activeEditor.isActive("strike")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleStrike().run())}
              />
              <ToolbarButton
                label="Code"
                active={activeEditor.isActive("code")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleCode().run())}
              />
              <ToolbarButton
                label="Mark"
                active={activeEditor.isActive("highlight")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleHighlight().run())}
              />
              <ToolbarButton label="L" active={currentAlignment === "left"} onClick={() => applyAlignment("left")} />
              <ToolbarButton label="C" active={currentAlignment === "center"} onClick={() => applyAlignment("center")} />
              <ToolbarButton label="R" active={currentAlignment === "right"} onClick={() => applyAlignment("right")} />
              <ToolbarButton label="J" active={currentAlignment === "justify"} onClick={() => applyAlignment("justify")} />
              <ToolbarButton
                label="H1"
                active={activeEditor.isActive("heading", { level: 1 })}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleHeading({ level: 1 }).run())}
              />
              <ToolbarButton
                label="H2"
                active={activeEditor.isActive("heading", { level: 2 })}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleHeading({ level: 2 }).run())}
              />
              <ToolbarButton
                label="H3"
                active={activeEditor.isActive("heading", { level: 3 })}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleHeading({ level: 3 }).run())}
              />
              <ToolbarButton
                label="Bullets"
                active={activeEditor.isActive("bulletList")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleBulletList().run())}
              />
              <ToolbarButton
                label="Numbered"
                active={activeEditor.isActive("orderedList")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleOrderedList().run())}
              />
              <ToolbarButton
                label="Task"
                active={activeEditor.isActive("taskList")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleTaskList().run())}
              />
              <ToolbarButton
                label="Quote"
                active={activeEditor.isActive("blockquote")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleBlockquote().run())}
              />
              <ToolbarButton
                label="Callout"
                active={activeEditor.isActive("callout")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().setCallout("note").run())}
              />
              <ToolbarButton
                label="Sup"
                active={activeEditor.isActive("superscript")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().toggleSuperscript().run())}
              />
              <ToolbarButton label="Link" active={activeEditor.isActive("link")} onClick={() => setLinkEditorOpen(true)} />
              <ToolbarButton
                label="Rule"
                active={false}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().setHorizontalRule().run())}
              />
              <ToolbarButton
                label="Table"
                active={activeEditor.isActive("table")}
                onClick={() => handleToolbar(() => activeEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
              />
              <ToolbarButton
                label="Clear"
                active={false}
                onClick={() =>
                  handleToolbar(() =>
                    activeEditor
                      .chain()
                      .focus()
                      .unsetAllMarks()
                      .clearNodes()
                      .unsetTextAlign()
                      .unsetLineHeight()
                      .unsetFontSize()
                      .unsetFontFamily()
                      .unsetFontWeight()
                      .unsetLetterSpacing()
                      .run(),
                  )
                }
              />
            </div>

            <div className={`editor-hud editor-hud-${guidanceLevel}`}>
              <span className="hud-pill">{selectedGuidanceOption.label} guidance</span>
              <span className="hud-pill">{selectedWorkflowTrack.label} track</span>
              <span className="hud-pill">{selectedNavigationProfile.label} navigation</span>
              <span>{selectedGuidanceOption.copy}</span>
              <span>{selectedWorkflowTrack.copy}</span>
              <span>{selectedNavigationProfile.copy}</span>
              <span>Density: {selectedDensityOption.label}</span>
              <span>Press <kbd>/</kbd> on an empty line for block commands.</span>
              <span>Cmd/Ctrl+K opens the command deck (or use the Command button).</span>
              {guidanceLevel !== "expert" ? (
                <span>
                  Alt+↑/↓ size, Alt+Shift+↑/↓ weight, Alt+./, tracking.
                </span>
              ) : null}
              <span>
                Goals: {wordGoal.toLocaleString()} words, {characterGoal.toLocaleString()} chars
              </span>
              <button className="chip hud-action" type="button" onClick={() => applyWorkflowTrackPreset()}>
                Apply track preset
              </button>
              <button className="chip" type="button" onClick={() => applyNavigationProfilePreset()}>
                Apply navigation preset
              </button>
            </div>

            <div className={`editor-canvas ${sideBySide ? "editor-canvas-split" : ""}`}>
              {showRichView ? (
                <div className="editor-pane editor-pane-rich">
                  <EditorContent editor={activeEditor} className="editor-surface" />
                  {blockHandle ? (
                    <div className="block-handle" style={{ top: `${blockHandle.top}px` }}>
                      <button className="block-handle-button" type="button" onClick={() => setBlockMenuOpen((current) => !current)}>
                        +
                      </button>
                      {blockMenuOpen ? (
                        <div className="block-menu">
                          <button type="button" onClick={() => runBlockAction("up")}>
                            Move up
                          </button>
                          <button type="button" onClick={() => runBlockAction("down")}>
                            Move down
                          </button>
                          <button type="button" onClick={() => runBlockAction("duplicate")}>
                            Duplicate
                          </button>
                          <button type="button" onClick={() => runBlockAction("delete")}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showCodeView ? (
                <div className="editor-pane editor-pane-code">
                  <HtmlCodeView
                    value={codeViewValue}
                    label={codeViewLabel}
                    layout={htmlCodeLayout}
                    editing={codeEditing[activeCodeMode]}
                    dirty={codeIsDirty}
                    error={codeErrors[activeCodeMode]}
                    onChange={(nextValue) => updateCodeDraft(activeCodeMode, nextValue)}
                    onCopy={() => void copyCodeText(activeCodeMode)}
                    onApply={() => applyCodeDraft(activeCodeMode)}
                    onReset={() => resetCodeDraft(activeCodeMode)}
                    onStartEdit={() => setCodeEditing((current) => ({ ...current, [activeCodeMode]: true }))}
                    onStopEdit={() => setCodeEditing((current) => ({ ...current, [activeCodeMode]: false }))}
                  />
                </div>
              ) : null}
            </div>

            <div className="editor-footer">
              <div className="goal-meter-stack">
                <div className="goal-meter">
                  <div className="meter-head">
                    <span>Word goal</span>
                    <span>
                      {stats.words.toLocaleString()}/{wordGoal.toLocaleString()}
                    </span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${Math.max(wordGoalProgress, stats.words > 0 ? 8 : 0)}%` }}></span>
                  </div>
                  <input
                    className="goal-slider"
                    type="range"
                    min={WORD_GOAL_MIN}
                    max={WORD_GOAL_MAX}
                    step={WORD_GOAL_STEP}
                    value={wordGoal}
                    onChange={(event) => setWordGoal(Number(event.target.value))}
                  />
                </div>
                <div className="goal-meter">
                  <div className="meter-head">
                    <span>Character goal</span>
                    <span>
                      {stats.charactersWithSpaces.toLocaleString()}/{characterGoal.toLocaleString()}
                    </span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${Math.max(characterGoalProgress, stats.charactersWithSpaces > 0 ? 8 : 0)}%` }}></span>
                  </div>
                  <span className="goal-meta">{stats.charactersWithoutSpaces.toLocaleString()} chars without spaces</span>
                  <input
                    className="goal-slider"
                    type="range"
                    min={CHARACTER_GOAL_MIN}
                    max={CHARACTER_GOAL_MAX}
                    step={CHARACTER_GOAL_STEP}
                    value={characterGoal}
                    onChange={(event) => setCharacterGoal(Number(event.target.value))}
                  />
                </div>
              </div>
              <label className="theme-selector accent-selector" htmlFor="accent-selector">
                <span>Accent</span>
                <select
                  id="accent-selector"
                  value={accent}
                  aria-label="Accent theme"
                  onChange={(event) => setAccent(event.target.value as AccentName)}
                >
                  {ACCENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        <aside className={`rail right-rail ${rightRailOpen ? "is-open" : ""}`}>
          <PanelSection
            sectionId="right-document-pulse"
            title="Document Pulse"
            copy="Live structural signals that move with the draft."
            collapsed={isPanelCollapsed("right-document-pulse")}
            onToggle={() => togglePanel("right-document-pulse")}
          >
            <div className="pulse-controls">
              <label className="style-control">
                <span>Lens</span>
                <select value={pulseLens} onChange={(event) => setPulseLens(event.target.value as PulseLens)}>
                  {PULSE_LENS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="style-control">
                <span>Cadence target</span>
                <select
                  value={pulseCadenceTarget}
                  onChange={(event) => setPulseCadenceTarget(event.target.value as PulseCadenceTarget)}
                >
                  {PULSE_TARGET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="small-copy pulse-lens-copy">{selectedPulseLens.copy}</p>
            <div className="metric-grid">
              <MetricCard label="Words" value={stats.words.toLocaleString()} />
              <MetricCard label="Read time" value={`${stats.readMinutes} min`} />
              <MetricCard label="Paragraphs" value={String(stats.paragraphs)} />
              <MetricCard label="Headings" value={String(stats.headings)} />
            </div>
            <div className="pulse-health-grid">
              <article className={`pulse-health-card ${pulseCadenceInTarget ? "good" : "warn"}`}>
                <div className="meter-head">
                  <span>Flow target</span>
                  <span>{pulseCadenceInTarget ? "In range" : "Adjusting"}</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${stats.cadenceRatio}%` }}></span>
                </div>
                <p className="small-copy">
                  Target {selectedPulseTarget.label.toLowerCase()}: {selectedPulseTarget.ratioMin}-{selectedPulseTarget.ratioMax}%.
                </p>
              </article>
              <article className="pulse-health-card">
                <div className="meter-head">
                  <span>{selectedPulseLens.label} score</span>
                  <span>{pulseLensScore}%</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${pulseLensScore}%` }}></span>
                </div>
                <p className="small-copy">{pulseTip}</p>
              </article>
            </div>
            <div className="meter-stack">
              <div className="meter-head">
                <span>Sentence cadence</span>
                <span>{stats.cadenceLabel}</span>
              </div>
              <div className="meter">
                <span style={{ width: `${stats.cadenceRatio}%` }}></span>
              </div>
              <p className="small-copy">
                Structure density: {pulseStructureHeadingDensity} headings / 1k words, {pulseStructureParagraphDensity} paragraphs / 1k words.
              </p>
              <div className="compact-grid">
                <button className="chip" type="button" onClick={() => applyPulseLensPreset()}>
                  Apply lens preset
                </button>
              </div>
            </div>
          </PanelSection>

          <PanelSection
            sectionId="right-find-replace"
            title="Find + Replace"
            copy="Search through the document without leaving the keyboard."
            collapsed={isPanelCollapsed("right-find-replace")}
            onToggle={() => togglePanel("right-find-replace")}
          >
            <div className="find-panel-inline">
              <div className="find-structured-controls">
                <label className="style-control">
                  <span>Find strategy</span>
                  <select value={findStrategyId} onChange={(event) => setFindStrategyId(event.target.value as FindStrategyId)}>
                    {FIND_STRATEGY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="style-control">
                  <span>Replace style</span>
                  <select
                    value={replaceTransform}
                    onChange={(event) => setReplaceTransform(event.target.value as ReplaceTransform)}
                  >
                    {REPLACE_TRANSFORM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="compact-grid">
                  <button
                    className={`chip ${findCaseSensitive ? "active" : ""}`}
                    type="button"
                    aria-pressed={findCaseSensitive}
                    onClick={() => setFindCaseSensitive((current) => !current)}
                  >
                    Case sensitive
                  </button>
                  <button
                    className={`chip ${findWholeWord ? "active" : ""}`}
                    type="button"
                    aria-pressed={findWholeWord}
                    onClick={() => setFindWholeWord((current) => !current)}
                  >
                    Whole word
                  </button>
                  <button className="chip" type="button" onClick={() => applyFindStrategy(findStrategyId)}>
                    Apply strategy
                  </button>
                </div>
              </div>
              <input value={findQuery} onChange={(event) => setFindQuery(event.target.value)} placeholder="Find text" />
              <input value={replaceValue} onChange={(event) => setReplaceValue(event.target.value)} placeholder="Replace with" />
              {recentFindQueries.length ? (
                <div className="find-history">
                  <span className="small-copy">Recent</span>
                  <div className="compact-grid">
                    {recentFindQueries.map((entry) => (
                      <button
                        key={entry}
                        className={`chip ${findQuery.trim() === entry ? "active" : ""}`}
                        type="button"
                        onClick={() => setFindQuery(entry)}
                      >
                        {entry}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="find-actions">
                <button type="button" onClick={() => jumpToMatch(1)}>
                  Next
                </button>
                <button type="button" onClick={() => jumpToMatch(-1)}>
                  Prev
                </button>
                <button type="button" onClick={replaceActiveMatch}>
                  Replace
                </button>
                <button type="button" onClick={replaceEveryMatch}>
                  Replace all
                </button>
              </div>
              <p className="small-copy">
                {selectionCount} matches. Replace mode:{" "}
                {REPLACE_TRANSFORM_OPTIONS.find((option) => option.value === replaceTransform)?.label ?? "As typed"}.
              </p>
              <article className="find-coach-card">
                <div className="meter-head">
                  <span>{selectedFindStrategy.label} strategy</span>
                  <span>{findMatchDensity} / 1k words</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${Math.min(100, Math.round(findMatchDensity * 6))}%` }}></span>
                </div>
                <p className="small-copy">{selectedFindStrategy.summary}</p>
                <p className="small-copy">{findDensityTip}</p>
              </article>
            </div>
          </PanelSection>

          <PanelSection
            sectionId="right-interaction-block"
            title="Chunk Builder"
            copy="Open a dedicated chunk-builder page and pass changes back to this editor."
            collapsed={isPanelCollapsed("right-interaction-block")}
            onToggle={() => togglePanel("right-interaction-block")}
          >
            <div className="chunk-empty">
              <div className="chunk-intent-head">
                <span className="style-label">Chunk intent</span>
                <span className="small-copy">Pick a workflow profile, then launch with a tuned template.</span>
              </div>
              <div className="chunk-intent-grid">
                {CHUNK_INTENT_PROFILES.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    className={`chunk-intent-card ${chunkIntentProfileId === profile.id ? "active" : ""}`}
                    aria-pressed={chunkIntentProfileId === profile.id}
                    onClick={() => applyChunkIntentProfile(profile.id)}
                  >
                    <strong>{profile.label}</strong>
                    <span>{profile.summary}</span>
                  </button>
                ))}
              </div>
              <p className="small-copy chunk-intent-tip">
                Recommended template:{" "}
                <strong>{selectedChunkIntentTemplate?.label ?? selectedChunkIntentProfile.templateId}</strong>{" "}
                <span className="chunk-inline-badge">Pure HTML</span>. {selectedChunkIntentProfile.tip}
              </p>
              {activeChunkAttrs ? (
                <>
                  <p>
                    Selected chunk: <strong>{activeChunkPreview?.templateLabel ?? "Interactive chunk"}</strong>
                  </p>
                  {activeChunkTemplate ? (
                    <p className="small-copy">
                      Engine: <span className="chunk-inline-badge">{activeChunkTemplate.engine === "javascript" ? "JavaScript" : "Pure HTML"}</span>
                      {activeChunkConcept ? ` • Concept: ${activeChunkConcept.label}` : ""}
                    </p>
                  ) : null}
                  <p className="small-copy">
                    {activeChunkPreview
                      ? getInteractiveChunkCompatibilityBadgeText(activeChunkPreview.compatibility)
                      : "No compatibility data"}
                  </p>
                </>
              ) : (
                <p>Select an interactive chunk to edit it, or open the builder to create a new one.</p>
              )}
              <div className="chunk-empty-actions">
                <button type="button" onClick={() => openChunkBuilder(activeChunkAttrs)}>
                  {activeChunkAttrs ? "Edit selected chunk" : "Create new chunk"}
                </button>
                <button type="button" onClick={() => openChunkBuilderWithTemplate(selectedChunkIntentProfile.templateId)}>
                  Start with recommended template
                </button>
              </div>
            </div>
          </PanelSection>

          <PanelSection
            sectionId="right-revisions"
            title="Revisions"
            copy="Autosnapshots, manual checkpoints, and diffable restore points."
            collapsed={isPanelCollapsed("right-revisions")}
            onToggle={() => togglePanel("right-revisions")}
          >
            <div className="revision-structured-controls">
              <label className="style-control">
                <span>Snapshot filter</span>
                <select value={revisionFilter} onChange={(event) => setRevisionFilter(event.target.value as RevisionFilter)}>
                  {REVISION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="style-control">
                <span>Diff focus</span>
                <select value={revisionDiffFocus} onChange={(event) => setRevisionDiffFocus(event.target.value as RevisionDiffFocus)}>
                  {REVISION_DIFF_FOCUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="small-copy revision-learning-copy">
              {revisionDiffFocus === "additions"
                ? "Growth focus: inspect added ideas and verify each one earns its place."
                : revisionDiffFocus === "deletions"
                  ? "Trim focus: validate removals and keep intent unchanged."
                  : "Balanced focus: compare both added and removed changes before restoring."}
            </p>
            <div className="revision-actions">
              <button type="button" onClick={() => void createRevision(activeEditor, "manual-checkpoint")}>
                Create checkpoint
              </button>
              <button type="button" onClick={() => void copyMarkdown(activeEditor)}>
                Copy Markdown
              </button>
              <button
                type="button"
                onClick={() => {
                  if (filteredSnapshots[0]) {
                    setSelectedSnapshotId(filteredSnapshots[0].id);
                  }
                }}
              >
                Jump latest in filter
              </button>
            </div>
            <p className="small-copy revision-meta-copy">
              {filteredSnapshots.length} visible snapshots.{" "}
              {averageSnapshotCadence === null
                ? "Capture two checkpoints to unlock cadence coaching."
                : `Average capture cadence: ${averageSnapshotCadence} min.`}{" "}
              {latestSnapshotAgeMinutes === null ? "" : `Latest snapshot age: ${formatAgeMinutes(latestSnapshotAgeMinutes)}.`}
            </p>

            <div className="revision-list">
              {filteredSnapshots.map((snapshot) => (
                <article
                  key={snapshot.id}
                  className={`revision-card ${snapshot.id === selectedSnapshotId ? "active" : ""}`}
                >
                  <button type="button" className="revision-select" onClick={() => setSelectedSnapshotId(snapshot.id)}>
                    <strong>{snapshot.reason === "manual-checkpoint" ? "Checkpoint" : snapshot.reason === "restore" ? "Restore" : "Autosave"}</strong>
                    <span>{formatTime(snapshot.createdAt)}</span>
                  </button>
                  <button type="button" className="revision-restore" onClick={() => restoreSnapshot(snapshot)}>
                    Restore
                  </button>
                </article>
              ))}
              {filteredSnapshots.length === 0 ? <p className="small-copy">No snapshots match this filter yet.</p> : null}
            </div>

            {selectedSnapshot ? (
              <div className="revision-diff">
                <div className="revision-summary">
                  <span>{revisionSummary.changed} changed</span>
                  <span>{revisionSummary.inserted} added</span>
                  <span>{revisionSummary.deleted} removed</span>
                </div>
                <div className="diff-list">
                  {focusedRevisionDiff.slice(0, 16).map((block, index) => (
                    <RevisionDiffView key={`${block.kind}-${index}`} block={block} />
                  ))}
                </div>
              </div>
            ) : null}
          </PanelSection>
        </aside>
        </main>
      )}

      {commandPaletteOpen ? (
        <div className="overlay" onClick={() => setCommandPaletteOpen(false)}>
          <div className="modal command-modal" onClick={(event) => event.stopPropagation()}>
            <input
              className="modal-input"
              autoFocus
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Search commands, structure tools, and revision actions"
            />
            <div className="command-list">
              {paletteCommands.map((command) => (
                <button
                  key={command.id}
                  className="command-item"
                  type="button"
                  onClick={() => {
                    command.run();
                    setCommandPaletteOpen(false);
                    setCommandQuery("");
                  }}
                >
                  <span>
                    <strong>{command.label}</strong>
                    <small>
                      {command.description}
                      {command.compatibilityLabel ? ` • ${command.compatibilityLabel}` : ""}
                    </small>
                  </span>
                  <span>{command.shortcut ?? command.compatibilityLabel ?? command.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {slashOpen ? (
        <div className="slash-menu" style={{ top: `${slashPosition.top}px`, left: `${slashPosition.left}px` }}>
          {slashCommands.length === 0 ? <p className="slash-empty">No matching blocks.</p> : null}
          {slashCommands.map((command, index) => (
            <button
              key={command.id}
              className={`slash-option ${index === Math.min(slashIndex, Math.max(slashCommands.length - 1, 0)) ? "active" : ""}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                command.run();
                setSlashOpen(false);
                setSlashQuery("");
                setSlashIndex(0);
              }}
            >
              <span>{command.label}</span>
              <small>
                {command.description}
                {command.compatibilityLabel ? ` • ${command.compatibilityLabel}` : ""}
              </small>
            </button>
          ))}
        </div>
      ) : null}

      {linkEditorOpen ? (
        <div className="overlay" onClick={() => setLinkEditorOpen(false)}>
          <div className="modal link-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Edit link</h2>
            <input
              className="modal-input"
              autoFocus
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              placeholder="https://example.com"
            />
            <div className="modal-actions">
              <button type="button" onClick={() => setLinkEditorOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={applyLink}>
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {findPanelOpen ? (
        <div className="overlay" onClick={() => setFindPanelOpen(false)}>
          <div className="modal find-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Find and replace</h2>
            <div className="find-structured-controls">
              <label className="style-control">
                <span>Replace style</span>
                <select
                  value={replaceTransform}
                  onChange={(event) => setReplaceTransform(event.target.value as ReplaceTransform)}
                >
                  {REPLACE_TRANSFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="compact-grid">
                <button
                  className={`chip ${findCaseSensitive ? "active" : ""}`}
                  type="button"
                  aria-pressed={findCaseSensitive}
                  onClick={() => setFindCaseSensitive((current) => !current)}
                >
                  Case sensitive
                </button>
                <button
                  className={`chip ${findWholeWord ? "active" : ""}`}
                  type="button"
                  aria-pressed={findWholeWord}
                  onClick={() => setFindWholeWord((current) => !current)}
                >
                  Whole word
                </button>
              </div>
            </div>
            <input
              className="modal-input"
              autoFocus
              value={findQuery}
              onChange={(event) => setFindQuery(event.target.value)}
              placeholder="Find"
            />
            <input
              className="modal-input"
              value={replaceValue}
              onChange={(event) => setReplaceValue(event.target.value)}
              placeholder="Replace with"
            />
            <div className="modal-actions">
              <button type="button" onClick={() => jumpToMatch(-1)}>
                Previous
              </button>
              <button type="button" onClick={() => jumpToMatch(1)}>
                Next
              </button>
              <button type="button" onClick={replaceActiveMatch}>
                Replace
              </button>
              <button type="button" onClick={replaceEveryMatch}>
                Replace all
              </button>
            </div>
            <p className="small-copy">
              {selectionCount} matches. Replace mode:{" "}
              {REPLACE_TRANSFORM_OPTIONS.find((option) => option.value === replaceTransform)?.label ?? "As typed"}.
            </p>
          </div>
        </div>
      ) : null}

      {shortcutOpen ? (
        <div className="overlay" onClick={() => setShortcutOpen(false)}>
          <div className="modal shortcut-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Keyboard cheatsheet</h2>
            <div className="shortcut-grid">
              <span>Cmd/Ctrl+K</span>
              <span>Command palette</span>
              <span>Cmd/Ctrl+F</span>
              <span>Find and replace</span>
              <span>Alt+↑ / Alt+↓</span>
              <span>Increase or decrease font size by 0.5</span>
              <span>Alt+Shift+↑ / Alt+Shift+↓</span>
              <span>Increase or decrease font weight by 100</span>
              <span>Alt+. / Alt+,</span>
              <span>Increase or decrease letter spacing by 0.01</span>
              <span>/</span>
              <span>Slash blocks on an empty line</span>
              <span>?</span>
              <span>Open shortcut help</span>
              <span>Esc</span>
              <span>Close overlays and exit focus mode</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PanelSection({
  sectionId,
  title,
  copy,
  children,
  collapsed,
  onToggle,
}: {
  sectionId: string;
  title: string;
  copy: string;
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const contentId = `${sectionId}-content`;

  return (
    <section className={`panel-section ${collapsed ? "collapsed" : ""}`}>
      <div className="section-heading">
        <div className="section-heading-copy">
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <button
          className="section-toggle"
          type="button"
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={onToggle}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {!collapsed ? <div id={contentId}>{children}</div> : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </article>
  );
}

function HtmlCodeView({
  value,
  label,
  layout,
  editing,
  dirty,
  error,
  onChange,
  onCopy,
  onApply,
  onReset,
  onStartEdit,
  onStopEdit,
}: {
  value: string;
  label: string;
  layout: HtmlCodeLayoutMode;
  editing: boolean;
  dirty: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onCopy: () => void;
  onApply: () => void;
  onReset: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const lines = formatHtmlForCodeView(value, layout);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isModifier = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (isModifier && key === "a") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.select();
      return;
    }

    if (isModifier && key === "enter") {
      event.preventDefault();
      onApply();
    }
  }

  return (
    <div className="code-surface" role="region" aria-label={label}>
      <div className="code-actions">
        <span className="small-copy">{editing ? "Cmd/Ctrl+Enter to apply" : "Syntax-highlighted preview"}</span>
        <div className="code-action-buttons">
          <button className="ghost-action" type="button" onClick={onCopy}>
            Copy text
          </button>
          {editing ? (
            <>
              <button className="ghost-action" type="button" onClick={onReset} disabled={!dirty}>
                Reset
              </button>
              <button className="ghost-action active" type="button" onClick={onApply} disabled={!dirty}>
                Apply changes
              </button>
              <button className="ghost-action" type="button" onClick={onStopEdit}>
                Done
              </button>
            </>
          ) : (
            <button className="ghost-action active" type="button" onClick={onStartEdit}>
              Edit text
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <textarea
          className="code-editor"
          value={value}
          spellCheck={false}
          onKeyDown={handleKeyDown}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          placeholder="No HTML output yet."
        />
      ) : (
        <pre className="code-view">
          {lines.length === 0 ? (
            <span className="code-line">
              <span className="code-token code-token-muted">No HTML output yet.</span>
            </span>
          ) : (
            lines.map((line, lineIndex) =>
              line.blank ? (
                <span key={`blank-${lineIndex}`} className="code-line code-line-blank" />
              ) : (
                <span key={`line-${lineIndex}`} className="code-line">
                  <span className="code-indent" aria-hidden="true">
                    {"  ".repeat(Math.max(line.indent, 0))}
                  </span>
                  {line.tokens.map((token, tokenIndex) => (
                    <span key={`token-${lineIndex}-${tokenIndex}`} className={`code-token code-token-${token.kind}`}>
                      {token.value}
                    </span>
                  ))}
                </span>
              ),
            )
          )}
        </pre>
      )}
      {error ? <p className="code-error">{error}</p> : null}
    </div>
  );
}

function RgbaEditor({
  label,
  value,
  onChange,
  onApply,
  onReset,
}: {
  label: string;
  value: RgbaValue;
  onChange: (value: RgbaValue) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const cssValue = toRgbaString(value);

  function updateChannel(channel: keyof RgbaValue, nextValue: string) {
    if (channel === "a") {
      onChange({
        ...value,
        a: clampAlpha(Number(nextValue)),
      });
      return;
    }

    onChange({
      ...value,
      [channel]: clampChannel(Number(nextValue)),
    });
  }

  return (
    <div className="rgba-editor">
      <div className="rgba-preview-row">
        <div className="rgba-preview" style={{ "--rgba-preview-color": cssValue } as React.CSSProperties}></div>
        <div className="rgba-preview-copy">
          <strong>{label}</strong>
          <code>{cssValue}</code>
        </div>
      </div>

      <div className="rgba-picker-row">
        <label className="rgba-picker">
          <span>Color</span>
          <input
            type="color"
            value={toHexColor(value)}
            aria-label={`${label} color`}
            onChange={(event) => {
              const nextColor = parseCssColor(event.target.value, value);
              onChange({ ...value, r: nextColor.r, g: nextColor.g, b: nextColor.b });
            }}
          />
        </label>

        <label className="rgba-alpha-control">
          <span>Alpha</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={value.a}
            aria-label={`${label} alpha`}
            onChange={(event) => updateChannel("a", event.target.value)}
          />
          <strong>{formatAlpha(value.a)}</strong>
        </label>
      </div>

      <div className="rgba-grid">
        <label className="rgba-field">
          <span>R</span>
          <input
            type="number"
            min="0"
            max="255"
            value={value.r}
            aria-label={`${label} red`}
            onChange={(event) => updateChannel("r", event.target.value)}
          />
        </label>
        <label className="rgba-field">
          <span>G</span>
          <input
            type="number"
            min="0"
            max="255"
            value={value.g}
            aria-label={`${label} green`}
            onChange={(event) => updateChannel("g", event.target.value)}
          />
        </label>
        <label className="rgba-field">
          <span>B</span>
          <input
            type="number"
            min="0"
            max="255"
            value={value.b}
            aria-label={`${label} blue`}
            onChange={(event) => updateChannel("b", event.target.value)}
          />
        </label>
        <label className="rgba-field">
          <span>A</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={formatAlpha(value.a)}
            aria-label={`${label} opacity`}
            onChange={(event) => updateChannel("a", event.target.value)}
          />
        </label>
      </div>

      <div className="rgba-actions">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onApply}>
          Apply
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`tool ${active ? "active" : ""}`}
      type="button"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ToolbarSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="toolbar-select">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </select>
    </label>
  );
}

function ToolbarInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="toolbar-input">
      <span>{label}</span>
      <div onMouseDown={(event) => event.stopPropagation()}>{children}</div>
    </label>
  );
}

function ChunkFieldEditor({
  field,
  value,
  onChange,
  onRepeaterItemChange,
  onRepeaterItemAdd,
  onRepeaterItemRemove,
}: {
  field: ChunkField;
  value: unknown;
  onChange: (value: unknown) => void;
  onRepeaterItemChange: (itemIndex: number, fieldKey: string, value: unknown) => void;
  onRepeaterItemAdd: () => void;
  onRepeaterItemRemove: (itemIndex: number) => void;
}) {
  if (field.type === "repeater") {
    const items = normalizeRepeaterItems(value);
    const maxItems = field.maxItems ?? Number.POSITIVE_INFINITY;

    return (
      <div className="chunk-repeater chunk-control-wide">
        <div className="chunk-repeater-heading">
          <span>{field.label}</span>
          <button type="button" onClick={onRepeaterItemAdd} disabled={items.length >= maxItems}>
            Add {field.itemLabel}
          </button>
        </div>
        {field.helpText ? <p className="small-copy">{field.helpText}</p> : null}
        {items.length === 0 ? <p className="small-copy">No items yet.</p> : null}
        {items.map((item, itemIndex) => (
          <article key={`${field.key}-${itemIndex}`} className="chunk-repeater-item">
            <div className="chunk-repeater-item-head">
              <strong>
                {field.itemLabel} {itemIndex + 1}
              </strong>
              <button type="button" onClick={() => onRepeaterItemRemove(itemIndex)} disabled={items.length <= (field.minItems ?? 0)}>
                Remove
              </button>
            </div>
            <div className="chunk-repeater-grid">
              {field.itemFields.map((itemField) => {
                const currentValue = item[itemField.key];
                if (itemField.type === "textarea") {
                  return (
                    <label key={`${field.key}-${itemIndex}-${itemField.key}`} className="chunk-control chunk-control-wide">
                      <span>{itemField.label}</span>
                      <textarea
                        rows={itemField.rows ?? 3}
                        value={typeof currentValue === "string" ? currentValue : ""}
                        placeholder={itemField.placeholder}
                        onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.value)}
                      />
                      {itemField.helpText ? <small className="small-copy">{itemField.helpText}</small> : null}
                    </label>
                  );
                }

                if (itemField.type === "toggle") {
                  return (
                    <label key={`${field.key}-${itemIndex}-${itemField.key}`} className="chunk-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(currentValue)}
                        onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.checked)}
                      />
                      <span>{itemField.label}</span>
                      {itemField.helpText ? <small className="small-copy">{itemField.helpText}</small> : null}
                    </label>
                  );
                }

                if (itemField.type === "select") {
                  return (
                    <label key={`${field.key}-${itemIndex}-${itemField.key}`} className="chunk-control">
                      <span>{itemField.label}</span>
                      <select
                        value={typeof currentValue === "string" ? currentValue : itemField.options[0]?.value ?? ""}
                        onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.value)}
                      >
                        {itemField.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {itemField.helpText ? <small className="small-copy">{itemField.helpText}</small> : null}
                    </label>
                  );
                }

                if (itemField.type === "number") {
                  return (
                    <label key={`${field.key}-${itemIndex}-${itemField.key}`} className="chunk-control">
                      <span>{itemField.label}</span>
                      <input
                        type="number"
                        value={stringifyChunkFieldValue(currentValue)}
                        placeholder={itemField.placeholder}
                        min={itemField.min}
                        max={itemField.max}
                        step={itemField.step ?? 1}
                        onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.value)}
                      />
                      {itemField.unit ? <small className="small-copy">Unit: {itemField.unit}</small> : null}
                      {itemField.helpText ? <small className="small-copy">{itemField.helpText}</small> : null}
                    </label>
                  );
                }

                if (itemField.type === "color") {
                  const current = stringifyChunkFieldValue(currentValue);
                  return (
                    <label key={`${field.key}-${itemIndex}-${itemField.key}`} className="chunk-control">
                      <span>{itemField.label}</span>
                      <div className="chunk-color-control">
                        <input
                          type="color"
                          value={toChunkColorInputValue(current, "#ffffff")}
                          aria-label={`${itemField.label} color swatch`}
                          onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.value)}
                        />
                        <input
                          type="text"
                          value={current}
                          placeholder={itemField.placeholder ?? "#ffffff"}
                          onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.value)}
                        />
                      </div>
                      {itemField.helpText ? <small className="small-copy">{itemField.helpText}</small> : null}
                    </label>
                  );
                }

                if (itemField.type === "icon") {
                  const current = stringifyChunkFieldValue(currentValue);
                  return (
                    <label key={`${field.key}-${itemIndex}-${itemField.key}`} className="chunk-control">
                      <span>{itemField.label}</span>
                      <input
                        type="text"
                        value={current}
                        placeholder={itemField.placeholder}
                        onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.value)}
                      />
                      {itemField.presets?.length ? (
                        <div className="chunk-icon-presets" role="group" aria-label={`${itemField.label} presets`}>
                          {itemField.presets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => onRepeaterItemChange(itemIndex, itemField.key, preset)}
                              aria-pressed={current === preset}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {itemField.helpText ? <small className="small-copy">{itemField.helpText}</small> : null}
                    </label>
                  );
                }

                return (
                  <label key={`${field.key}-${itemIndex}-${itemField.key}`} className="chunk-control">
                    <span>{itemField.label}</span>
                    <input
                      type={itemField.type === "url" ? "url" : "text"}
                      value={stringifyChunkFieldValue(currentValue)}
                      placeholder={itemField.placeholder}
                      onChange={(event) => onRepeaterItemChange(itemIndex, itemField.key, event.target.value)}
                    />
                    {itemField.helpText ? <small className="small-copy">{itemField.helpText}</small> : null}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="chunk-control chunk-control-wide">
        <span>{field.label}</span>
        <textarea
          rows={field.rows ?? 3}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.helpText ? <small className="small-copy">{field.helpText}</small> : null}
      </label>
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="chunk-toggle">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span>{field.label}</span>
        {field.helpText ? <small className="small-copy">{field.helpText}</small> : null}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="chunk-control">
        <span>{field.label}</span>
        <select value={typeof value === "string" ? value : field.options[0]?.value ?? ""} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.helpText ? <small className="small-copy">{field.helpText}</small> : null}
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="chunk-control">
        <span>{field.label}</span>
        <input
          type="number"
          value={stringifyChunkFieldValue(value)}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.unit ? <small className="small-copy">Unit: {field.unit}</small> : null}
        {field.helpText ? <small className="small-copy">{field.helpText}</small> : null}
      </label>
    );
  }

  if (field.type === "color") {
    const current = stringifyChunkFieldValue(value);
    return (
      <label className="chunk-control">
        <span>{field.label}</span>
        <div className="chunk-color-control">
          <input
            type="color"
            value={toChunkColorInputValue(current, "#ffffff")}
            aria-label={`${field.label} color swatch`}
            onChange={(event) => onChange(event.target.value)}
          />
          <input type="text" value={current} placeholder={field.placeholder ?? "#ffffff"} onChange={(event) => onChange(event.target.value)} />
        </div>
        {field.helpText ? <small className="small-copy">{field.helpText}</small> : null}
      </label>
    );
  }

  if (field.type === "icon") {
    const current = stringifyChunkFieldValue(value);
    return (
      <label className="chunk-control">
        <span>{field.label}</span>
        <input type="text" value={current} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />
        {field.presets?.length ? (
          <div className="chunk-icon-presets" role="group" aria-label={`${field.label} presets`}>
            {field.presets.map((preset) => (
              <button key={preset} type="button" onClick={() => onChange(preset)} aria-pressed={current === preset}>
                {preset}
              </button>
            ))}
          </div>
        ) : null}
        {field.helpText ? <small className="small-copy">{field.helpText}</small> : null}
      </label>
    );
  }

  return (
    <label className="chunk-control">
      <span>{field.label}</span>
      <input
        type={field.type === "url" ? "url" : "text"}
        value={stringifyChunkFieldValue(value)}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.helpText ? <small className="small-copy">{field.helpText}</small> : null}
    </label>
  );
}

function stringifyChunkFieldValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function toChunkColorInputValue(value: string, fallback: string) {
  const parsed = parseHexColor(value.trim());
  if (!parsed) {
    return fallback;
  }

  return toHexColor(parsed);
}

function RevisionDiffView({ block }: { block: RevisionDiffBlock }) {
  if (block.kind === "change") {
    return (
      <article className="diff-card change">
        <small>{block.type}</small>
        <p>
          {block.segments.map((segment, index) => (
            <span
              key={`${segment.value}-${index}`}
              className={segment.added ? "diff-added" : segment.removed ? "diff-removed" : ""}
            >
              {segment.value}
            </span>
          ))}
        </p>
      </article>
    );
  }

  return (
    <article className={`diff-card ${block.kind}`}>
      <small>{block.type}</small>
      <p>{block.text}</p>
    </article>
  );
}

function buildCommands(
  editor: Editor | null,
  actions: {
    openFind: () => void;
    openLinkEditor: () => void;
    toggleFocus: () => void;
    toggleTypewriter: () => void;
    checkpoint: () => void;
    insertFootnote: () => void;
    insertChunk: (templateId: string) => void;
    insertRawChunk: () => void;
    copyMarkdown: () => Promise<void>;
    exportHtml: () => void;
    openRevisions: () => void;
  },
): CommandDefinition[] {
  if (!editor) {
    return [];
  }

  return [
    {
      id: "bold",
      label: "Bold",
      description: "Strengthen the current selection.",
      group: "format",
      shortcut: "Cmd/Ctrl+B",
      surface: "palette",
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: "italic",
      label: "Italic",
      description: "Add emphasis with a softer tilt.",
      group: "format",
      shortcut: "Cmd/Ctrl+I",
      surface: "palette",
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: "underline",
      label: "Underline",
      description: "Apply direct underlining to the selection.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      id: "strikethrough",
      label: "Strikethrough",
      description: "Mark text as crossed out while keeping it visible.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      id: "inline-code",
      label: "Inline code",
      description: "Switch selected text into inline code formatting.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().toggleCode().run(),
    },
    {
      id: "heading-1",
      label: "Heading 1",
      description: "Create a large section entrance.",
      group: "format",
      surface: "both",
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "heading-2",
      label: "Heading 2",
      description: "Create a sectional waypoint.",
      group: "format",
      surface: "both",
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "heading-3",
      label: "Heading 3",
      description: "Create a compact tertiary heading.",
      group: "format",
      surface: "both",
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: "bullet-list",
      label: "Bullet list",
      description: "Turn loose thoughts into an editable list.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: "ordered-list",
      label: "Numbered list",
      description: "Turn selected lines into ordered steps.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "task-list",
      label: "Task list",
      description: "Convert structure into actions.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      id: "callout-note",
      label: "Callout note",
      description: "Wrap the active block in a note callout.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().setCallout("note").run(),
    },
    {
      id: "callout-warning",
      label: "Warning callout",
      description: "Use a warmer callout for risk and caution.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().setCallout("warning").run(),
    },
    {
      id: "callout-success",
      label: "Success callout",
      description: "Mark a resolved or confirmed point.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().setCallout("success").run(),
    },
    {
      id: "quote",
      label: "Pull quote",
      description: "Give a sentence more gravity.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "table",
      label: "Insert table",
      description: "Drop in a 3x3 table with a header row.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: "divider",
      label: "Divider",
      description: "Create a visual break in the page.",
      group: "insert",
      surface: "both",
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
    ...CHUNK_TEMPLATE_CONCEPTS.flatMap((concept) => {
      const htmlTemplate = concept.templateIds.html ? getChunkTemplate(concept.templateIds.html) : null;
      const jsTemplate = concept.templateIds.javascript ? getChunkTemplate(concept.templateIds.javascript) : null;
      const defaultTemplate = htmlTemplate ?? jsTemplate;
      if (!defaultTemplate || defaultTemplate.id === RAW_CHUNK_TEMPLATE_ID) {
        return [];
      }

      const variantBadge = htmlTemplate && jsTemplate ? "[HTML/JS]" : htmlTemplate ? "[HTML]" : "[JS]";
      const compatibilityLabel = jsTemplate
        ? `HTML ${getInteractiveChunkCompatibilityBadgeText((htmlTemplate ?? defaultTemplate).compatibility)} • JS ${getInteractiveChunkCompatibilityBadgeText(jsTemplate.compatibility)}`
        : getInteractiveChunkCompatibilityBadgeText(defaultTemplate.compatibility);

      const searchText = [
        concept.label.toLowerCase(),
        concept.category.toLowerCase(),
        concept.tags.join(" "),
        ...(htmlTemplate?.keywords ?? []),
        ...(jsTemplate?.keywords ?? []),
      ].join(" ");

      return [
        {
          id: `chunk-concept-${concept.id}`,
          label: `${variantBadge} ${concept.label}`,
          description: `${defaultTemplate.description} ${jsTemplate ? "Includes JavaScript variant." : "HTML-only concept."}`,
          group: "insert" as const,
          surface: "both" as const,
          searchText,
          compatibilityLabel,
          run: () => actions.insertChunk(defaultTemplate.id),
        },
      ];
    }),
    {
      id: "chunk-raw-html",
      label: "[HTML Advanced] Raw HTML block",
      description: "Insert a raw HTML block with strict allowlist analysis and no custom script execution.",
      group: "insert",
      surface: "both",
      searchText: "raw html custom snippet embed block advanced pure html",
      compatibilityLabel: "Strict: degrades • Runtime: optional",
      run: actions.insertRawChunk,
    },
    {
      id: "superscript",
      label: "Superscript",
      description: "Raise selected text for references and markers.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().toggleSuperscript().run(),
    },
    {
      id: "clear-format",
      label: "Clear formatting",
      description: "Remove marks and reset block styling on selection.",
      group: "format",
      surface: "palette",
      run: () =>
        editor
          .chain()
          .focus()
          .unsetAllMarks()
          .clearNodes()
          .unsetTextAlign()
          .unsetLineHeight()
          .unsetFontSize()
          .unsetFontFamily()
          .unsetFontWeight()
          .unsetLetterSpacing()
          .run(),
    },
    {
      id: "text-size-default",
      label: "Reset text size",
      description: "Return selected text to the document default size.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().unsetFontSize().run(),
    },
    {
      id: "text-size-large",
      label: "Set text size to 24px",
      description: "Apply a larger display-friendly text size.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().setFontSize("24px").run(),
    },
    {
      id: "font-serif",
      label: "Use serif font",
      description: "Apply the editorial serif stack to the selection.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().setFontFamily(`"Iowan Old Style", "Palatino Linotype", serif`).run(),
    },
    {
      id: "font-sans",
      label: "Use sans font",
      description: "Apply a cleaner sans stack to the selection.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().setFontFamily(`"Avenir Next", "Segoe UI", sans-serif`).run(),
    },
    {
      id: "line-height-comfort",
      label: "Set line height to comfort",
      description: "Use a looser 1.8 rhythm on active blocks.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().setLineHeight("1.8").run(),
    },
    {
      id: "font-weight-bold",
      label: "Set font weight to 700",
      description: "Apply explicit bold weight without relying on toggle marks.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().setFontWeight("700").run(),
    },
    {
      id: "font-weight-reset",
      label: "Reset font weight",
      description: "Clear explicit weight and return to inherited defaults.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().unsetFontWeight().run(),
    },
    {
      id: "tracking-loose",
      label: "Set tracking to 0.03em",
      description: "Increase letter spacing for airy headings and pull quotes.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().setLetterSpacing("0.03em").run(),
    },
    {
      id: "tracking-reset",
      label: "Reset tracking",
      description: "Clear explicit letter spacing from selected text.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().unsetLetterSpacing().run(),
    },
    {
      id: "align-justify",
      label: "Align justify",
      description: "Set paragraph alignment to justified.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().setTextAlign("justify").run(),
    },
    {
      id: "footnote",
      label: "Footnote",
      description: "Insert a footnote marker and append a note.",
      group: "insert",
      surface: "both",
      run: actions.insertFootnote,
    },
    {
      id: "link",
      label: "Edit link",
      description: "Add or update a hyperlink on the selection.",
      group: "format",
      surface: "palette",
      run: actions.openLinkEditor,
    },
    {
      id: "find",
      label: "Find and replace",
      description: "Search across the draft without leaving the keyboard.",
      group: "navigate",
      shortcut: "Cmd/Ctrl+F",
      surface: "palette",
      run: actions.openFind,
    },
    {
      id: "checkpoint",
      label: "Create checkpoint",
      description: "Save a named revision anchor in the history rail.",
      group: "revision",
      surface: "palette",
      run: actions.checkpoint,
    },
    {
      id: "revisions",
      label: "Open revisions rail",
      description: "Jump to autosnapshots and diff view.",
      group: "revision",
      surface: "palette",
      run: actions.openRevisions,
    },
    {
      id: "focus",
      label: "Toggle focus mode",
      description: "Collapse the rails and let the draft take over.",
      group: "navigate",
      surface: "palette",
      run: actions.toggleFocus,
    },
    {
      id: "typewriter",
      label: "Toggle typewriter mode",
      description: "Keep the active block closer to the visual center.",
      group: "navigate",
      surface: "palette",
      run: actions.toggleTypewriter,
    },
    {
      id: "markdown",
      label: "Copy Markdown",
      description: "Export the current draft as Markdown.",
      group: "revision",
      surface: "palette",
      run: () => {
        void actions.copyMarkdown();
      },
    },
    {
      id: "html",
      label: "Export HTML",
      description: "Download a clean HTML version of the draft.",
      group: "revision",
      surface: "palette",
      run: actions.exportHtml,
    },
  ];
}

function getFilteredCommands(commands: CommandDefinition[], query: string, surface: "palette" | "slash"): CommandDefinition[] {
  const normalized = query.trim().toLowerCase();
  const visible = commands.filter((command) => command.surface === "both" || command.surface === surface);
  if (!normalized) {
    return visible;
  }

  return visible.filter((command) =>
    [command.label, command.description, command.group, command.searchText ?? ""].join(" ").toLowerCase().includes(normalized),
  );
}

function refreshDerived(
  editor: Editor,
  findQuery: string,
  findOptions: SearchMatchOptions,
  setOutline: (outline: OutlineItem[]) => void,
  setStats: (stats: StatsSnapshot) => void,
  setMatches: (matches: SearchMatch[]) => void,
  setActiveMatchIndex: (index: number) => void,
  setActiveSectionKey: (key: string | null) => void,
  setSelectionLabel: (label: string) => void,
  setBlockHandle: (handle: { index: number; top: number } | null) => void,
) {
  const json = editor.getJSON();
  const nextOutline = buildOutline(editor);
  setOutline(nextOutline);
  setStats(computeStats(json));
  setMatches(findQuery ? findMatches(editor.state.doc, findQuery, findOptions) : []);
  setActiveMatchIndex(0);
  refreshSelectionDerived(editor, setSelectionLabel, setBlockHandle, setActiveSectionKey, nextOutline);
}

function refreshSelectionDerived(
  editor: Editor,
  setSelectionLabel: (label: string) => void,
  setBlockHandle: (handle: { index: number; top: number } | null) => void,
  setActiveSectionKey: (key: string | null) => void,
  outline: OutlineItem[],
) {
  const selectionText = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ");
  if (!selectionText.trim()) {
    setSelectionLabel("Cursor ready");
  } else {
    const words = selectionText.trim().split(/\s+/).filter(Boolean).length;
    setSelectionLabel(`${selectionText.length} chars selected, ${words} words`);
  }

  const topLevelIndex = editor.state.selection.$anchor.index(0);
  const blockNode = editor.view.dom.children.item(topLevelIndex) as HTMLElement | null;
  setBlockHandle(
    blockNode
      ? {
          index: topLevelIndex,
          top: blockNode.offsetTop + blockNode.offsetHeight / 2,
        }
      : null,
  );

  const currentSection = [...outline].reverse().find((item) => item.topLevelIndex <= topLevelIndex) ?? null;
  setActiveSectionKey(currentSection?.key ?? null);
}

function buildOutline(editor: Editor): OutlineItem[] {
  const counts = new Map<string, number>();
  const nextOutline: OutlineItem[] = [];

  editor.state.doc.forEach((node, offset, index) => {
    if (node.type.name !== "heading") {
      return;
    }

    const text = node.textContent.trim() || "Untitled heading";
    const nextCount = (counts.get(text) ?? 0) + 1;
    counts.set(text, nextCount);
    nextOutline.push({
      key: `${slug(text)}-${nextCount}`,
      pos: offset + 1,
      level: Number(node.attrs.level ?? 1),
      text,
      topLevelIndex: index,
    });
  });

  return nextOutline;
}

function applyCollapsedSections(editor: Editor, outline: OutlineItem[], collapsedKeys: string[]) {
  const children = Array.from(editor.view.dom.children) as HTMLElement[];
  children.forEach((element) => {
    element.style.display = "";
  });

  outline.forEach((item, index) => {
    if (!collapsedKeys.includes(item.key)) {
      return;
    }

    const nextBoundary =
      outline.slice(index + 1).find((candidate) => candidate.level <= item.level)?.topLevelIndex ?? children.length;

    for (let childIndex = item.topLevelIndex + 1; childIndex < nextBoundary; childIndex += 1) {
      const child = children[childIndex];
      if (child) {
        child.style.display = "none";
      }
    }
  });
}

function shouldOpenSlash(editor: Editor | null) {
  if (!editor || !editor.state.selection.empty) {
    return false;
  }

  const parentText = editor.state.selection.$anchor.parent.textContent.trim();
  return parentText.length === 0;
}

function replaceEditorDocument(editor: Editor, content: JSONContent) {
  const document = editor.schema.nodeFromJSON(content);
  const transaction = editor.state.tr.replaceWith(0, editor.state.doc.content.size, document.content);
  editor.view.dispatch(transaction);
}

function formatHtmlForEditing(source: string, mode: HtmlCodeLayoutMode): string {
  const lines = formatHtmlForCodeView(source, mode);
  if (lines.length === 0) {
    return "";
  }

  return lines
    .map((line) =>
      line.blank ? "" : `${"  ".repeat(Math.max(line.indent, 0))}${line.tokens.map((token) => token.value).join("")}`,
    )
    .join("\n");
}

function normalizeEditableHtml(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) {
    return "<p></p>";
  }

  if (typeof document === "undefined") {
    return trimmed;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(trimmed, "text/html");
  const article = parsed.querySelector("article");
  if (article && article.innerHTML.trim()) {
    return article.innerHTML;
  }

  const bodyHtml = parsed.body?.innerHTML.trim();
  return bodyHtml && bodyHtml.length > 0 ? bodyHtml : trimmed;
}

function ensureDocumentHasContent(content: JSONContent): JSONContent {
  if (content.content && content.content.length > 0) {
    return content;
  }

  return {
    ...sampleDocument.content,
    content: [{ type: "paragraph" }],
  };
}

function scrollCurrentBlockIntoView(editor: Editor) {
  const topLevelIndex = editor.state.selection.$anchor.index(0);
  const blockNode = editor.view.dom.children.item(topLevelIndex) as HTMLElement | null;
  if (blockNode) {
    blockNode.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

async function copyMarkdown(editor: Editor) {
  const markdown = toMarkdown(editor.getJSON());
  await navigator.clipboard.writeText(markdown);
}

function getAccentLinkColor(accent: AccentName): string {
  return ACCENT_LINK_COLORS[accent] ?? ACCENT_LINK_COLORS.ember;
}

function exportHtml(editor: Editor, title: string, accent: AccentName) {
  const content = editor.getJSON() as JSONContent;
  const html = generateExportableHtml(content, editorExtensions);
  const runtimeNeeded = contentHasEnhancedInteractiveChunks(content);
  const chunkStyles = getInteractiveChunkExportStyles();
  const runtimeScript = runtimeNeeded ? `<script>${getInteractiveChunkRuntimeScript()}</script>` : "";
  const payload = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; padding: 4rem 1.4rem; background: #fbf7f0; color: #20160f; font-family: "Iowan Old Style", "Palatino Linotype", serif; }
      article { max-width: 760px; margin: 0 auto; line-height: 1.8; font-size: 1.1rem; }
      h1, h2, h3 { font-family: "Optima", "Avenir Next", sans-serif; line-height: 1.05; letter-spacing: -0.04em; }
      div[data-callout="true"] { border-radius: 18px; padding: 1rem 1.1rem; background: var(--callout-bg, rgba(242, 109, 61, 0.12)); border: 1px solid var(--callout-border, rgba(242, 109, 61, 0.22)); }
      a { color: inherit; text-decoration-color: ${getAccentLinkColor(accent)}; }
      blockquote { border-left: 3px solid rgba(0,0,0,0.15); margin-left: 0; padding-left: 1rem; font-style: italic; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid rgba(0,0,0,0.12); padding: 0.6rem; }
${chunkStyles}
    </style>
  </head>
  <body>
    <article>${html}</article>
    ${runtimeScript}
  </body>
</html>`;

  downloadFile(`${slug(title || "untitled-document")}.html`, payload, "text/html;charset=utf-8");
}

function insertFootnote(editor: Editor) {
  const current = editor.getJSON();
  const nodes = [...(current.content ?? [])];
  const footnoteHeadingIndex = nodes.findIndex(
    (node) => node.type === "heading" && Number(node.attrs?.level ?? 0) === 3 && getPlainText(node).toLowerCase() === "footnotes",
  );
  const currentCount =
    footnoteHeadingIndex >= 0 && nodes[footnoteHeadingIndex + 1]?.type === "orderedList"
      ? nodes[footnoteHeadingIndex + 1]?.content?.length ?? 0
      : 0;
  const nextNumber = currentCount + 1;

  editor
    .chain()
    .focus()
    .insertContent([{ type: "text", text: String(nextNumber), marks: [{ type: "superscript", attrs: {} }] }] as any)
    .run();

  const updated = editor.getJSON();
  const updatedNodes = [...(updated.content ?? [])] as JSONContent[];
  const updatedHeadingIndex = updatedNodes.findIndex(
    (node) => node.type === "heading" && Number(node.attrs?.level ?? 0) === 3 && getPlainText(node).toLowerCase() === "footnotes",
  );

  const noteItem = {
    type: "listItem",
    attrs: {},
    content: [
      {
        type: "paragraph",
        attrs: {},
        content: [{ type: "text", text: `Footnote ${nextNumber}. Replace this with the supporting detail.`, marks: [] }],
      },
    ],
  } as JSONContent;

  if (updatedHeadingIndex === -1) {
    updatedNodes.push(
      {
        type: "heading",
        attrs: { level: 3, textAlign: null },
        content: [{ type: "text", text: "Footnotes", marks: [] }],
      } as JSONContent,
      {
        type: "orderedList",
        attrs: { start: 1 },
        content: [noteItem],
      } as JSONContent,
    );
  } else if (updatedNodes[updatedHeadingIndex + 1]?.type === "orderedList") {
    updatedNodes[updatedHeadingIndex + 1] = {
      ...updatedNodes[updatedHeadingIndex + 1],
      content: [...(updatedNodes[updatedHeadingIndex + 1].content ?? []), noteItem],
    } as JSONContent;
  } else {
    updatedNodes.splice(updatedHeadingIndex + 1, 0, {
      type: "orderedList",
      attrs: { start: 1 },
      content: [noteItem],
    } as JSONContent);
  }

  replaceEditorDocument(editor, { ...updated, content: updatedNodes } as JSONContent);
}

function readRailPref(key: "left" | "right") {
  try {
    const raw = localStorage.getItem(RAIL_PREFS_KEY);
    if (!raw) {
      return true;
    }

    const parsed = JSON.parse(raw) as { left: boolean; right: boolean };
    return key === "left" ? parsed.left : parsed.right;
  } catch {
    return true;
  }
}

function writeRailPrefs(left: boolean, right: boolean) {
  try {
    localStorage.setItem(RAIL_PREFS_KEY, JSON.stringify({ left, right }));
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_PREFS_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }

  return "system";
}

function writeThemePreference(value: ThemePreference) {
  try {
    localStorage.setItem(THEME_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function resolveThemePreference(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }

  return preference;
}

function readSectionPrefs(): PanelCollapsePrefs {
  try {
    const raw = localStorage.getItem(SECTION_PREFS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<PanelCollapsePrefs>((accumulator, [key, value]) => {
      if (typeof value === "boolean") {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function writeSectionPrefs(value: PanelCollapsePrefs) {
  try {
    localStorage.setItem(SECTION_PREFS_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readChunkBuilderLayoutPreference(): ChunkBuilderLayoutMode {
  try {
    const raw = localStorage.getItem(CHUNK_BUILDER_LAYOUT_PREFS_KEY);
    if (raw === "split" || raw === "tools-top" || raw === "stacked") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }

  return "tools-top";
}

function writeChunkBuilderLayoutPreference(value: ChunkBuilderLayoutMode) {
  try {
    localStorage.setItem(CHUNK_BUILDER_LAYOUT_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readChunkBuilderDensityPreference(): ChunkBuilderDensityMode {
  try {
    const raw = localStorage.getItem(CHUNK_BUILDER_DENSITY_PREFS_KEY);
    if (raw === "dense" || raw === "balanced" || raw === "spacious" || raw === "adaptive") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }

  return "balanced";
}

function writeChunkBuilderDensityPreference(value: ChunkBuilderDensityMode) {
  try {
    localStorage.setItem(CHUNK_BUILDER_DENSITY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readChunkBuilderDensityProfilePreference(): ChunkBuilderDensityProfile {
  try {
    const raw = localStorage.getItem(CHUNK_BUILDER_DENSITY_PROFILE_PREFS_KEY);
    if (!raw) {
      return DEFAULT_CHUNK_BUILDER_DENSITY_PROFILE;
    }

    const parsed = JSON.parse(raw) as Partial<ChunkBuilderDensityProfile>;
    return {
      compact: parseChunkBuilderDensityLevel(parsed.compact) ?? DEFAULT_CHUNK_BUILDER_DENSITY_PROFILE.compact,
      medium: parseChunkBuilderDensityLevel(parsed.medium) ?? DEFAULT_CHUNK_BUILDER_DENSITY_PROFILE.medium,
      large: parseChunkBuilderDensityLevel(parsed.large) ?? DEFAULT_CHUNK_BUILDER_DENSITY_PROFILE.large,
    };
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }

  return DEFAULT_CHUNK_BUILDER_DENSITY_PROFILE;
}

function writeChunkBuilderDensityProfilePreference(value: ChunkBuilderDensityProfile) {
  try {
    localStorage.setItem(CHUNK_BUILDER_DENSITY_PROFILE_PREFS_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function parseChunkBuilderDensityLevel(value: unknown): ChunkBuilderDensityLevel | null {
  if (value === "dense" || value === "balanced" || value === "spacious") {
    return value;
  }
  return null;
}

function resolveChunkBuilderDensity(
  mode: ChunkBuilderDensityMode,
  profile: ChunkBuilderDensityProfile,
  viewportWidth: number,
): ChunkBuilderDensityLevel {
  if (mode !== "adaptive") {
    return mode;
  }

  if (viewportWidth < 1100) {
    return profile.compact;
  }

  if (viewportWidth < 1600) {
    return profile.medium;
  }

  return profile.large;
}

function capitalizeSentence(value: string) {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCapabilityTag(value: string) {
  return value
    .split("-")
    .map((token) => (token ? token[0].toUpperCase() + token.slice(1) : token))
    .join(" ");
}

function resolveStructuredTemplateSelection(
  candidateId: string,
  preferredEngine: ChunkTemplateEngine = "html",
): ChunkTemplate | null {
  const direct = getChunkTemplate(candidateId);
  if (direct && direct.id !== RAW_CHUNK_TEMPLATE_ID) {
    return direct;
  }

  const resolvedConceptTemplateId =
    resolveChunkTemplateId(candidateId, preferredEngine, preferredEngine === "html" ? "javascript" : "html") ??
    resolveChunkTemplateId(candidateId, "html", "javascript");
  if (!resolvedConceptTemplateId) {
    return null;
  }

  const resolved = getChunkTemplate(resolvedConceptTemplateId);
  return resolved && resolved.id !== RAW_CHUNK_TEMPLATE_ID ? resolved : null;
}

function buildChunkRuntimeSummary(data: ChunkData) {
  const readString = (key: string, fallback: string) => {
    const value = data[key];
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
  };
  const readBoolean = (key: string, fallback: boolean) => {
    const value = data[key];
    return typeof value === "boolean" ? value : fallback;
  };
  const readNumber = (key: string, fallback: number) => {
    const value = Number(data[key]);
    return Number.isFinite(value) ? Math.round(value) : fallback;
  };

  const autoAdvanceMs = Math.max(0, readNumber("autoAdvanceMs", 0));
  return [
    `State memory: ${readString("stateMemory", "session")}.`,
    `Status detail: ${readString("statusVerbosity", "balanced")}.`,
    `Keyboard shortcuts: ${readBoolean("keyboardShortcuts", true) ? "on" : "off"} with ${readBoolean("navigationWrap", true) ? "wrapping" : "bounded"} navigation.`,
    `Hover activation: ${readBoolean("hoverActivation", false) ? "on" : "off"}.`,
    `Motion profile: ${readString("motionProfile", "balanced")} with ${readString("highlightIntensity", "balanced")} highlights.`,
    `Auto-advance: ${autoAdvanceMs > 0 ? `${String(autoAdvanceMs)}ms` : "off"}.`,
    `Selection model: ${readString("selectionBehavior", "single")} and details mode ${readString("detailsDisclosureMode", "single")}.`,
    `Status line: ${readBoolean("showInteractionStatus", true) ? "visible" : "hidden"}${readBoolean("statusOnLoad", false) ? " with onboarding hint." : "."}`,
  ];
}

function computeChunkBuilderCoverage(fields: ChunkField[], data: ChunkData): {
  filled: number;
  total: number;
  ratio: number;
  missingLabels: string[];
} {
  const requiredFields = fields.filter((field) => field.type !== "repeater");
  if (!requiredFields.length) {
    return {
      filled: 0,
      total: 0,
      ratio: 100,
      missingLabels: [],
    };
  }

  let filled = 0;
  const missingLabels: string[] = [];
  requiredFields.forEach((field) => {
    const value = (data as Record<string, unknown>)[field.key];
    const hasValue =
      typeof value === "boolean"
        ? true
        : typeof value === "number"
          ? !Number.isNaN(value)
          : typeof value === "string"
            ? value.trim().length > 0
            : Array.isArray(value)
              ? value.length > 0
              : value != null;
    if (hasValue) {
      filled += 1;
      return;
    }
    missingLabels.push(field.label);
  });

  return {
    filled,
    total: requiredFields.length,
    ratio: Math.round((filled / requiredFields.length) * 100),
    missingLabels,
  };
}

function formatMinimapLabel(value: string, mode: MinimapLabelMode) {
  const normalized = value.trim();
  if (!normalized) {
    return "Untitled";
  }
  if (mode === "hidden") {
    return "";
  }
  if (mode === "compact") {
    const compact = normalized.split(/\s+/).slice(0, 3).join(" ");
    return compact.length < normalized.length ? `${compact}…` : compact;
  }
  return normalized;
}

function formatChunkConceptLabel(concept: ChunkTemplateConcept) {
  const hasHtml = Boolean(concept.templateIds.html);
  const hasJs = Boolean(concept.templateIds.javascript);
  const htmlTemplate = concept.templateIds.html ? getChunkTemplate(concept.templateIds.html) : null;
  const jsTemplate = concept.templateIds.javascript ? getChunkTemplate(concept.templateIds.javascript) : null;
  const runtimeLabel =
    jsTemplate
      ? "JS runtime"
      : htmlTemplate?.compatibility.enhancedRuntime === "required"
        ? "Runtime required"
        : "Strict-safe";

  if (hasHtml && hasJs) {
    return `[HTML/JS] ${concept.label} • ${runtimeLabel}`;
  }
  if (hasJs) {
    return `[JS] ${concept.label} • ${runtimeLabel}`;
  }
  return `[HTML] ${concept.label} • ${runtimeLabel}`;
}

function readGuidancePreference(): GuidanceLevel {
  try {
    const raw = localStorage.getItem(GUIDANCE_PREFS_KEY);
    if (raw === "guided" || raw === "balanced" || raw === "expert") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }

  return "balanced";
}

function writeGuidancePreference(value: GuidanceLevel) {
  try {
    localStorage.setItem(GUIDANCE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readDensityPreference(): InterfaceDensity {
  try {
    const raw = localStorage.getItem(DENSITY_PREFS_KEY);
    if (raw === "compact" || raw === "balanced" || raw === "comfort") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }

  return "balanced";
}

function writeDensityPreference(value: InterfaceDensity) {
  try {
    localStorage.setItem(DENSITY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readWorkflowTrackPreference(): WorkflowTrack {
  try {
    const raw = localStorage.getItem(WORKFLOW_TRACK_PREFS_KEY);
    if (raw === "draft" || raw === "revise" || raw === "publish") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "revise";
}

function writeWorkflowTrackPreference(value: WorkflowTrack) {
  try {
    localStorage.setItem(WORKFLOW_TRACK_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readNavigationProfilePreference(): NavigationProfile {
  try {
    const raw = localStorage.getItem(NAVIGATION_PROFILE_PREFS_KEY);
    if (raw === "immersive" || raw === "balanced" || raw === "survey") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced";
}

function writeNavigationProfilePreference(value: NavigationProfile) {
  try {
    localStorage.setItem(NAVIGATION_PROFILE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readWorkspaceLayoutPreference(): WorkspaceLayoutPreset {
  try {
    const raw = localStorage.getItem(WORKSPACE_LAYOUT_PREFS_KEY);
    if (raw === "balanced" || raw === "focus" || raw === "panorama") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced";
}

function writeWorkspaceLayoutPreference(value: WorkspaceLayoutPreset) {
  try {
    localStorage.setItem(WORKSPACE_LAYOUT_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readWorkspaceCoachPreference(): WorkspaceCoachPresetId {
  try {
    const raw = localStorage.getItem(WORKSPACE_COACH_PREFS_KEY);
    if (raw === "starter-guided" || raw === "hybrid-balanced" || raw === "ship-review") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "hybrid-balanced";
}

function writeWorkspaceCoachPreference(value: WorkspaceCoachPresetId) {
  try {
    localStorage.setItem(WORKSPACE_COACH_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readModeScenePreference(): ModeScenePresetId {
  try {
    const raw = localStorage.getItem(MODE_SCENE_PREFS_KEY);
    if (raw === "draft-sprint" || raw === "deep-focus" || raw === "review-sweep") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "draft-sprint";
}

function writeModeScenePreference(value: ModeScenePresetId) {
  try {
    localStorage.setItem(MODE_SCENE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readMinimapDepthPreference(): MinimapDepthFilter {
  try {
    const raw = localStorage.getItem(MINIMAP_DEPTH_PREFS_KEY);
    if (raw === "all" || raw === "h1-h2" || raw === "h1") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "h1-h2";
}

function writeMinimapDepthPreference(value: MinimapDepthFilter) {
  try {
    localStorage.setItem(MINIMAP_DEPTH_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readMinimapLabelPreference(): MinimapLabelMode {
  try {
    const raw = localStorage.getItem(MINIMAP_LABEL_PREFS_KEY);
    if (raw === "full" || raw === "compact" || raw === "hidden") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "full";
}

function writeMinimapLabelPreference(value: MinimapLabelMode) {
  try {
    localStorage.setItem(MINIMAP_LABEL_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readMinimapHighlightPreference(): MinimapHighlightMode {
  try {
    const raw = localStorage.getItem(MINIMAP_HIGHLIGHT_PREFS_KEY);
    if (raw === "active" || raw === "level") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "active";
}

function writeMinimapHighlightPreference(value: MinimapHighlightMode) {
  try {
    localStorage.setItem(MINIMAP_HIGHLIGHT_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readPulseLensPreference(): PulseLens {
  try {
    const raw = localStorage.getItem(PULSE_LENS_PREFS_KEY);
    if (raw === "flow" || raw === "structure" || raw === "delivery") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "structure";
}

function writePulseLensPreference(value: PulseLens) {
  try {
    localStorage.setItem(PULSE_LENS_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readPulseTargetPreference(): PulseCadenceTarget {
  try {
    const raw = localStorage.getItem(PULSE_TARGET_PREFS_KEY);
    if (raw === "calm" || raw === "balanced" || raw === "brisk") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced";
}

function writePulseTargetPreference(value: PulseCadenceTarget) {
  try {
    localStorage.setItem(PULSE_TARGET_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readRevisionFilterPreference(): RevisionFilter {
  try {
    const raw = localStorage.getItem(REVISION_FILTER_PREFS_KEY);
    if (raw === "all" || raw === "checkpoint" || raw === "autosave" || raw === "restore") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "all";
}

function writeRevisionFilterPreference(value: RevisionFilter) {
  try {
    localStorage.setItem(REVISION_FILTER_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readRevisionDiffFocusPreference(): RevisionDiffFocus {
  try {
    const raw = localStorage.getItem(REVISION_DIFF_FOCUS_PREFS_KEY);
    if (raw === "balanced" || raw === "additions" || raw === "deletions") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced";
}

function writeRevisionDiffFocusPreference(value: RevisionDiffFocus) {
  try {
    localStorage.setItem(REVISION_DIFF_FOCUS_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readFindStrategyPreference(): FindStrategyId {
  try {
    const raw = localStorage.getItem(FIND_STRATEGY_PREFS_KEY);
    if (raw === "precision" || raw === "sweep" || raw === "normalize") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "precision";
}

function writeFindStrategyPreference(value: FindStrategyId) {
  try {
    localStorage.setItem(FIND_STRATEGY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readChunkBuildStrategyPreference(): ChunkBuildStrategyId {
  try {
    const raw = localStorage.getItem(CHUNK_BUILD_STRATEGY_PREFS_KEY);
    if (raw === "safe-lesson" || raw === "interactive-lab" || raw === "ship-ready") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "safe-lesson";
}

function writeChunkBuildStrategyPreference(value: ChunkBuildStrategyId) {
  try {
    localStorage.setItem(CHUNK_BUILD_STRATEGY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readOutlineStrategyPreference(): OutlineStrategyId {
  try {
    const raw = localStorage.getItem(OUTLINE_STRATEGY_PREFS_KEY);
    if (raw === "structure-scan" || raw === "active-draft" || raw === "reorder-pass") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "structure-scan";
}

function writeOutlineStrategyPreference(value: OutlineStrategyId) {
  try {
    localStorage.setItem(OUTLINE_STRATEGY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readRecentFindQueriesPreference(): string[] {
  try {
    const raw = localStorage.getItem(FIND_RECENT_PREFS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 6);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return [];
}

function writeRecentFindQueriesPreference(value: string[]) {
  try {
    localStorage.setItem(FIND_RECENT_PREFS_KEY, JSON.stringify(value.slice(0, 6)));
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function getSnapshotIntervalsInMinutes(snapshots: RevisionSnapshot[]) {
  if (snapshots.length < 2) {
    return [];
  }

  return snapshots.slice(0, -1).map((snapshot, index) => {
    const next = snapshots[index + 1];
    const deltaMs = Math.max(0, new Date(snapshot.createdAt).getTime() - new Date(next.createdAt).getTime());
    return Math.round(deltaMs / 60000);
  });
}

function getMinutesSince(isoTimestamp: string) {
  const deltaMs = Date.now() - new Date(isoTimestamp).getTime();
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  return Math.max(0, Math.round(deltaMs / 60000));
}

function formatAgeMinutes(value: number) {
  if (value < 60) {
    return `${value} min ago`;
  }
  if (value < 1_440) {
    return `${Math.round(value / 60)} hr ago`;
  }
  return `${Math.round(value / 1_440)} d ago`;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

function summarizeDiff(blocks: RevisionDiffBlock[]) {
  return blocks.reduce(
    (summary, block) => {
      if (block.kind === "insert") {
        summary.inserted += 1;
      }
      if (block.kind === "delete") {
        summary.deleted += 1;
      }
      if (block.kind === "change") {
        summary.changed += 1;
      }
      return summary;
    },
    { inserted: 0, deleted: 0, changed: 0 },
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^[a-z]+:/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function transformReplacement(value: string, mode: ReplaceTransform): string {
  if (mode === "lower") {
    return value.toLocaleLowerCase();
  }

  if (mode === "upper") {
    return value.toLocaleUpperCase();
  }

  if (mode === "title") {
    return value
      .split(/\s+/)
      .map((segment) => (segment ? `${segment.charAt(0).toLocaleUpperCase()}${segment.slice(1).toLocaleLowerCase()}` : segment))
      .join(" ");
  }

  return value;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getPlainText(node: JSONContent | undefined): string {
  if (!node) {
    return "";
  }

  if (node.type === "text") {
    return node.text ?? "";
  }

  return (node.content ?? []).map((child) => getPlainText(child)).join(" ");
}

function syncInteractiveChunkPreviewsInEditor(editor: Editor) {
  const root = editor.view.dom as HTMLElement;
  const chunkNodes = Array.from(root.querySelectorAll<HTMLElement>('div[data-interactive-chunk="true"]'));

  chunkNodes.forEach((chunkNode) => {
    const attrs = fromDomChunkAttributes(chunkNode);
    const rendered = renderInteractiveChunk(attrs);
    const template = attrs.mode === "structured" ? getChunkTemplate(attrs.templateId) : null;
    const modeLabel = attrs.mode === "raw" ? "Raw HTML" : "Structured";
    const engineLabel = template?.engine === "javascript" ? "JavaScript" : "Pure HTML";
    const compatibilityLabel = getInteractiveChunkCompatibilityBadgeText(rendered.compatibility);

    const titleElement = chunkNode.querySelector<HTMLElement>(".vi-chunk-shell-title");
    if (titleElement && titleElement.textContent !== rendered.templateLabel) {
      titleElement.textContent = rendered.templateLabel;
    }

    const metaElement = chunkNode.querySelector<HTMLElement>(".vi-chunk-shell-meta");
    const nextMeta = `${modeLabel} • ${engineLabel} • ${compatibilityLabel}`;
    if (metaElement && metaElement.textContent !== nextMeta) {
      metaElement.textContent = nextMeta;
    }

    const modeToggleButton = chunkNode.querySelector<HTMLElement>('[data-vi-editor-action="toggle-mode"]');
    const nextToggleLabel = attrs.mode === "raw" ? "Structured" : "Raw";
    if (modeToggleButton && modeToggleButton.textContent !== nextToggleLabel) {
      modeToggleButton.textContent = nextToggleLabel;
    }

    const previewShell = chunkNode.querySelector<HTMLElement>("[data-vi-preview-shell]");
    if (previewShell) {
      const nextPreview = `<div data-interactive-chunk-rendered="true">${rendered.html}</div>`;
      if (previewShell.innerHTML !== nextPreview) {
        previewShell.innerHTML = nextPreview;
      }
      hydrateInteractiveChunkPreview(previewShell);
    }
  });
}

function hydrateInteractiveChunkPreview(previewShell: HTMLElement) {
  ensureInteractiveChunkPreviewStyles();
  sandboxInteractiveChunkPreviewState(previewShell);
  hydrateInteractiveChunkRuntime(previewShell);
}

function sandboxInteractiveChunkPreviewState(previewShell: HTMLElement) {
  const renderedChunks = Array.from(previewShell.querySelectorAll<HTMLElement>("[data-vi-template]"));
  renderedChunks.forEach((chunk) => {
    chunk.setAttribute("data-vi-persist-state", "false");
    chunk.setAttribute("data-vi-state-memory", "none");
  });
}

function ensureInteractiveChunkPreviewStyles() {
  if (typeof document === "undefined") {
    return;
  }

  const styleContent = getInteractiveChunkExportStyles();
  const existing = document.getElementById(INTERACTIVE_CHUNK_STYLE_TAG_ID);
  if (existing && existing instanceof HTMLStyleElement) {
    if (existing.textContent !== styleContent) {
      existing.textContent = styleContent;
    }
    return;
  }

  const styleTag = document.createElement("style");
  styleTag.id = INTERACTIVE_CHUNK_STYLE_TAG_ID;
  styleTag.textContent = styleContent;
  document.head.appendChild(styleTag);
}

function resolveActiveInteractiveChunk(editor: Editor): { attrs: Partial<InteractiveChunkAttrs> } | null {
  const topLevelIndex = editor.state.selection.$anchor.index(0);
  const topLevelNode = editor.state.doc.child(topLevelIndex);

  if (topLevelNode?.type.name === "interactiveChunk") {
    return {
      attrs: (topLevelNode.attrs ?? {}) as Partial<InteractiveChunkAttrs>,
    };
  }

  if (topLevelIndex > 0) {
    const previousNode = editor.state.doc.child(topLevelIndex - 1);
    if (previousNode?.type.name === "interactiveChunk") {
      return {
        attrs: (previousNode.attrs ?? {}) as Partial<InteractiveChunkAttrs>,
      };
    }
  }

  if (topLevelIndex + 1 < editor.state.doc.childCount) {
    const nextNode = editor.state.doc.child(topLevelIndex + 1);
    if (nextNode?.type.name === "interactiveChunk") {
      return {
        attrs: (nextNode.attrs ?? {}) as Partial<InteractiveChunkAttrs>,
      };
    }
  }

  let nearestIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < editor.state.doc.childCount; index += 1) {
    if (editor.state.doc.child(index)?.type.name !== "interactiveChunk") {
      continue;
    }
    const distance = Math.abs(index - topLevelIndex);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  if (nearestIndex != null) {
    const nearestNode = editor.state.doc.child(nearestIndex);
    return {
      attrs: (nearestNode.attrs ?? {}) as Partial<InteractiveChunkAttrs>,
    };
  }

  const root = editor.view.dom as HTMLElement;
  const fallbackChunkNode = root.querySelector<HTMLElement>('div[data-interactive-chunk="true"]');
  if (fallbackChunkNode) {
    return {
      attrs: fromDomChunkAttributes(fallbackChunkNode),
    };
  }

  return null;
}

function focusInteractiveChunkDomNode(editor: Editor, chunkElement: HTMLElement) {
  const root = editor.view.dom as HTMLElement;
  let topLevelElement: HTMLElement | null = chunkElement;

  while (topLevelElement && topLevelElement.parentElement !== root) {
    topLevelElement = topLevelElement.parentElement;
  }

  if (!topLevelElement || topLevelElement.parentElement !== root) {
    return false;
  }

  const topLevelElements = Array.from(root.children);
  const topLevelIndex = topLevelElements.indexOf(topLevelElement);
  if (topLevelIndex < 0 || topLevelIndex >= editor.state.doc.childCount) {
    return false;
  }

  if (editor.state.doc.child(topLevelIndex)?.type.name !== "interactiveChunk") {
    return false;
  }

  let position = 0;
  for (let index = 0; index < topLevelIndex; index += 1) {
    position += editor.state.doc.child(index).nodeSize;
  }

  const transaction = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position));
  editor.view.dispatch(transaction);
  return true;
}

function selectInsertedInteractiveChunk(editor: Editor) {
  const { doc } = editor.state;
  const topLevelIndex = editor.state.selection.$anchor.index(0);
  const candidateIndexes = [topLevelIndex, topLevelIndex - 1, topLevelIndex + 1].filter(
    (index) => index >= 0 && index < doc.childCount,
  );

  let targetIndex = candidateIndexes.find((index) => doc.child(index)?.type.name === "interactiveChunk");
  if (targetIndex == null) {
    for (let index = doc.childCount - 1; index >= 0; index -= 1) {
      if (doc.child(index)?.type.name === "interactiveChunk") {
        targetIndex = index;
        break;
      }
    }
  }

  if (targetIndex == null) {
    return;
  }

  let position = 0;
  for (let index = 0; index < targetIndex; index += 1) {
    position += doc.child(index).nodeSize;
  }

  const transaction = editor.state.tr.setSelection(NodeSelection.create(doc, position));
  editor.view.dispatch(transaction);
}

function selectInteractiveChunkByAttrs(editor: Editor, attrs: InteractiveChunkAttrs) {
  const target = normalizeInteractiveChunkAttrs(attrs);
  const { doc } = editor.state;
  let position = 0;
  let fallbackPosition: number | null = null;

  for (let index = 0; index < doc.childCount; index += 1) {
    const node = doc.child(index);
    if (node.type.name !== "interactiveChunk") {
      position += node.nodeSize;
      continue;
    }

    if (fallbackPosition == null) {
      fallbackPosition = position;
    }

    const nodeAttrs = normalizeInteractiveChunkAttrs((node.attrs ?? {}) as Partial<InteractiveChunkAttrs>);
    const isMatch =
      nodeAttrs.templateId === target.templateId &&
      nodeAttrs.mode === target.mode &&
      nodeAttrs.dataJson === target.dataJson &&
      nodeAttrs.rawHtml === target.rawHtml &&
      nodeAttrs.version === target.version &&
      nodeAttrs.restriction === target.restriction;

    if (isMatch) {
      const transaction = editor.state.tr.setSelection(NodeSelection.create(doc, position));
      editor.view.dispatch(transaction);
      return true;
    }

    position += node.nodeSize;
  }

  if (fallbackPosition == null) {
    return false;
  }

  const transaction = editor.state.tr.setSelection(NodeSelection.create(doc, fallbackPosition));
  editor.view.dispatch(transaction);
  return true;
}

function normalizeRepeaterItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      return { ...(entry as Record<string, unknown>) };
    })
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function buildRepeaterItemDefaults(field: ChunkRepeaterField, itemIndex: number, templateId: string): Record<string, unknown> {
  const nextItem: Record<string, unknown> = {};
  field.itemFields.forEach((itemField) => {
    if (itemField.type === "toggle") {
      nextItem[itemField.key] = false;
      return;
    }

    if (itemField.type === "select") {
      nextItem[itemField.key] = itemField.options[0]?.value ?? "";
      return;
    }

    if (itemField.type === "number") {
      nextItem[itemField.key] = String(itemField.min ?? 0);
      return;
    }

    if (itemField.type === "color") {
      nextItem[itemField.key] = "#ffffff";
      return;
    }

    if (itemField.type === "icon") {
      nextItem[itemField.key] = itemField.presets?.[0] ?? "";
      return;
    }

    if (itemField.key === "title") {
      nextItem[itemField.key] = `${field.itemLabel} ${itemIndex + 1}`;
      return;
    }

    if (itemField.key === "image") {
      nextItem[itemField.key] = `https://picsum.photos/seed/${templateId}-${itemIndex + 1}/1000/700`;
      return;
    }

    if (itemField.key === "link") {
      nextItem[itemField.key] = "https://example.com";
      return;
    }

    if (itemField.key === "value") {
      nextItem[itemField.key] = String((itemIndex + 1) * 12);
      return;
    }

    if (itemField.key === "tag") {
      nextItem[itemField.key] = "General";
      return;
    }

    nextItem[itemField.key] = "";
  });

  return nextItem;
}

function downloadFile(filename: string, value: string, mimeType: string) {
  const blob = new Blob([value], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveLineHeight(editor: Editor | null) {
  if (!editor) {
    return "";
  }

  return [
    String(editor.getAttributes("paragraph").lineHeight ?? ""),
    String(editor.getAttributes("heading").lineHeight ?? ""),
    String(editor.getAttributes("blockquote").lineHeight ?? ""),
  ].find((value) => value.trim().length > 0) ?? "";
}

function resolveSelectValue(value: string, options: readonly string[]) {
  const normalized = normalizeCssValue(value);
  if (!normalized) {
    return "";
  }

  const match = options.find((option) => normalizeCssValue(option) === normalized);
  return match ?? CUSTOM_SELECT_VALUE;
}

function normalizeCssValue(value: string) {
  return value
    .toLowerCase()
    .replaceAll('"', "")
    .replaceAll("'", "")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCssNumber(value: number) {
  const rounded = Number(value.toFixed(4));
  if (Object.is(rounded, -0)) {
    return "0";
  }

  return String(rounded);
}

function parseLengthValue(value: string, fallbackNumber: string, fallbackUnit: LengthUnit) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(-?\d*\.?\d+)(px|em|rem|%|pt|ch|vw|vh)$/);
  if (!match) {
    return { numberValue: fallbackNumber, unit: fallbackUnit };
  }

  return {
    numberValue: formatCssNumber(Number.parseFloat(match[1])),
    unit: match[2] as LengthUnit,
  };
}

function parseLineHeightValue(value: string, fallbackNumber: string) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(-?\d*\.?\d+)(px|em|rem|%)?$/);
  if (!match) {
    return { numberValue: fallbackNumber, unit: "unitless" as LineHeightUnit };
  }

  return {
    numberValue: formatCssNumber(Number.parseFloat(match[1])),
    unit: (match[2] as LineHeightUnit | undefined) ?? "unitless",
  };
}

function parseLengthDraft(numberValue: string, unit: LengthUnit, allowNegative: boolean) {
  if (!LENGTH_UNITS.includes(unit)) {
    return null;
  }

  const parsed = Number.parseFloat(numberValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (!allowNegative && parsed <= 0) {
    return null;
  }

  return `${formatCssNumber(parsed)}${unit}`;
}

function parseLineHeightDraft(numberValue: string, unit: LineHeightUnit) {
  if (!LINE_HEIGHT_UNITS.includes(unit)) {
    return null;
  }

  const parsed = Number.parseFloat(numberValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  const value = formatCssNumber(parsed);
  return unit === "unitless" ? value : `${value}${unit}`;
}

function parseFontWeightDraft(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["normal", "bold", "bolder", "lighter", "inherit", "initial", "unset"].includes(normalized)) {
    return normalized;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const numeric = Number.parseInt(normalized, 10);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 1000) {
    return null;
  }

  return String(numeric);
}

function resolveNumericFontWeight(value: string) {
  const normalized = value.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    const numeric = Number.parseInt(normalized, 10);
    if (Number.isFinite(numeric)) {
      return Math.max(1, Math.min(1000, numeric));
    }
  }

  if (normalized === "bold" || normalized === "bolder") {
    return 700;
  }

  if (normalized === "lighter") {
    return 300;
  }

  return 400;
}

function clampChannel(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}

function formatAlpha(value: number) {
  return clampAlpha(value).toFixed(2);
}

function toRgbaString(value: RgbaValue) {
  return `rgba(${clampChannel(value.r)}, ${clampChannel(value.g)}, ${clampChannel(value.b)}, ${formatAlpha(value.a)})`;
}

function toHexColor(value: RgbaValue) {
  return `#${[value.r, value.g, value.b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseCssColor(value: string, fallback: RgbaValue): RgbaValue {
  const normalized = value.trim();
  if (!normalized) {
    return { ...fallback };
  }

  const parsed = parseHexColor(normalized) ?? parseRgbColor(normalized) ?? probeCssColor(normalized);
  return parsed ?? { ...fallback };
}

function parseHexColor(value: string): RgbaValue | null {
  const normalized = value.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(normalized.length) || /[^0-9a-f]/i.test(normalized)) {
    return null;
  }

  const expanded =
    normalized.length === 3 || normalized.length === 4
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;

  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a: clampAlpha(a) };
}

function parseRgbColor(value: string): RgbaValue | null {
  const match = value.match(/^rgba?\((.+)\)$/i);
  if (!match) {
    return null;
  }

  const body = match[1].trim();
  let channels: string[] = [];
  let alpha = "1";

  if (body.includes("/")) {
    const [rgbPart, alphaPart] = body.split("/");
    channels = rgbPart.trim().split(/[,\s]+/).filter(Boolean);
    alpha = alphaPart.trim();
  } else if (body.includes(",")) {
    const parts = body.split(",").map((part) => part.trim());
    channels = parts.slice(0, 3);
    alpha = parts[3] ?? "1";
  } else {
    const parts = body.split(/\s+/).filter(Boolean);
    channels = parts.slice(0, 3);
    alpha = parts[3] ?? "1";
  }

  if (channels.length !== 3) {
    return null;
  }

  return {
    r: parseRgbChannel(channels[0]),
    g: parseRgbChannel(channels[1]),
    b: parseRgbChannel(channels[2]),
    a: parseAlphaChannel(alpha),
  };
}

function parseRgbChannel(value: string) {
  const normalized = value.trim();
  if (normalized.endsWith("%")) {
    return clampChannel((Number.parseFloat(normalized) / 100) * 255);
  }

  return clampChannel(Number.parseFloat(normalized));
}

function parseAlphaChannel(value: string) {
  const normalized = value.trim();
  if (normalized.endsWith("%")) {
    return clampAlpha(Number.parseFloat(normalized) / 100);
  }

  return clampAlpha(Number.parseFloat(normalized));
}

function probeCssColor(value: string): RgbaValue | null {
  if (typeof document === "undefined" || !document.body) {
    return null;
  }

  const probe = document.createElement("span");
  probe.style.color = value;
  if (!probe.style.color) {
    return null;
  }

  probe.style.position = "absolute";
  probe.style.left = "-9999px";
  document.body.append(probe);
  const parsed = parseRgbColor(window.getComputedStyle(probe).color);
  probe.remove();
  return parsed;
}
