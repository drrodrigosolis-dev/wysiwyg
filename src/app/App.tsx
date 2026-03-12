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
const WORKSPACE_INTENT_PREFS_KEY = "velvet-ink/workspace-intent/v1";
const SESSION_GOAL_PREFS_KEY = "velvet-ink/session-goal/v1";
const EDITOR_COACH_PREFS_KEY = "velvet-ink/editor-coach/v1";
const LEARNING_LANE_PREFS_KEY = "velvet-ink/learning-lane/v1";
const REVISION_CADENCE_PREFS_KEY = "velvet-ink/revision-cadence/v1";
const MODE_SCENE_PREFS_KEY = "velvet-ink/mode-scene/v1";
const MODE_STRATEGY_PREFS_KEY = "velvet-ink/mode-strategy/v1";
const MODE_RECOVERY_CUE_PREFS_KEY = "velvet-ink/mode-recovery-cue/v1";
const MODE_GUIDANCE_LANE_PREFS_KEY = "velvet-ink/mode-guidance-lane/v1";
const PULSE_LENS_PREFS_KEY = "velvet-ink/pulse-lens/v1";
const PULSE_TARGET_PREFS_KEY = "velvet-ink/pulse-target/v1";
const PULSE_COACH_PREFS_KEY = "velvet-ink/pulse-coach/v1";
const REVISION_FILTER_PREFS_KEY = "velvet-ink/revision-filter/v1";
const REVISION_DIFF_FOCUS_PREFS_KEY = "velvet-ink/revision-diff-focus/v1";
const REVISION_STRATEGY_PREFS_KEY = "velvet-ink/revision-strategy/v1";
const REVISION_DIFF_DEPTH_PREFS_KEY = "velvet-ink/revision-diff-depth/v1";
const MINIMAP_DEPTH_PREFS_KEY = "velvet-ink/minimap-depth/v1";
const MINIMAP_LABEL_PREFS_KEY = "velvet-ink/minimap-label/v1";
const MINIMAP_HIGHLIGHT_PREFS_KEY = "velvet-ink/minimap-highlight/v1";
const MINIMAP_STRATEGY_PREFS_KEY = "velvet-ink/minimap-strategy/v1";
const MINIMAP_JUMP_STRIDE_PREFS_KEY = "velvet-ink/minimap-jump-stride/v1";
const MINIMAP_COACH_LANE_PREFS_KEY = "velvet-ink/minimap-coach-lane/v1";
const FIND_STRATEGY_PREFS_KEY = "velvet-ink/find-strategy/v1";
const FIND_RECENT_PREFS_KEY = "velvet-ink/find-recent/v1";
const CHUNK_BUILD_STRATEGY_PREFS_KEY = "velvet-ink/chunk-build-strategy/v1";
const CHUNK_DELIVERY_MODE_PREFS_KEY = "velvet-ink/chunk-delivery-mode/v1";
const CHUNK_LAUNCH_PLAN_PREFS_KEY = "velvet-ink/chunk-launch-plan/v1";
const CHUNK_COACH_MODE_PREFS_KEY = "velvet-ink/chunk-coach-mode/v1";
const OUTLINE_STRATEGY_PREFS_KEY = "velvet-ink/outline-strategy/v1";
const OUTLINE_FOCUS_LENS_PREFS_KEY = "velvet-ink/outline-focus-lens/v1";
const OUTLINE_FOCUS_WINDOW_PREFS_KEY = "velvet-ink/outline-focus-window/v1";
const STYLE_READABILITY_PREFS_KEY = "velvet-ink/style-readability/v1";
const STYLE_LANE_PREFS_KEY = "velvet-ink/style-lane/v1";
const FIND_COACH_MODE_PREFS_KEY = "velvet-ink/find-coach-mode/v1";
const FIND_PREVIEW_LIMIT_PREFS_KEY = "velvet-ink/find-preview-limit/v1";
const REVISION_RESTORE_GUARD_PREFS_KEY = "velvet-ink/revision-restore-guard/v1";
const REVISION_TIMELINE_LENS_PREFS_KEY = "velvet-ink/revision-timeline-lens/v1";
const PANEL_FOCUS_PRESET_PREFS_KEY = "velvet-ink/panel-focus-preset/v1";
const SESSION_TEMPO_PREFS_KEY = "velvet-ink/session-tempo/v1";
const STYLE_ASSIST_PREFS_KEY = "velvet-ink/style-assist/v1";
const PULSE_INTERVENTION_PREFS_KEY = "velvet-ink/pulse-intervention/v1";
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
type PanelFocusPresetId = "balanced-overview" | "structure-sweep" | "revision-sprint";
type WorkspaceCoachPresetId = "starter-guided" | "hybrid-balanced" | "ship-review";
type WorkspaceIntentPresetId = "onboard-clarity" | "balanced-production" | "ship-readiness";
type SessionGoalPresetId = "draft-momentum" | "structure-tune" | "ship-check";
type EditorCoachPresetId = "learn-loop" | "steady-shift" | "ship-rigorous";
type LearningLaneId = "teach-me" | "steady-work" | "ship-fast";
type RevisionCadenceProfileId = "gentle" | "balanced" | "intensive";
type SessionTempoPresetId = "steady-atelier" | "focus-sprint" | "handoff-runway";
type ModeScenePresetId = "draft-sprint" | "deep-focus" | "review-sweep";
type ModeStrategyId = "momentum-lane" | "sprint-recovery" | "qa-rails";
type ModeRecoveryCue = "checkpoint-first" | "open-structure" | "focus-reset";
type ModeGuidanceLaneId = "orient-and-write" | "sustain-flow" | "handoff-guard";
type StyleRecipeId = "editorial" | "story" | "analysis" | "briefing";
type StylePersonaId = "clarity" | "narrative" | "contrast";
type StyleReadabilityTargetId = "scan-light" | "narrative-flow" | "dense-brief";
type StyleLaneId = "teach-clarity" | "steady-narrative" | "ship-contrast";
type StyleAssistPresetId = "clarify-lesson" | "narrative-flow" | "contrast-qa";
type ChunkIntentProfileId = "story" | "analysis" | "conversion";
type ChunkBuildStrategyId = "safe-lesson" | "interactive-lab" | "ship-ready";
type ChunkCoachMode = "learn-safe" | "balanced-flow" | "ship-control";
type ChunkDeliveryModeId = "lesson-safe" | "demo-live" | "publish-proof";
type ChunkLaunchPlanId = "selected-first" | "delivery-first" | "intent-lab";
type ReplaceTransform = "as-typed" | "lower" | "upper" | "title";
type FindStrategyId = "precision" | "sweep" | "normalize";
type FindCoachMode = "quick" | "guided" | "audit";
type FindPreviewLimit = 3 | 6 | 10;
type OutlineDepthFilter = "all" | "h1" | "h2" | "h3";
type OutlineJumpMode = "focus" | "focus-and-fold";
type OutlineStrategyId = "structure-scan" | "active-draft" | "reorder-pass";
type OutlineFocusLens = "all-visible" | "active-window" | "active-trail";
type OutlineFocusWindow = 1 | 2 | 3;
type MinimapDepthFilter = "all" | "h1-h2" | "h1";
type MinimapLabelMode = "full" | "compact" | "hidden";
type MinimapHighlightMode = "active" | "level";
type MinimapStrategyId = "context-ladder" | "fast-scan" | "ship-verifier";
type MinimapJumpStride = 1 | 2 | 3;
type MinimapCoachLaneId = "map-learn" | "scan-balance" | "audit-handoff";
type PulseLens = "flow" | "structure" | "delivery";
type PulseCadenceTarget = "calm" | "balanced" | "brisk";
type PulseCoachPresetId = "cadence-guard" | "structure-shape" | "release-readiness";
type PulseInterventionId = "stabilize-flow" | "rebalance-structure" | "prep-handoff";
type RevisionFilter = "all" | "checkpoint" | "autosave" | "restore";
type RevisionDiffFocus = "balanced" | "additions" | "deletions";
type RevisionStrategyId = "checkpoint-qa" | "growth-audit" | "trim-pass";
type RevisionDiffDepth = "tight" | "balanced" | "extended";
type RevisionRestoreGuard = "fast" | "confirm" | "diff-first";
type RevisionTimelineLens = "all" | "last-hour" | "latest-three";

const PANEL_SECTION_IDS = [
  "left-mode",
  "left-style-lab",
  "left-outline",
  "left-minimap",
  "right-document-pulse",
  "right-find-replace",
  "right-interaction-block",
  "right-revisions",
] as const;

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
const DEFAULT_TABLE_CELL_RGBA: RgbaValue = { r: 255, g: 255, b: 255, a: 1 };
const DEFAULT_TABLE_GRID_RGBA: RgbaValue = { r: 64, g: 44, b: 28, a: 0.2 };

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
const PANEL_FOCUS_PRESET_OPTIONS: Array<{
  id: PanelFocusPresetId;
  label: string;
  summary: string;
  tip: string;
  leftRail: boolean;
  rightRail: boolean;
  openPanels: string[];
}> = [
  {
    id: "balanced-overview",
    label: "Balanced overview",
    summary: "Keeps all sections open for mixed drafting and review visibility.",
    tip: "Use for day-to-day editing when you need equal structure and revision context.",
    leftRail: true,
    rightRail: true,
    openPanels: [...PANEL_SECTION_IDS],
  },
  {
    id: "structure-sweep",
    label: "Structure sweep",
    summary: "Prioritizes mode, style, outline, and minimap while keeping revision tools compact.",
    tip: "Use during hierarchy passes and sequencing audits.",
    leftRail: true,
    rightRail: true,
    openPanels: ["left-mode", "left-style-lab", "left-outline", "left-minimap", "right-document-pulse"],
  },
  {
    id: "revision-sprint",
    label: "Revision sprint",
    summary: "Expands revision and find surfaces while collapsing lower-priority drafting controls.",
    tip: "Use before export when diffing and focused cleanup dominate.",
    leftRail: false,
    rightRail: true,
    openPanels: ["right-document-pulse", "right-find-replace", "right-revisions"],
  },
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
const WORKSPACE_INTENT_OPTIONS: Array<{
  id: WorkspaceIntentPresetId;
  label: string;
  summary: string;
  tip: string;
  guidance: GuidanceLevel;
  density: InterfaceDensity;
  workflow: WorkflowTrack;
  navigation: NavigationProfile;
  panelFocus: PanelFocusPresetId;
  modeStrategy: ModeStrategyId;
  minimapStrategy: MinimapStrategyId;
  sessionTempo: SessionTempoPresetId;
}> = [
  {
    id: "onboard-clarity",
    label: "Onboard clarity",
    summary: "Teaching-forward setup with explicit cues and close-range navigation.",
    tip: "Use when learning a new draft or onboarding collaborators.",
    guidance: "guided",
    density: "comfort",
    workflow: "draft",
    navigation: "balanced",
    panelFocus: "balanced-overview",
    modeStrategy: "momentum-lane",
    minimapStrategy: "context-ladder",
    sessionTempo: "handoff-runway",
  },
  {
    id: "balanced-production",
    label: "Balanced production",
    summary: "General-purpose writing and revision flow with moderate coaching.",
    tip: "Use for most sessions where drafting and structure checks alternate.",
    guidance: "balanced",
    density: "balanced",
    workflow: "revise",
    navigation: "balanced",
    panelFocus: "structure-sweep",
    modeStrategy: "sprint-recovery",
    minimapStrategy: "fast-scan",
    sessionTempo: "steady-atelier",
  },
  {
    id: "ship-readiness",
    label: "Ship readiness",
    summary: "High-signal QA setup that prioritizes verification and handoff confidence.",
    tip: "Use before export for decisive structure and revision sweeps.",
    guidance: "expert",
    density: "compact",
    workflow: "publish",
    navigation: "survey",
    panelFocus: "revision-sprint",
    modeStrategy: "qa-rails",
    minimapStrategy: "ship-verifier",
    sessionTempo: "focus-sprint",
  },
];
const SESSION_GOAL_OPTIONS: Array<{
  id: SessionGoalPresetId;
  label: string;
  summary: string;
  tip: string;
  guidance: GuidanceLevel;
  workflow: WorkflowTrack;
  navigation: NavigationProfile;
  layout: WorkspaceLayoutPreset;
  modeScene: ModeScenePresetId;
  sideBySide: boolean;
  viewMode: ViewMode;
}> = [
  {
    id: "draft-momentum",
    label: "Draft momentum",
    summary: "Prioritizes writing flow while keeping light structural awareness visible.",
    tip: "Use at session start to maximize drafting speed.",
    guidance: "guided",
    workflow: "draft",
    navigation: "balanced",
    layout: "balanced",
    modeScene: "draft-sprint",
    sideBySide: false,
    viewMode: "rich",
  },
  {
    id: "structure-tune",
    label: "Structure tune",
    summary: "Balances drafting with hierarchy checks and revision visibility.",
    tip: "Use mid-session when refining flow and section order.",
    guidance: "balanced",
    workflow: "revise",
    navigation: "survey",
    layout: "panorama",
    modeScene: "review-sweep",
    sideBySide: true,
    viewMode: "rich",
  },
  {
    id: "ship-check",
    label: "Ship check",
    summary: "Compression-focused setup for final QA, diffs, and export confidence.",
    tip: "Use before export to run a final quality pass.",
    guidance: "expert",
    workflow: "publish",
    navigation: "survey",
    layout: "panorama",
    modeScene: "review-sweep",
    sideBySide: true,
    viewMode: "exportable",
  },
];
const EDITOR_COACH_OPTIONS: Array<{
  id: EditorCoachPresetId;
  label: string;
  summary: string;
  tip: string;
  guidance: GuidanceLevel;
  density: InterfaceDensity;
  workflow: WorkflowTrack;
  navigation: NavigationProfile;
  modeStrategy: ModeStrategyId;
  minimapStrategy: MinimapStrategyId;
}> = [
  {
    id: "learn-loop",
    label: "Learn loop",
    summary: "Teaching-forward structure with explicit coaching and slower navigation pacing.",
    tip: "Use when onboarding to this draft or learning a new editorial style.",
    guidance: "guided",
    density: "comfort",
    workflow: "draft",
    navigation: "balanced",
    modeStrategy: "momentum-lane",
    minimapStrategy: "context-ladder",
  },
  {
    id: "steady-shift",
    label: "Steady shift",
    summary: "Balanced coaching with flexible mode and minimap transitions.",
    tip: "Use for most day-to-day writing and revision sessions.",
    guidance: "balanced",
    density: "balanced",
    workflow: "revise",
    navigation: "balanced",
    modeStrategy: "sprint-recovery",
    minimapStrategy: "fast-scan",
  },
  {
    id: "ship-rigorous",
    label: "Ship rigorous",
    summary: "High-signal surface for final checks, navigation audits, and export confidence.",
    tip: "Use before final review or publish-ready export.",
    guidance: "expert",
    density: "compact",
    workflow: "publish",
    navigation: "survey",
    modeStrategy: "qa-rails",
    minimapStrategy: "ship-verifier",
  },
];
const LEARNING_LANE_OPTIONS: Array<{
  id: LearningLaneId;
  label: string;
  summary: string;
  tip: string;
  guidance: GuidanceLevel;
  density: InterfaceDensity;
  workflow: WorkflowTrack;
  navigation: NavigationProfile;
  stylePersona: StylePersonaId;
  chunkDeliveryMode: ChunkDeliveryModeId;
}> = [
  {
    id: "teach-me",
    label: "Teach me",
    summary: "High-guidance lane that favors explainability and safer interactive defaults.",
    tip: "Use when onboarding new collaborators or introducing complex chunks.",
    guidance: "guided",
    density: "comfort",
    workflow: "draft",
    navigation: "balanced",
    stylePersona: "clarity",
    chunkDeliveryMode: "lesson-safe",
  },
  {
    id: "steady-work",
    label: "Steady work",
    summary: "Balanced lane for sustained drafting with mixed exploration and review.",
    tip: "Use as your default lane for iterative writing sessions.",
    guidance: "balanced",
    density: "balanced",
    workflow: "revise",
    navigation: "balanced",
    stylePersona: "narrative",
    chunkDeliveryMode: "demo-live",
  },
  {
    id: "ship-fast",
    label: "Ship fast",
    summary: "Low-friction lane for final checks, concise visuals, and reliable chunk output.",
    tip: "Use right before export or handoff windows.",
    guidance: "expert",
    density: "compact",
    workflow: "publish",
    navigation: "survey",
    stylePersona: "contrast",
    chunkDeliveryMode: "publish-proof",
  },
];
const REVISION_CADENCE_OPTIONS: Array<{
  id: RevisionCadenceProfileId;
  label: string;
  summary: string;
  idleMs: number;
  structureMs: number;
}> = [
  {
    id: "gentle",
    label: "Gentle",
    summary: "Longer idle windows with calmer autosnapshot cadence.",
    idleMs: 180_000,
    structureMs: 1_400,
  },
  {
    id: "balanced",
    label: "Balanced",
    summary: "Default snapshot rhythm for mixed drafting and revisions.",
    idleMs: 90_000,
    structureMs: 800,
  },
  {
    id: "intensive",
    label: "Intensive",
    summary: "Faster autosnapshot cadence for high-risk, high-change sessions.",
    idleMs: 45_000,
    structureMs: 500,
  },
];
const SESSION_TEMPO_OPTIONS: Array<{
  id: SessionTempoPresetId;
  label: string;
  summary: string;
  tip: string;
  guidance: GuidanceLevel;
  density: InterfaceDensity;
  cadence: RevisionCadenceProfileId;
  workflow: WorkflowTrack;
}> = [
  {
    id: "steady-atelier",
    label: "Steady atelier",
    summary: "Calmer drafting tempo with balanced coaching and revision cadence.",
    tip: "Use during long writing blocks where consistency matters more than speed.",
    guidance: "balanced",
    density: "balanced",
    cadence: "balanced",
    workflow: "draft",
  },
  {
    id: "focus-sprint",
    label: "Focus sprint",
    summary: "Compact, high-signal tempo for short bursts and rapid structure checks.",
    tip: "Use for 20-40 minute pushes when quick iteration and dense cues help.",
    guidance: "expert",
    density: "compact",
    cadence: "intensive",
    workflow: "revise",
  },
  {
    id: "handoff-runway",
    label: "Handoff runway",
    summary: "Review-oriented tempo that keeps coaching explicit before final delivery.",
    tip: "Use near handoff to preserve context while tightening final quality signals.",
    guidance: "guided",
    density: "comfort",
    cadence: "gentle",
    workflow: "publish",
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
const MODE_STRATEGY_OPTIONS: Array<{
  id: ModeStrategyId;
  label: string;
  summary: string;
  tip: string;
  scene: ModeScenePresetId;
  focus: boolean;
  typewriter: boolean;
  leftRail: boolean;
  rightRail: boolean;
  navigation: NavigationProfile;
}> = [
  {
    id: "momentum-lane",
    label: "Momentum lane",
    summary: "Keeps writing flow steady with single-rail structure support.",
    tip: "Great for early drafting blocks and story-first sessions.",
    scene: "draft-sprint",
    focus: false,
    typewriter: true,
    leftRail: true,
    rightRail: false,
    navigation: "balanced",
  },
  {
    id: "sprint-recovery",
    label: "Sprint recovery",
    summary: "Transitions between deep focus and quick structure checks.",
    tip: "Use after dense drafting to recover context without losing pace.",
    scene: "deep-focus",
    focus: true,
    typewriter: true,
    leftRail: true,
    rightRail: false,
    navigation: "immersive",
  },
  {
    id: "qa-rails",
    label: "QA rails",
    summary: "Opens both rails for structure sweeps and revision checkpoints.",
    tip: "Use before handoff when section ordering and diff confidence matter.",
    scene: "review-sweep",
    focus: false,
    typewriter: false,
    leftRail: true,
    rightRail: true,
    navigation: "survey",
  },
];
const MODE_RECOVERY_CUE_OPTIONS: Array<{ value: ModeRecoveryCue; label: string; tip: string }> = [
  {
    value: "checkpoint-first",
    label: "Checkpoint first",
    tip: "Capture a manual snapshot before changing scene or rail state.",
  },
  {
    value: "open-structure",
    label: "Open structure",
    tip: "Reveal left rail plus survey minimap defaults for quick orientation.",
  },
  {
    value: "focus-reset",
    label: "Focus reset",
    tip: "Return to deep-focus defaults when cadence or concentration drops.",
  },
];
const MODE_GUIDANCE_LANE_OPTIONS: Array<{
  id: ModeGuidanceLaneId;
  label: string;
  summary: string;
  tip: string;
  strategy: ModeStrategyId;
  scene: ModeScenePresetId;
  recoveryCue: ModeRecoveryCue;
}> = [
  {
    id: "orient-and-write",
    label: "Orient + write",
    summary: "Keeps context visible while preserving drafting momentum.",
    tip: "Best when starting a section and confirming structure as you go.",
    strategy: "momentum-lane",
    scene: "draft-sprint",
    recoveryCue: "open-structure",
  },
  {
    id: "sustain-flow",
    label: "Sustain flow",
    summary: "Leans into concentration with a quick recovery path when cadence slips.",
    tip: "Use for medium-length drafting blocks with occasional context checks.",
    strategy: "sprint-recovery",
    scene: "deep-focus",
    recoveryCue: "focus-reset",
  },
  {
    id: "handoff-guard",
    label: "Handoff guard",
    summary: "Biases toward review and checkpoint-first transitions before final edits.",
    tip: "Use near handoff to avoid late-stage regressions.",
    strategy: "qa-rails",
    scene: "review-sweep",
    recoveryCue: "checkpoint-first",
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
const MINIMAP_STRATEGY_OPTIONS: Array<{
  id: MinimapStrategyId;
  label: string;
  summary: string;
  tip: string;
  depth: MinimapDepthFilter;
  labels: MinimapLabelMode;
  highlight: MinimapHighlightMode;
  jumpStride: MinimapJumpStride;
}> = [
  {
    id: "context-ladder",
    label: "Context ladder",
    summary: "Full labels and active highlighting for orientation-heavy drafting.",
    tip: "Best when onboarding a long document or mentoring collaborators.",
    depth: "all",
    labels: "full",
    highlight: "active",
    jumpStride: 1,
  },
  {
    id: "fast-scan",
    label: "Fast scan",
    summary: "Compact skyline for brisk section hopping across long drafts.",
    tip: "Use when searching for problem areas or repeated section patterns.",
    depth: "h1-h2",
    labels: "compact",
    highlight: "level",
    jumpStride: 2,
  },
  {
    id: "ship-verifier",
    label: "Ship verifier",
    summary: "Top-level map with broad jumps for release-readiness sweeps.",
    tip: "Use during final QA when only major sections need validation.",
    depth: "h1",
    labels: "hidden",
    highlight: "level",
    jumpStride: 3,
  },
];
const MINIMAP_JUMP_STRIDE_OPTIONS: Array<{ value: MinimapJumpStride; label: string }> = [
  { value: 1, label: "Single" },
  { value: 2, label: "Double" },
  { value: 3, label: "Triple" },
];
const MINIMAP_COACH_LANE_OPTIONS: Array<{
  id: MinimapCoachLaneId;
  label: string;
  summary: string;
  tip: string;
  strategy: MinimapStrategyId;
  depth: MinimapDepthFilter;
  labels: MinimapLabelMode;
  highlight: MinimapHighlightMode;
  jumpStride: MinimapJumpStride;
}> = [
  {
    id: "map-learn",
    label: "Map learn",
    summary: "Rich labels and active focus for orientation-first editing.",
    tip: "Use when learning document structure or teaching collaborators.",
    strategy: "context-ladder",
    depth: "all",
    labels: "full",
    highlight: "active",
    jumpStride: 1,
  },
  {
    id: "scan-balance",
    label: "Scan balance",
    summary: "Balanced navigation for fast scans without losing hierarchy context.",
    tip: "Use for routine section sweeps during active drafting.",
    strategy: "fast-scan",
    depth: "h1-h2",
    labels: "compact",
    highlight: "level",
    jumpStride: 2,
  },
  {
    id: "audit-handoff",
    label: "Audit handoff",
    summary: "Top-level verification lane for final review and handoff passes.",
    tip: "Use before export to validate major section coverage quickly.",
    strategy: "ship-verifier",
    depth: "h1",
    labels: "hidden",
    highlight: "level",
    jumpStride: 3,
  },
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
const PULSE_COACH_OPTIONS: Array<{
  id: PulseCoachPresetId;
  label: string;
  summary: string;
  tip: string;
  lens: PulseLens;
  target: PulseCadenceTarget;
}> = [
  {
    id: "cadence-guard",
    label: "Cadence guard",
    summary: "Tracks rhythm stability and sentence pacing while drafting.",
    tip: "Use during long drafting sessions to avoid pace drift.",
    lens: "flow",
    target: "balanced",
  },
  {
    id: "structure-shape",
    label: "Structure shape",
    summary: "Emphasizes heading and paragraph density for scannability.",
    tip: "Use when reorganizing sections or tightening hierarchy.",
    lens: "structure",
    target: "calm",
  },
  {
    id: "release-readiness",
    label: "Release readiness",
    summary: "Pairs cadence and revision freshness for final delivery checks.",
    tip: "Use before publishing to confirm stable delivery posture.",
    lens: "delivery",
    target: "brisk",
  },
];
const PULSE_INTERVENTION_OPTIONS: Array<{
  id: PulseInterventionId;
  label: string;
  summary: string;
  tip: string;
  lens: PulseLens;
  target: PulseCadenceTarget;
  coach: PulseCoachPresetId;
  cadence: RevisionCadenceProfileId;
  timeline: RevisionTimelineLens;
}> = [
  {
    id: "stabilize-flow",
    label: "Stabilize flow",
    summary: "Rein in pacing drift with flow-focused guidance and tighter checkpoints.",
    tip: "Run this when cadence volatility rises and paragraph rhythm feels uneven.",
    lens: "flow",
    target: "balanced",
    coach: "cadence-guard",
    cadence: "intensive",
    timeline: "last-hour",
  },
  {
    id: "rebalance-structure",
    label: "Rebalance structure",
    summary: "Re-anchor heading and paragraph density during hierarchy revisions.",
    tip: "Run this when sections feel dense or outline depth drift increases.",
    lens: "structure",
    target: "calm",
    coach: "structure-shape",
    cadence: "balanced",
    timeline: "all",
  },
  {
    id: "prep-handoff",
    label: "Prep handoff",
    summary: "Shift to delivery-readiness checks with a handoff-safe cadence.",
    tip: "Run this before share/export windows to verify momentum and revision freshness.",
    lens: "delivery",
    target: "brisk",
    coach: "release-readiness",
    cadence: "gentle",
    timeline: "latest-three",
  },
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
const REVISION_STRATEGY_OPTIONS: Array<{
  id: RevisionStrategyId;
  label: string;
  summary: string;
  tip: string;
  filter: RevisionFilter;
  focus: RevisionDiffFocus;
  depth: RevisionDiffDepth;
}> = [
  {
    id: "checkpoint-qa",
    label: "Checkpoint QA",
    summary: "Audits intentional checkpoints with balanced change review.",
    tip: "Use after milestone edits to validate direction changes.",
    filter: "checkpoint",
    focus: "balanced",
    depth: "balanced",
  },
  {
    id: "growth-audit",
    label: "Growth audit",
    summary: "Focuses on inserted material to confirm net value.",
    tip: "Use when expansions may have increased complexity.",
    filter: "all",
    focus: "additions",
    depth: "extended",
  },
  {
    id: "trim-pass",
    label: "Trim pass",
    summary: "Highlights deletions to protect intent while compressing copy.",
    tip: "Use late-stage editing when reducing length aggressively.",
    filter: "all",
    focus: "deletions",
    depth: "tight",
  },
];
const REVISION_DIFF_DEPTH_OPTIONS: Array<{ label: string; value: RevisionDiffDepth; limit: number }> = [
  { label: "Tight", value: "tight", limit: 8 },
  { label: "Balanced", value: "balanced", limit: 16 },
  { label: "Extended", value: "extended", limit: 24 },
];
const REVISION_RESTORE_GUARD_OPTIONS: Array<{ label: string; value: RevisionRestoreGuard; tip: string }> = [
  { label: "Fast", value: "fast", tip: "Restore immediately from timeline actions." },
  { label: "Confirm", value: "confirm", tip: "Require a second click on the same snapshot before restore." },
  { label: "Diff first", value: "diff-first", tip: "Select snapshot and inspect diff before restore is enabled." },
];
const REVISION_TIMELINE_LENS_OPTIONS: Array<{ label: string; value: RevisionTimelineLens; tip: string }> = [
  { label: "All", value: "all", tip: "Show full history for broad trend checks." },
  { label: "Last hour", value: "last-hour", tip: "Narrow to recent sessions for fast recovery choices." },
  { label: "Latest 3", value: "latest-three", tip: "Keep a compact triage list for rapid checkpoint review." },
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
const FIND_COACH_MODE_OPTIONS: Array<{ label: string; value: FindCoachMode; tip: string }> = [
  { label: "Quick", value: "quick", tip: "Lean view for fast term hops and lightweight cleanups." },
  { label: "Guided", value: "guided", tip: "Balanced previews with replacement coaching before bulk actions." },
  { label: "Audit", value: "audit", tip: "Expanded context for high-risk replace-all passes." },
];
const FIND_PREVIEW_LIMIT_OPTIONS: Array<{ label: string; value: FindPreviewLimit }> = [
  { label: "3 rows", value: 3 },
  { label: "6 rows", value: 6 },
  { label: "10 rows", value: 10 },
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
const OUTLINE_FOCUS_LENS_OPTIONS: Array<{ label: string; value: OutlineFocusLens; tip: string }> = [
  { label: "All visible", value: "all-visible", tip: "Keep every filtered heading visible for broad structure sweeps." },
  { label: "Active window", value: "active-window", tip: "Show only a radius around the active section while drafting." },
  { label: "Active trail", value: "active-trail", tip: "Keep ancestor headings visible to preserve hierarchy context." },
];
const OUTLINE_FOCUS_WINDOW_OPTIONS: Array<{ label: string; value: OutlineFocusWindow }> = [
  { label: "±1", value: 1 },
  { label: "±2", value: 2 },
  { label: "±3", value: 3 },
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
const STYLE_READABILITY_TARGET_OPTIONS: Array<{
  id: StyleReadabilityTargetId;
  label: string;
  summary: string;
  tip: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: string;
}> = [
  {
    id: "scan-light",
    label: "Scan light",
    summary: "Higher readability for long sections and instructional walkthroughs.",
    tip: "Best for documents read on mixed desktop/mobile contexts.",
    fontSize: "1.08rem",
    lineHeight: "1.82",
    letterSpacing: "0.005em",
    fontWeight: "450",
  },
  {
    id: "narrative-flow",
    label: "Narrative flow",
    summary: "Softer rhythm for storytelling, interviews, and reflective copy.",
    tip: "Use when paragraph flow and tone carry more weight than density.",
    fontSize: "1.05rem",
    lineHeight: "1.94",
    letterSpacing: "0.01em",
    fontWeight: "400",
  },
  {
    id: "dense-brief",
    label: "Dense brief",
    summary: "Compact cadence for checklists, reviews, and executive skim passes.",
    tip: "Use for shipping passes where brevity and scannability dominate.",
    fontSize: "0.96rem",
    lineHeight: "1.48",
    letterSpacing: "0.02em",
    fontWeight: "550",
  },
];
const STYLE_LANE_OPTIONS: Array<{
  id: StyleLaneId;
  label: string;
  summary: string;
  tip: string;
  recipe: StyleRecipeId;
  persona: StylePersonaId;
  readability: StyleReadabilityTargetId;
}> = [
  {
    id: "teach-clarity",
    label: "Teach clarity",
    summary: "Instruction-friendly defaults with high scan stability.",
    tip: "Use for onboarding copy and how-to sections with mixed expertise readers.",
    recipe: "editorial",
    persona: "clarity",
    readability: "scan-light",
  },
  {
    id: "steady-narrative",
    label: "Steady narrative",
    summary: "Balanced rhythm for flow-heavy drafts and revisions.",
    tip: "Use during sustained drafting blocks where tone and continuity matter most.",
    recipe: "story",
    persona: "narrative",
    readability: "narrative-flow",
  },
  {
    id: "ship-contrast",
    label: "Ship contrast",
    summary: "Compact high-signal style lane for final pass clarity.",
    tip: "Use near export to tighten contrast and improve skim speed.",
    recipe: "briefing",
    persona: "contrast",
    readability: "dense-brief",
  },
];
const STYLE_ASSIST_OPTIONS: Array<{
  id: StyleAssistPresetId;
  label: string;
  summary: string;
  tip: string;
  lane: StyleLaneId;
  recipe: StyleRecipeId;
  persona: StylePersonaId;
  readability: StyleReadabilityTargetId;
}> = [
  {
    id: "clarify-lesson",
    label: "Clarify lesson",
    summary: "Emphasizes instructional clarity and stable readability rhythm.",
    tip: "Use when your audience is mixed-experience and scan confidence is critical.",
    lane: "teach-clarity",
    recipe: "editorial",
    persona: "clarity",
    readability: "scan-light",
  },
  {
    id: "narrative-flow",
    label: "Narrative flow",
    summary: "Balances warmth and rhythm for longform continuity.",
    tip: "Use for chapters and case studies where voice continuity beats density.",
    lane: "steady-narrative",
    recipe: "story",
    persona: "narrative",
    readability: "narrative-flow",
  },
  {
    id: "contrast-qa",
    label: "Contrast QA",
    summary: "Tightens hierarchy and contrast for final skim checks.",
    tip: "Use right before export to keep key decisions visually unmistakable.",
    lane: "ship-contrast",
    recipe: "briefing",
    persona: "contrast",
    readability: "dense-brief",
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
const CHUNK_DELIVERY_MODE_OPTIONS: Array<{
  id: ChunkDeliveryModeId;
  label: string;
  summary: string;
  tip: string;
  intentProfileId: ChunkIntentProfileId;
  engine: ChunkTemplateEngine;
  layout: ChunkBuilderLayoutMode;
  density: ChunkBuilderDensityMode;
}> = [
  {
    id: "lesson-safe",
    label: "Lesson safe",
    summary: "Runtime-light delivery for dependable learning blocks and compatibility confidence.",
    tip: "Prefer this when broad environment support matters most.",
    intentProfileId: "analysis",
    engine: "html",
    layout: "tools-top",
    density: "balanced",
  },
  {
    id: "demo-live",
    label: "Demo live",
    summary: "Interactive delivery tuned for guided demos and richer feedback loops.",
    tip: "Use for workshop-style chunks where immediate response is valuable.",
    intentProfileId: "story",
    engine: "javascript",
    layout: "split",
    density: "dense",
  },
  {
    id: "publish-proof",
    label: "Publish proof",
    summary: "Conversion-ready setup with concise controls and predictable rendering.",
    tip: "Use in final review when speed and reliability are both required.",
    intentProfileId: "conversion",
    engine: "html",
    layout: "stacked",
    density: "spacious",
  },
];
const CHUNK_LAUNCH_PLAN_OPTIONS: Array<{
  id: ChunkLaunchPlanId;
  label: string;
  summary: string;
  tip: string;
}> = [
  {
    id: "selected-first",
    label: "Selected first",
    summary: "Edit the currently selected chunk when available, otherwise start fresh.",
    tip: "Use during iterative edits to preserve context while still supporting quick inserts.",
  },
  {
    id: "delivery-first",
    label: "Delivery first",
    summary: "Open builder with the active delivery mode recommendation every time.",
    tip: "Use when compatibility and output guarantees are the primary concern.",
  },
  {
    id: "intent-lab",
    label: "Intent lab",
    summary: "Open builder from the selected intent profile and keep discovery broad.",
    tip: "Use when exploring template concepts before committing to a delivery mode.",
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
const CHUNK_COACH_MODE_OPTIONS: Array<{
  id: ChunkCoachMode;
  label: string;
  summary: string;
  tip: string;
  buildStrategy: ChunkBuildStrategyId;
  deliveryMode: ChunkDeliveryModeId;
  launchPlan: ChunkLaunchPlanId;
}> = [
  {
    id: "learn-safe",
    label: "Learn safe",
    summary: "Biases toward stable HTML templates and coaching-rich launch defaults.",
    tip: "Use for teaching-forward chunks and compatibility-first delivery.",
    buildStrategy: "safe-lesson",
    deliveryMode: "lesson-safe",
    launchPlan: "delivery-first",
  },
  {
    id: "balanced-flow",
    label: "Balanced flow",
    summary: "Keeps interactive power while preserving predictable review checkpoints.",
    tip: "Use for mixed drafting and demo passes with moderate guardrails.",
    buildStrategy: "interactive-lab",
    deliveryMode: "demo-live",
    launchPlan: "selected-first",
  },
  {
    id: "ship-control",
    label: "Ship control",
    summary: "Tightens launch discipline for final QA and publish-ready chunk output.",
    tip: "Use near handoff when speed and consistency both matter.",
    buildStrategy: "ship-ready",
    deliveryMode: "publish-proof",
    launchPlan: "delivery-first",
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
  const [workspaceIntentPresetId, setWorkspaceIntentPresetId] = useState<WorkspaceIntentPresetId>(() =>
    readWorkspaceIntentPreference(),
  );
  const [panelFocusPresetId, setPanelFocusPresetId] = useState<PanelFocusPresetId>(() => readPanelFocusPresetPreference());
  const [workspaceCoachPresetId, setWorkspaceCoachPresetId] = useState<WorkspaceCoachPresetId>(() =>
    readWorkspaceCoachPreference(),
  );
  const [sessionGoalPresetId, setSessionGoalPresetId] = useState<SessionGoalPresetId>(() => readSessionGoalPreference());
  const [editorCoachPresetId, setEditorCoachPresetId] = useState<EditorCoachPresetId>(() => readEditorCoachPreference());
  const [learningLaneId, setLearningLaneId] = useState<LearningLaneId>(() => readLearningLanePreference());
  const [revisionCadenceProfileId, setRevisionCadenceProfileId] = useState<RevisionCadenceProfileId>(() =>
    readRevisionCadencePreference(),
  );
  const [sessionTempoPresetId, setSessionTempoPresetId] = useState<SessionTempoPresetId>(() => readSessionTempoPreference());
  const [modeScenePresetId, setModeScenePresetId] = useState<ModeScenePresetId>(() => readModeScenePreference());
  const [modeStrategyId, setModeStrategyId] = useState<ModeStrategyId>(() => readModeStrategyPreference());
  const [modeRecoveryCue, setModeRecoveryCue] = useState<ModeRecoveryCue>(() => readModeRecoveryCuePreference());
  const [modeGuidanceLaneId, setModeGuidanceLaneId] = useState<ModeGuidanceLaneId>(() => readModeGuidanceLanePreference());
  const [styleRecipeId, setStyleRecipeId] = useState<StyleRecipeId>("editorial");
  const [stylePersonaId, setStylePersonaId] = useState<StylePersonaId>("clarity");
  const [styleReadabilityTargetId, setStyleReadabilityTargetId] = useState<StyleReadabilityTargetId>(() =>
    readStyleReadabilityPreference(),
  );
  const [styleLaneId, setStyleLaneId] = useState<StyleLaneId>(() => readStyleLanePreference());
  const [styleAssistPresetId, setStyleAssistPresetId] = useState<StyleAssistPresetId>(() => readStyleAssistPreference());
  const [chunkIntentProfileId, setChunkIntentProfileId] = useState<ChunkIntentProfileId>("analysis");
  const [chunkDeliveryModeId, setChunkDeliveryModeId] = useState<ChunkDeliveryModeId>(() => readChunkDeliveryModePreference());
  const [chunkLaunchPlanId, setChunkLaunchPlanId] = useState<ChunkLaunchPlanId>(() => readChunkLaunchPlanPreference());
  const [chunkBuildStrategyId, setChunkBuildStrategyId] = useState<ChunkBuildStrategyId>(() =>
    readChunkBuildStrategyPreference(),
  );
  const [chunkCoachMode, setChunkCoachMode] = useState<ChunkCoachMode>(() => readChunkCoachModePreference());
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [findWholeWord, setFindWholeWord] = useState(false);
  const [replaceTransform, setReplaceTransform] = useState<ReplaceTransform>("as-typed");
  const [findStrategyId, setFindStrategyId] = useState<FindStrategyId>(() => readFindStrategyPreference());
  const [findCoachMode, setFindCoachMode] = useState<FindCoachMode>(() => readFindCoachModePreference());
  const [findPreviewLimit, setFindPreviewLimit] = useState<FindPreviewLimit>(() => readFindPreviewLimitPreference());
  const [recentFindQueries, setRecentFindQueries] = useState<string[]>(() => readRecentFindQueriesPreference());
  const [outlineDepthFilter, setOutlineDepthFilter] = useState<OutlineDepthFilter>("all");
  const [outlineActiveOnly, setOutlineActiveOnly] = useState(false);
  const [outlineJumpMode, setOutlineJumpMode] = useState<OutlineJumpMode>("focus");
  const [outlineStrategyId, setOutlineStrategyId] = useState<OutlineStrategyId>(() => readOutlineStrategyPreference());
  const [outlineFocusLens, setOutlineFocusLens] = useState<OutlineFocusLens>(() => readOutlineFocusLensPreference());
  const [outlineFocusWindow, setOutlineFocusWindow] = useState<OutlineFocusWindow>(() => readOutlineFocusWindowPreference());
  const [minimapDepthFilter, setMinimapDepthFilter] = useState<MinimapDepthFilter>(() => readMinimapDepthPreference());
  const [minimapLabelMode, setMinimapLabelMode] = useState<MinimapLabelMode>(() => readMinimapLabelPreference());
  const [minimapHighlightMode, setMinimapHighlightMode] = useState<MinimapHighlightMode>(() =>
    readMinimapHighlightPreference(),
  );
  const [minimapStrategyId, setMinimapStrategyId] = useState<MinimapStrategyId>(() => readMinimapStrategyPreference());
  const [minimapJumpStride, setMinimapJumpStride] = useState<MinimapJumpStride>(() => readMinimapJumpStridePreference());
  const [minimapCoachLaneId, setMinimapCoachLaneId] = useState<MinimapCoachLaneId>(() => readMinimapCoachLanePreference());
  const [pulseLens, setPulseLens] = useState<PulseLens>(() => readPulseLensPreference());
  const [pulseCadenceTarget, setPulseCadenceTarget] = useState<PulseCadenceTarget>(() => readPulseTargetPreference());
  const [pulseCoachPresetId, setPulseCoachPresetId] = useState<PulseCoachPresetId>(() => readPulseCoachPreference());
  const [pulseInterventionId, setPulseInterventionId] = useState<PulseInterventionId>(() => readPulseInterventionPreference());
  const [revisionFilter, setRevisionFilter] = useState<RevisionFilter>(() => readRevisionFilterPreference());
  const [revisionDiffFocus, setRevisionDiffFocus] = useState<RevisionDiffFocus>(() => readRevisionDiffFocusPreference());
  const [revisionStrategyId, setRevisionStrategyId] = useState<RevisionStrategyId>(() => readRevisionStrategyPreference());
  const [revisionDiffDepth, setRevisionDiffDepth] = useState<RevisionDiffDepth>(() => readRevisionDiffDepthPreference());
  const [revisionRestoreGuard, setRevisionRestoreGuard] = useState<RevisionRestoreGuard>(() => readRevisionRestoreGuardPreference());
  const [revisionTimelineLens, setRevisionTimelineLens] = useState<RevisionTimelineLens>(() => readRevisionTimelineLensPreference());
  const [pendingRestoreSnapshotId, setPendingRestoreSnapshotId] = useState<string | null>(null);
  const [textColorRgba, setTextColorRgba] = useState<RgbaValue>(DEFAULT_TEXT_RGBA);
  const [highlightRgba, setHighlightRgba] = useState<RgbaValue>(DEFAULT_HIGHLIGHT_RGBA);
  const [blockBackgroundRgba, setBlockBackgroundRgba] = useState<RgbaValue>(DEFAULT_BLOCK_RGBA);
  const [tableCellBackgroundRgba, setTableCellBackgroundRgba] = useState<RgbaValue>(DEFAULT_TABLE_CELL_RGBA);
  const [tableGridRgba, setTableGridRgba] = useState<RgbaValue>(DEFAULT_TABLE_GRID_RGBA);
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

  const activeRevisionCadence =
    REVISION_CADENCE_OPTIONS.find((option) => option.id === revisionCadenceProfileId) ?? REVISION_CADENCE_OPTIONS[1];

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
      }, activeRevisionCadence.idleMs);

      if (signature !== latestStructureSignatureRef.current) {
        latestStructureSignatureRef.current = signature;
        window.clearTimeout(structureSnapshotTimerRef.current ?? undefined);
        structureSnapshotTimerRef.current = window.setTimeout(() => {
          if (signature !== lastSnapshotSignatureRef.current) {
            void createRevision(nextEditor, "autosave");
          }
        }, activeRevisionCadence.structureMs);
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
  }, [activeRevisionCadence.idleMs, activeRevisionCadence.structureMs]);

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
    writeWorkspaceIntentPreference(workspaceIntentPresetId);
  }, [workspaceIntentPresetId]);

  useEffect(() => {
    writePanelFocusPresetPreference(panelFocusPresetId);
  }, [panelFocusPresetId]);

  useEffect(() => {
    writeWorkspaceCoachPreference(workspaceCoachPresetId);
  }, [workspaceCoachPresetId]);

  useEffect(() => {
    writeSessionGoalPreference(sessionGoalPresetId);
  }, [sessionGoalPresetId]);

  useEffect(() => {
    writeEditorCoachPreference(editorCoachPresetId);
  }, [editorCoachPresetId]);

  useEffect(() => {
    writeLearningLanePreference(learningLaneId);
  }, [learningLaneId]);

  useEffect(() => {
    writeRevisionCadencePreference(revisionCadenceProfileId);
  }, [revisionCadenceProfileId]);

  useEffect(() => {
    writeSessionTempoPreference(sessionTempoPresetId);
  }, [sessionTempoPresetId]);

  useEffect(() => {
    writeModeScenePreference(modeScenePresetId);
  }, [modeScenePresetId]);

  useEffect(() => {
    writeModeStrategyPreference(modeStrategyId);
  }, [modeStrategyId]);

  useEffect(() => {
    writeModeRecoveryCuePreference(modeRecoveryCue);
  }, [modeRecoveryCue]);

  useEffect(() => {
    writeModeGuidanceLanePreference(modeGuidanceLaneId);
  }, [modeGuidanceLaneId]);

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
    writeMinimapStrategyPreference(minimapStrategyId);
  }, [minimapStrategyId]);

  useEffect(() => {
    writeMinimapJumpStridePreference(minimapJumpStride);
  }, [minimapJumpStride]);

  useEffect(() => {
    writeMinimapCoachLanePreference(minimapCoachLaneId);
  }, [minimapCoachLaneId]);

  useEffect(() => {
    writePulseLensPreference(pulseLens);
  }, [pulseLens]);

  useEffect(() => {
    writePulseTargetPreference(pulseCadenceTarget);
  }, [pulseCadenceTarget]);

  useEffect(() => {
    writePulseCoachPreference(pulseCoachPresetId);
  }, [pulseCoachPresetId]);

  useEffect(() => {
    writePulseInterventionPreference(pulseInterventionId);
  }, [pulseInterventionId]);

  useEffect(() => {
    writeRevisionFilterPreference(revisionFilter);
  }, [revisionFilter]);

  useEffect(() => {
    writeRevisionDiffFocusPreference(revisionDiffFocus);
  }, [revisionDiffFocus]);

  useEffect(() => {
    writeRevisionStrategyPreference(revisionStrategyId);
  }, [revisionStrategyId]);

  useEffect(() => {
    writeRevisionDiffDepthPreference(revisionDiffDepth);
  }, [revisionDiffDepth]);

  useEffect(() => {
    writeRevisionRestoreGuardPreference(revisionRestoreGuard);
  }, [revisionRestoreGuard]);

  useEffect(() => {
    writeRevisionTimelineLensPreference(revisionTimelineLens);
  }, [revisionTimelineLens]);

  useEffect(() => {
    setPendingRestoreSnapshotId(null);
  }, [revisionFilter, revisionTimelineLens, revisionDiffFocus]);

  useEffect(() => {
    writeFindStrategyPreference(findStrategyId);
  }, [findStrategyId]);

  useEffect(() => {
    writeFindCoachModePreference(findCoachMode);
  }, [findCoachMode]);

  useEffect(() => {
    writeFindPreviewLimitPreference(findPreviewLimit);
  }, [findPreviewLimit]);

  useEffect(() => {
    writeRecentFindQueriesPreference(recentFindQueries);
  }, [recentFindQueries]);

  useEffect(() => {
    writeChunkBuildStrategyPreference(chunkBuildStrategyId);
  }, [chunkBuildStrategyId]);

  useEffect(() => {
    writeChunkCoachModePreference(chunkCoachMode);
  }, [chunkCoachMode]);

  useEffect(() => {
    writeChunkDeliveryModePreference(chunkDeliveryModeId);
  }, [chunkDeliveryModeId]);

  useEffect(() => {
    writeChunkLaunchPlanPreference(chunkLaunchPlanId);
  }, [chunkLaunchPlanId]);

  useEffect(() => {
    writeOutlineStrategyPreference(outlineStrategyId);
  }, [outlineStrategyId]);

  useEffect(() => {
    writeOutlineFocusLensPreference(outlineFocusLens);
  }, [outlineFocusLens]);

  useEffect(() => {
    writeOutlineFocusWindowPreference(outlineFocusWindow);
  }, [outlineFocusWindow]);

  useEffect(() => {
    writeStyleReadabilityPreference(styleReadabilityTargetId);
  }, [styleReadabilityTargetId]);

  useEffect(() => {
    writeStyleLanePreference(styleLaneId);
  }, [styleLaneId]);

  useEffect(() => {
    writeStyleAssistPreference(styleAssistPresetId);
  }, [styleAssistPresetId]);

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
  const currentTableCellBackground = String(
    editor?.getAttributes("tableCell").backgroundColor ??
      editor?.getAttributes("tableHeader").backgroundColor ??
      "",
  );
  const currentTableGridColor = String(
    editor?.getAttributes("tableCell").borderColor ??
      editor?.getAttributes("tableHeader").borderColor ??
      editor?.getAttributes("table").borderColor ??
      "",
  );
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
    setTableCellBackgroundRgba(parseCssColor(currentTableCellBackground, DEFAULT_TABLE_CELL_RGBA));
  }, [currentTableCellBackground]);

  useEffect(() => {
    setTableGridRgba(parseCssColor(currentTableGridColor, DEFAULT_TABLE_GRID_RGBA));
  }, [currentTableGridColor]);

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
  const selectedWorkspaceIntent =
    WORKSPACE_INTENT_OPTIONS.find((option) => option.id === workspaceIntentPresetId) ?? WORKSPACE_INTENT_OPTIONS[1];
  const selectedPanelFocusPreset =
    PANEL_FOCUS_PRESET_OPTIONS.find((option) => option.id === panelFocusPresetId) ?? PANEL_FOCUS_PRESET_OPTIONS[0];
  const selectedWorkspaceCoach =
    WORKSPACE_COACH_OPTIONS.find((option) => option.id === workspaceCoachPresetId) ?? WORKSPACE_COACH_OPTIONS[1];
  const selectedSessionGoal =
    SESSION_GOAL_OPTIONS.find((option) => option.id === sessionGoalPresetId) ?? SESSION_GOAL_OPTIONS[1];
  const selectedEditorCoach =
    EDITOR_COACH_OPTIONS.find((option) => option.id === editorCoachPresetId) ?? EDITOR_COACH_OPTIONS[1];
  const selectedLearningLane =
    LEARNING_LANE_OPTIONS.find((option) => option.id === learningLaneId) ?? LEARNING_LANE_OPTIONS[1];
  const selectedRevisionCadence =
    REVISION_CADENCE_OPTIONS.find((option) => option.id === revisionCadenceProfileId) ?? REVISION_CADENCE_OPTIONS[1];
  const selectedSessionTempo =
    SESSION_TEMPO_OPTIONS.find((option) => option.id === sessionTempoPresetId) ?? SESSION_TEMPO_OPTIONS[0];
  const selectedModeScenePreset =
    MODE_SCENE_OPTIONS.find((option) => option.id === modeScenePresetId) ?? MODE_SCENE_OPTIONS[0];
  const selectedModeStrategy = MODE_STRATEGY_OPTIONS.find((option) => option.id === modeStrategyId) ?? MODE_STRATEGY_OPTIONS[0];
  const selectedModeRecoveryCue =
    MODE_RECOVERY_CUE_OPTIONS.find((option) => option.value === modeRecoveryCue) ?? MODE_RECOVERY_CUE_OPTIONS[0];
  const selectedModeGuidanceLane =
    MODE_GUIDANCE_LANE_OPTIONS.find((option) => option.id === modeGuidanceLaneId) ?? MODE_GUIDANCE_LANE_OPTIONS[1];
  const selectedMinimapDepthOption =
    MINIMAP_DEPTH_OPTIONS.find((option) => option.value === minimapDepthFilter) ?? MINIMAP_DEPTH_OPTIONS[0];
  const selectedMinimapLabelOption =
    MINIMAP_LABEL_OPTIONS.find((option) => option.value === minimapLabelMode) ?? MINIMAP_LABEL_OPTIONS[0];
  const selectedMinimapHighlightOption =
    MINIMAP_HIGHLIGHT_OPTIONS.find((option) => option.value === minimapHighlightMode) ?? MINIMAP_HIGHLIGHT_OPTIONS[0];
  const selectedMinimapStrategy =
    MINIMAP_STRATEGY_OPTIONS.find((option) => option.id === minimapStrategyId) ?? MINIMAP_STRATEGY_OPTIONS[1];
  const selectedMinimapCoachLane =
    MINIMAP_COACH_LANE_OPTIONS.find((option) => option.id === minimapCoachLaneId) ?? MINIMAP_COACH_LANE_OPTIONS[1];
  const selectedPulseLens = PULSE_LENS_OPTIONS.find((option) => option.value === pulseLens) ?? PULSE_LENS_OPTIONS[1];
  const selectedPulseTarget =
    PULSE_TARGET_OPTIONS.find((option) => option.value === pulseCadenceTarget) ?? PULSE_TARGET_OPTIONS[1];
  const selectedPulseCoach =
    PULSE_COACH_OPTIONS.find((option) => option.id === pulseCoachPresetId) ?? PULSE_COACH_OPTIONS[0];
  const selectedPulseIntervention =
    PULSE_INTERVENTION_OPTIONS.find((option) => option.id === pulseInterventionId) ?? PULSE_INTERVENTION_OPTIONS[1];
  const selectedRevisionStrategy =
    REVISION_STRATEGY_OPTIONS.find((option) => option.id === revisionStrategyId) ?? REVISION_STRATEGY_OPTIONS[0];
  const selectedRevisionDiffDepth =
    REVISION_DIFF_DEPTH_OPTIONS.find((option) => option.value === revisionDiffDepth) ?? REVISION_DIFF_DEPTH_OPTIONS[1];
  const selectedRevisionRestoreGuard =
    REVISION_RESTORE_GUARD_OPTIONS.find((option) => option.value === revisionRestoreGuard) ?? REVISION_RESTORE_GUARD_OPTIONS[1];
  const selectedRevisionTimelineLens =
    REVISION_TIMELINE_LENS_OPTIONS.find((option) => option.value === revisionTimelineLens) ?? REVISION_TIMELINE_LENS_OPTIONS[0];
  const selectedStyleRecipe = STYLE_RECIPES.find((recipe) => recipe.id === styleRecipeId) ?? STYLE_RECIPES[0];
  const selectedStylePersona = STYLE_PERSONA_OPTIONS.find((persona) => persona.id === stylePersonaId) ?? STYLE_PERSONA_OPTIONS[0];
  const selectedStyleReadabilityTarget =
    STYLE_READABILITY_TARGET_OPTIONS.find((target) => target.id === styleReadabilityTargetId) ??
    STYLE_READABILITY_TARGET_OPTIONS[1];
  const selectedStyleLane = STYLE_LANE_OPTIONS.find((lane) => lane.id === styleLaneId) ?? STYLE_LANE_OPTIONS[1];
  const selectedStyleAssist = STYLE_ASSIST_OPTIONS.find((preset) => preset.id === styleAssistPresetId) ?? STYLE_ASSIST_OPTIONS[1];
  const selectedFindStrategy = FIND_STRATEGY_OPTIONS.find((strategy) => strategy.id === findStrategyId) ?? FIND_STRATEGY_OPTIONS[0];
  const selectedFindCoachMode =
    FIND_COACH_MODE_OPTIONS.find((option) => option.value === findCoachMode) ?? FIND_COACH_MODE_OPTIONS[1];
  const selectedChunkIntentProfile =
    CHUNK_INTENT_PROFILES.find((profile) => profile.id === chunkIntentProfileId) ?? CHUNK_INTENT_PROFILES[1];
  const selectedChunkDeliveryMode =
    CHUNK_DELIVERY_MODE_OPTIONS.find((mode) => mode.id === chunkDeliveryModeId) ?? CHUNK_DELIVERY_MODE_OPTIONS[1];
  const selectedChunkDeliveryIntentProfile =
    CHUNK_INTENT_PROFILES.find((profile) => profile.id === selectedChunkDeliveryMode.intentProfileId) ?? CHUNK_INTENT_PROFILES[1];
  const selectedChunkBuildStrategy =
    CHUNK_BUILD_STRATEGY_OPTIONS.find((strategy) => strategy.id === chunkBuildStrategyId) ?? CHUNK_BUILD_STRATEGY_OPTIONS[0];
  const selectedChunkCoachMode =
    CHUNK_COACH_MODE_OPTIONS.find((mode) => mode.id === chunkCoachMode) ?? CHUNK_COACH_MODE_OPTIONS[1];
  const selectedChunkLaunchPlan =
    CHUNK_LAUNCH_PLAN_OPTIONS.find((plan) => plan.id === chunkLaunchPlanId) ?? CHUNK_LAUNCH_PLAN_OPTIONS[0];
  const selectedOutlineStrategy =
    OUTLINE_STRATEGY_OPTIONS.find((strategy) => strategy.id === outlineStrategyId) ?? OUTLINE_STRATEGY_OPTIONS[0];
  const selectedOutlineFocusLens =
    OUTLINE_FOCUS_LENS_OPTIONS.find((option) => option.value === outlineFocusLens) ?? OUTLINE_FOCUS_LENS_OPTIONS[0];
  const selectedChunkIntentTemplate = getChunkTemplate(selectedChunkIntentProfile.templateId);
  const chunkDeliveryTemplate = getChunkTemplate(selectedChunkDeliveryIntentProfile.templateId);
  const reasonFilteredSnapshots = snapshots.filter((snapshot) => {
    if (revisionFilter === "all") {
      return true;
    }
    if (revisionFilter === "checkpoint") {
      return snapshot.reason === "manual-checkpoint";
    }
    return snapshot.reason === revisionFilter;
  });
  const revisionTimelineWindowMinutes =
    revisionTimelineLens === "last-hour" ? 60 : revisionTimelineLens === "latest-three" ? 15 : null;
  const revisionTimelineCutoffTimestamp =
    revisionTimelineWindowMinutes === null ? null : Date.now() - revisionTimelineWindowMinutes * 60 * 1000;
  let filteredSnapshots = reasonFilteredSnapshots.filter((snapshot) => {
    if (revisionTimelineCutoffTimestamp === null) {
      return true;
    }
    return Date.parse(snapshot.createdAt) >= revisionTimelineCutoffTimestamp;
  });
  if (revisionTimelineLens === "latest-three") {
    filteredSnapshots = filteredSnapshots.slice(0, 3);
  }
  const revisionTimelineCoverage =
    reasonFilteredSnapshots.length > 0 ? Math.round((filteredSnapshots.length / reasonFilteredSnapshots.length) * 100) : 0;
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
  const pulseRhythmScore =
    averageSnapshotCadence === null ? 0 : clampPercent(100 - Math.min(100, Math.abs(averageSnapshotCadence - 20) * 3));
  const pulseCoachTip =
    pulseRhythmScore >= 75
      ? "Revision rhythm is steady. Keep checkpoint cadence consistent."
      : pulseRhythmScore >= 45
        ? "Cadence is drifting. Add manual checkpoints near major section edits."
        : "Cadence is sparse. Capture checkpoints more frequently for safer restores.";
  const pulseInterventionScore = clampPercent(
    Math.round((pulseLensScore * 0.4 + pulseRhythmScore * 0.35 + revisionTimelineCoverage * 0.25) / 1),
  );
  const pulseInterventionTip =
    pulseInterventionScore >= 78
      ? "Pulse is stable for this intervention. Apply it to keep momentum predictable."
      : pulseInterventionScore >= 48
        ? "Pulse is recoverable. Apply intervention, then capture a checkpoint once metrics settle."
        : "Pulse is volatile. Apply intervention and run a guarded revision check before big edits.";
  const findMatchDensity = stats.words > 0 ? Math.round((matches.length / stats.words) * 1000 * 10) / 10 : 0;
  const findDensityTip =
    findMatchDensity > 12
      ? "High match density: run Replace all carefully with a narrow strategy."
      : findMatchDensity > 4
        ? "Moderate match density: preview next/prev before bulk changes."
        : "Low match density: broader strategy can speed cleanup passes.";
  const findRiskLevel = findMatchDensity > 12 ? "high" : findMatchDensity > 4 ? "medium" : "low";
  const findRiskMessage =
    findRiskLevel === "high"
      ? "High-risk pass detected. Confirm replacements in preview before running Replace all."
      : findRiskLevel === "medium"
        ? "Moderate risk. Review excerpts and keep strategy scoped."
        : "Low risk. Bulk replace is generally safe when the strategy matches intent.";
  const findPreviewStartIndex = matches.length
    ? Math.max(0, Math.min(matches.length - findPreviewLimit, activeMatchIndex - Math.floor(findPreviewLimit / 2)))
    : 0;
  const findPreviewMatches = matches.slice(findPreviewStartIndex, findPreviewStartIndex + findPreviewLimit);
  const activeSelectionSeed =
    editor && !editor.state.selection.empty
      ? editor.state.doc
          .textBetween(editor.state.selection.from, editor.state.selection.to, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 72)
      : "";
  const scopedOutline = outline.filter((item) => {
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
  const scopedActiveOutlineIndex = scopedOutline.findIndex((item) => item.key === activeSectionKey);
  const outlineTrailKeys = new Set<string>();
  if (scopedActiveOutlineIndex >= 0) {
    let currentLevel = scopedOutline[scopedActiveOutlineIndex]?.level ?? 6;
    outlineTrailKeys.add(scopedOutline[scopedActiveOutlineIndex].key);
    for (let index = scopedActiveOutlineIndex - 1; index >= 0; index -= 1) {
      const candidate = scopedOutline[index];
      if (candidate.level < currentLevel) {
        outlineTrailKeys.add(candidate.key);
        currentLevel = candidate.level;
      }
    }
  }
  const visibleOutline =
    outlineFocusLens === "all-visible" || scopedActiveOutlineIndex === -1
      ? scopedOutline
      : outlineFocusLens === "active-window"
        ? scopedOutline.filter((_, index) => Math.abs(index - scopedActiveOutlineIndex) <= outlineFocusWindow)
        : scopedOutline.filter((item) => outlineTrailKeys.has(item.key));
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
  const outlineScopedCoverageRatio =
    scopedOutline.length > 0 ? Math.round((visibleOutline.length / scopedOutline.length) * 100) : 0;
  const outlineCoachTip =
    outlineLevelCounts.h1 === 0
      ? "Add at least one H1 heading so large sections anchor correctly."
      : outlineDepthDriftCount > 0
        ? "Depth jumps detected. Consider adding bridge headings for smoother hierarchy."
        : "Hierarchy is steady. Use Reorder pass when sequencing chapters.";
  const outlineLensTip =
    outlineFocusLens === "all-visible"
      ? "All-visible lens keeps complete context for map-wide reordering."
      : outlineFocusLens === "active-window"
        ? `Active-window lens is showing a ±${outlineFocusWindow} heading radius around your cursor.`
        : "Active-trail lens keeps parent headings visible so hierarchy stays anchored.";
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
  const modeAlignmentScore = clampPercent(
    (focusMode === selectedModeStrategy.focus ? 25 : 0) +
      (typewriterMode === selectedModeStrategy.typewriter ? 25 : 0) +
      (leftRailOpen === selectedModeStrategy.leftRail ? 25 : 0) +
      (rightRailOpen === selectedModeStrategy.rightRail ? 25 : 0),
  );
  const modeCoachTip =
    modeAlignmentScore >= 85
      ? "Mode system aligned: keep this strategy while drafting this section set."
      : modeAlignmentScore >= 55
        ? "Partial alignment: apply strategy to sync rails and focus behavior."
        : "Low alignment: run recovery cue, then apply strategy for a clean reset.";
  const modeLaneAlignmentScore = clampPercent(
    (modeStrategyId === selectedModeGuidanceLane.strategy ? 34 : 0) +
      (modeScenePresetId === selectedModeGuidanceLane.scene ? 33 : 0) +
      (modeRecoveryCue === selectedModeGuidanceLane.recoveryCue ? 33 : 0),
  );
  const modeLaneTip =
    modeLaneAlignmentScore >= 85
      ? "Mode lane aligned: transitions and recovery cues are synchronized."
      : modeLaneAlignmentScore >= 55
        ? "Mode lane partly aligned: apply lane to restore scene and cue consistency."
        : "Mode lane drifted: apply lane before changing focus states manually.";
  const minimapCoverageRatio = outline.length > 0 ? Math.round((minimapVisibleOutline.length / outline.length) * 100) : 0;
  const minimapLoadPerStep = minimapJumpStride > 0 ? Math.round(minimapVisibleOutline.length / minimapJumpStride) : 0;
  const minimapStrategyScore = clampPercent(
    (minimapDepthFilter === selectedMinimapStrategy.depth ? 34 : 0) +
      (minimapLabelMode === selectedMinimapStrategy.labels ? 33 : 0) +
      (minimapHighlightMode === selectedMinimapStrategy.highlight ? 33 : 0),
  );
  const minimapCoachTip =
    minimapStrategyScore >= 85
      ? "Minimap strategy aligned: keep scanning and jump through checkpoints."
      : minimapStrategyScore >= 55
        ? "Some minimap controls drifted: apply strategy to restore scan rhythm."
        : "Low alignment: reset strategy to recover navigation consistency.";
  const minimapCoachLaneScore = clampPercent(
    (minimapStrategyId === selectedMinimapCoachLane.strategy ? 20 : 0) +
      (minimapDepthFilter === selectedMinimapCoachLane.depth ? 20 : 0) +
      (minimapLabelMode === selectedMinimapCoachLane.labels ? 20 : 0) +
      (minimapHighlightMode === selectedMinimapCoachLane.highlight ? 20 : 0) +
      (minimapJumpStride === selectedMinimapCoachLane.jumpStride ? 20 : 0),
  );
  const minimapLaneTip =
    minimapCoachLaneScore >= 85
      ? "Minimap lane aligned: scan effort and jump stride are predictable."
      : minimapCoachLaneScore >= 55
        ? "Minimap lane partly aligned: apply lane to normalize scan behavior."
        : "Minimap lane drifted: apply lane before a long navigation pass.";
  const currentFontSizePx = resolveLengthValueToPx(currentFontSize, 16);
  const currentLineHeightRatio = resolveLineHeightToRatio(currentLineHeight, currentFontSizePx);
  const currentTrackingEm = resolveLengthValueToEm(currentLetterSpacing, currentFontSizePx);
  const currentWeightNumeric = resolveNumericFontWeight(currentFontWeight);
  const readabilityScore = clampPercent(
    Math.round(
      scoreRange(currentFontSizePx, 15, 18, 25) +
        scoreRange(currentLineHeightRatio, 1.45, 1.9, 35) +
        scoreCenter(currentTrackingEm, 0.01, 0.03, 20) +
        scoreRange(currentWeightNumeric, 380, 620, 20),
    ),
  );
  const readabilityTip =
    readabilityScore >= 80
      ? "Readability is strong for long sessions. Keep this target while refining tone."
      : readabilityScore >= 55
        ? "Readability is serviceable. Apply the active target to tighten rhythm."
        : "Readability is drifting. Apply a target, then tune size and line height first.";
  const styleLaneAlignmentScore = clampPercent(
    (styleRecipeId === selectedStyleLane.recipe ? 34 : 0) +
      (stylePersonaId === selectedStyleLane.persona ? 33 : 0) +
      (styleReadabilityTargetId === selectedStyleLane.readability ? 33 : 0),
  );
  const styleLaneTip =
    styleLaneAlignmentScore >= 85
      ? "Style lane aligned: keep manual tweaks focused on local emphasis only."
      : styleLaneAlignmentScore >= 55
        ? "Style lane partly aligned: apply lane to re-sync recipe, persona, and readability."
        : "Style lane drifted: apply lane before detailed typography tuning.";
  const styleAssistAlignmentScore = clampPercent(
    (styleLaneId === selectedStyleAssist.lane ? 34 : 0) +
      (styleRecipeId === selectedStyleAssist.recipe ? 33 : 0) +
      (stylePersonaId === selectedStyleAssist.persona ? 33 : 0),
  );
  const styleAssistTip =
    styleAssistAlignmentScore >= 85
      ? "Assist profile aligned. Keep manual controls for local tuning only."
      : styleAssistAlignmentScore >= 55
        ? "Assist profile partly aligned. Applying it will re-center visual consistency."
        : "Assist profile drifted. Apply profile before deep manual refinements.";
  const sessionTempoAlignmentScore = clampPercent(
    (guidanceLevel === selectedSessionTempo.guidance ? 25 : 0) +
      (interfaceDensity === selectedSessionTempo.density ? 25 : 0) +
      (revisionCadenceProfileId === selectedSessionTempo.cadence ? 25 : 0) +
      (workflowTrack === selectedSessionTempo.workflow ? 25 : 0),
  );
  const workspaceIntentAlignmentScore = clampPercent(
    (guidanceLevel === selectedWorkspaceIntent.guidance ? 14 : 0) +
      (interfaceDensity === selectedWorkspaceIntent.density ? 14 : 0) +
      (workflowTrack === selectedWorkspaceIntent.workflow ? 14 : 0) +
      (panelFocusPresetId === selectedWorkspaceIntent.panelFocus ? 14 : 0) +
      (modeStrategyId === selectedWorkspaceIntent.modeStrategy ? 14 : 0) +
      (minimapStrategyId === selectedWorkspaceIntent.minimapStrategy ? 15 : 0) +
      (sessionTempoPresetId === selectedWorkspaceIntent.sessionTempo ? 15 : 0),
  );
  const chunkDeliveryScore = clampPercent(
    (chunkIntentProfileId === selectedChunkDeliveryMode.intentProfileId ? 34 : 0) +
      (chunkBuilderLayout === selectedChunkDeliveryMode.layout ? 33 : 0) +
      (chunkBuilderDensity === selectedChunkDeliveryMode.density ? 33 : 0),
  );
  const chunkDeliveryTip =
    chunkDeliveryScore >= 85
      ? "Delivery mode aligned: launch and validate with confidence."
      : chunkDeliveryScore >= 55
        ? "Delivery partly aligned: apply mode to sync layout and intent."
        : "Delivery misaligned: apply mode before opening the builder.";

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
  const chunkLaunchReadinessScore = clampPercent(
    Math.round(
      chunkDeliveryScore * 0.55 +
        (chunkBuilderCoverage.ratio || 0) * 0.35 +
        (activeChunkAttrs ? 10 : 0),
    ),
  );
  const chunkLaunchTip =
    chunkLaunchReadinessScore >= 80
      ? "Launch readiness is strong. Keep this plan and continue iterating."
      : chunkLaunchReadinessScore >= 55
        ? "Launch readiness is moderate. Fill a few core fields before launching."
        : "Launch readiness is low. Apply delivery mode and complete core fields first.";
  const chunkPreflightChecks = [
    {
      label: "Mode alignment",
      pass:
        chunkBuildStrategyId === selectedChunkCoachMode.buildStrategy &&
        chunkDeliveryModeId === selectedChunkCoachMode.deliveryMode &&
        chunkLaunchPlanId === selectedChunkCoachMode.launchPlan,
      detail: `Expected ${selectedChunkCoachMode.buildStrategy}, ${selectedChunkCoachMode.deliveryMode}, ${selectedChunkCoachMode.launchPlan}.`,
    },
    {
      label: "Delivery fit",
      pass: chunkDeliveryScore >= 70,
      detail: `Delivery score ${chunkDeliveryScore}% with ${selectedChunkDeliveryMode.label.toLowerCase()} mode.`,
    },
    {
      label: "Launch readiness",
      pass: chunkLaunchReadinessScore >= 70,
      detail: `Readiness ${chunkLaunchReadinessScore}% using ${selectedChunkLaunchPlan.label.toLowerCase()} plan.`,
    },
    {
      label: "Context anchor",
      pass: chunkLaunchPlanId !== "selected-first" || Boolean(activeChunkAttrs),
      detail:
        chunkLaunchPlanId === "selected-first" && !activeChunkAttrs
          ? "Select a chunk or switch launch plan before opening builder."
          : "Launch context is valid for the selected plan.",
    },
  ];
  const chunkPreflightPassCount = chunkPreflightChecks.filter((check) => check.pass).length;
  const chunkPreflightScore = clampPercent(Math.round((chunkPreflightPassCount / Math.max(1, chunkPreflightChecks.length)) * 100));
  const chunkCoachTip =
    chunkPreflightScore >= 85
      ? "Coach lane is stable. Run launch plan and review output once."
      : chunkPreflightScore >= 55
        ? "Coach lane is partially aligned. Apply coach mode to sync strategy and delivery."
        : "Coach lane is drifting. Apply coach mode before launching.";
  const revisionNetChange = revisionSummary.inserted - revisionSummary.deleted;
  const revisionTimelineTip =
    revisionTimelineLens === "all"
      ? "Full history view: best for trend checks and milestone restores."
      : revisionTimelineLens === "last-hour"
        ? "Recent lens: keeps recovery decisions anchored to this session."
        : "Compact lens: triage only the three most recent snapshots.";
  const revisionGuardStatus =
    revisionRestoreGuard === "fast"
      ? "Restores apply immediately."
      : revisionRestoreGuard === "confirm"
        ? pendingRestoreSnapshotId
          ? "One snapshot is armed for restore. Click its restore button again to confirm."
          : "Two-step restore is enabled for safety."
        : "Diff-first guard: select and inspect a snapshot before restoring.";
  const revisionCoachTip =
    revisionDiffFocus === "additions"
      ? "Confirm each addition resolves a reader need or remove it."
      : revisionDiffFocus === "deletions"
        ? "Verify every trim keeps core claims and calls to action intact."
        : "Review paired adds/removes to ensure the section intent stayed stable.";

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
    jumpToMatchIndex(nextIndex);
  }

  function jumpToMatchIndex(index: number) {
    if (!matches.length) {
      return;
    }
    const boundedIndex = Math.max(0, Math.min(matches.length - 1, index));
    setActiveMatchIndex(boundedIndex);
    selectMatch(activeEditor, matches[boundedIndex]);
  }

  function useSelectionAsFindQuery() {
    if (!activeSelectionSeed) {
      return;
    }
    setFindQuery(activeSelectionSeed);
    rememberFindQuery(activeSelectionSeed);
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
    setPendingRestoreSnapshotId(null);
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

  function moveOutlineLensSelection(step: 1 | -1) {
    if (!visibleOutline.length) {
      return;
    }
    const currentIndex = visibleOutline.findIndex((item) => item.key === activeSectionKey);
    const nextIndex =
      currentIndex < 0
        ? step > 0
          ? 0
          : visibleOutline.length - 1
        : (currentIndex + step + visibleOutline.length) % visibleOutline.length;
    const nextItem = visibleOutline[nextIndex];
    if (nextItem) {
      jumpToOutlineItem(nextItem);
    }
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

  function applyTableCellBackgroundColor(color: string | null) {
    if (!activeEditor.isActive("table")) {
      return;
    }

    activeEditor.chain().focus().setCellAttribute("backgroundColor", color).run();
  }

  function applyTableGridColor(color: string | null) {
    if (!activeEditor.isActive("table")) {
      return;
    }

    activeEditor.chain().focus().setCellAttribute("borderColor", color).updateAttributes("table", { borderColor: color }).run();
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

  function applyStyleReadabilityTarget(nextTarget: StyleReadabilityTargetId = styleReadabilityTargetId) {
    const target = STYLE_READABILITY_TARGET_OPTIONS.find((candidate) => candidate.id === nextTarget);
    if (!target) {
      return;
    }
    setStyleReadabilityTargetId(target.id);
    applyFontSize(target.fontSize);
    applyLineHeight(target.lineHeight);
    applyLetterSpacing(target.letterSpacing);
    applyFontWeight(target.fontWeight);
  }

  function applyStyleLane(nextLane: StyleLaneId = styleLaneId) {
    const lane = STYLE_LANE_OPTIONS.find((candidate) => candidate.id === nextLane);
    if (!lane) {
      return;
    }
    setStyleLaneId(lane.id);
    setStyleRecipeId(lane.recipe);
    setStylePersonaId(lane.persona);
    setStyleReadabilityTargetId(lane.readability);
    applyStyleRecipe(lane.recipe);
    applyStylePersona(lane.persona);
    applyStyleReadabilityTarget(lane.readability);
  }

  function applyStyleAssistPreset(nextPreset: StyleAssistPresetId = styleAssistPresetId) {
    const preset = STYLE_ASSIST_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }
    setStyleAssistPresetId(preset.id);
    setStyleLaneId(preset.lane);
    setStyleRecipeId(preset.recipe);
    setStylePersonaId(preset.persona);
    setStyleReadabilityTargetId(preset.readability);
    applyStyleLane(preset.lane);
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

  function applyWorkspaceIntentPreset(nextPreset: WorkspaceIntentPresetId = workspaceIntentPresetId) {
    const preset = WORKSPACE_INTENT_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }
    setWorkspaceIntentPresetId(preset.id);
    setGuidanceLevel(preset.guidance);
    setInterfaceDensity(preset.density);
    setWorkflowTrack(preset.workflow);
    setNavigationProfile(preset.navigation);
    setSessionTempoPresetId(preset.sessionTempo);
    setPanelFocusPresetId(preset.panelFocus);
    applyPanelFocusPreset(preset.panelFocus);
    applyModeStrategy(preset.modeStrategy);
    applyMinimapStrategy(preset.minimapStrategy);
    applySessionTempo(preset.sessionTempo);
  }

  function applyPanelFocusPreset(nextPreset: PanelFocusPresetId = panelFocusPresetId) {
    const preset = PANEL_FOCUS_PRESET_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }
    setPanelFocusPresetId(preset.id);
    setLeftRailOpen(preset.leftRail);
    setRightRailOpen(preset.rightRail);
    setPanelCollapsePrefs(
      PANEL_SECTION_IDS.reduce<PanelCollapsePrefs>((accumulator, id) => {
        accumulator[id] = !preset.openPanels.includes(id);
        return accumulator;
      }, {} as PanelCollapsePrefs),
    );
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

  function applySessionGoalPreset(nextPreset: SessionGoalPresetId = sessionGoalPresetId) {
    const preset = SESSION_GOAL_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }
    setSessionGoalPresetId(preset.id);
    setGuidanceLevel(preset.guidance);
    setWorkflowTrack(preset.workflow);
    setNavigationProfile(preset.navigation);
    applyWorkspaceLayoutPreset(preset.layout);
    applyModeScenePreset(preset.modeScene);
    setSideBySide(preset.sideBySide);
    setViewMode(preset.viewMode);
  }

  function applyEditorCoachPreset(nextPreset: EditorCoachPresetId = editorCoachPresetId) {
    const preset = EDITOR_COACH_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }
    setEditorCoachPresetId(preset.id);
    setGuidanceLevel(preset.guidance);
    setInterfaceDensity(preset.density);
    setWorkflowTrack(preset.workflow);
    setNavigationProfile(preset.navigation);
    applyModeStrategy(preset.modeStrategy);
    applyMinimapStrategy(preset.minimapStrategy);
  }

  function applyLearningLane(nextLane: LearningLaneId = learningLaneId) {
    const lane = LEARNING_LANE_OPTIONS.find((option) => option.id === nextLane);
    if (!lane) {
      return;
    }
    setLearningLaneId(lane.id);
    setGuidanceLevel(lane.guidance);
    setInterfaceDensity(lane.density);
    setWorkflowTrack(lane.workflow);
    setNavigationProfile(lane.navigation);
    if (lane.id === "teach-me") {
      setStyleLaneId("teach-clarity");
    } else if (lane.id === "ship-fast") {
      setStyleLaneId("ship-contrast");
    } else {
      setStyleLaneId("steady-narrative");
    }
    applyStylePersona(lane.stylePersona);
    applyChunkDeliveryMode(lane.chunkDeliveryMode);
  }

  function applySessionTempo(nextPreset: SessionTempoPresetId = sessionTempoPresetId) {
    const preset = SESSION_TEMPO_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }
    setSessionTempoPresetId(preset.id);
    setGuidanceLevel(preset.guidance);
    setInterfaceDensity(preset.density);
    setRevisionCadenceProfileId(preset.cadence);
    setWorkflowTrack(preset.workflow);
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

  function rotateModeScene(step: 1 | -1) {
    const currentIndex = MODE_SCENE_OPTIONS.findIndex((option) => option.id === modeScenePresetId);
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + step + MODE_SCENE_OPTIONS.length) % MODE_SCENE_OPTIONS.length;
    const nextScene = MODE_SCENE_OPTIONS[nextIndex];
    if (!nextScene) {
      return;
    }
    setModeScenePresetId(nextScene.id);
    applyModeScenePreset(nextScene.id);
  }

  function applyModeStrategy(nextStrategy: ModeStrategyId = modeStrategyId) {
    const strategy = MODE_STRATEGY_OPTIONS.find((option) => option.id === nextStrategy);
    if (!strategy) {
      return;
    }
    setModeStrategyId(strategy.id);
    setModeScenePresetId(strategy.scene);
    setFocusMode(strategy.focus);
    setTypewriterMode(strategy.typewriter);
    setLeftRailOpen(strategy.leftRail);
    setRightRailOpen(strategy.rightRail);
    setNavigationProfile(strategy.navigation);
  }

  function applyModeGuidanceLane(nextLane: ModeGuidanceLaneId = modeGuidanceLaneId) {
    const lane = MODE_GUIDANCE_LANE_OPTIONS.find((option) => option.id === nextLane);
    if (!lane) {
      return;
    }
    setModeGuidanceLaneId(lane.id);
    setModeRecoveryCue(lane.recoveryCue);
    setModeScenePresetId(lane.scene);
    applyModeStrategy(lane.strategy);
    applyModeScenePreset(lane.scene);
  }

  function runModeRecoveryCue(nextCue: ModeRecoveryCue = modeRecoveryCue) {
    setModeRecoveryCue(nextCue);
    if (nextCue === "checkpoint-first") {
      void createRevision(activeEditor, "manual-checkpoint");
      return;
    }
    if (nextCue === "open-structure") {
      setLeftRailOpen(true);
      setRightRailOpen(true);
      setNavigationProfile("survey");
      setMinimapDepthFilter("all");
      setMinimapLabelMode("full");
      setMinimapHighlightMode("level");
      return;
    }
    setFocusMode(true);
    setTypewriterMode(true);
    setLeftRailOpen(true);
    setRightRailOpen(false);
    setNavigationProfile("immersive");
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
    const stride = Math.max(1, minimapJumpStride);
    const currentIndex = minimapVisibleOutline.findIndex((item) => item.key === activeSectionKey);
    const nextIndex =
      currentIndex < 0
        ? step > 0
          ? 0
          : minimapVisibleOutline.length - 1
        : Math.min(minimapVisibleOutline.length - 1, Math.max(0, currentIndex + step * stride));
    const nextItem = minimapVisibleOutline[nextIndex];
    if (!nextItem) {
      return;
    }
    activeEditor.chain().focus(nextItem.pos).run();
  }

  function jumpToMinimapEdge(edge: "first" | "last") {
    if (!minimapVisibleOutline.length) {
      return;
    }
    const target = edge === "first" ? minimapVisibleOutline[0] : minimapVisibleOutline[minimapVisibleOutline.length - 1];
    if (!target) {
      return;
    }
    activeEditor.chain().focus(target.pos).run();
  }

  function applyMinimapStrategy(nextStrategy: MinimapStrategyId = minimapStrategyId) {
    const strategy = MINIMAP_STRATEGY_OPTIONS.find((option) => option.id === nextStrategy);
    if (!strategy) {
      return;
    }
    setMinimapStrategyId(strategy.id);
    setMinimapDepthFilter(strategy.depth);
    setMinimapLabelMode(strategy.labels);
    setMinimapHighlightMode(strategy.highlight);
    setMinimapJumpStride(strategy.jumpStride);
  }

  function applyMinimapCoachLane(nextLane: MinimapCoachLaneId = minimapCoachLaneId) {
    const lane = MINIMAP_COACH_LANE_OPTIONS.find((option) => option.id === nextLane);
    if (!lane) {
      return;
    }
    setMinimapCoachLaneId(lane.id);
    setMinimapDepthFilter(lane.depth);
    setMinimapLabelMode(lane.labels);
    setMinimapHighlightMode(lane.highlight);
    setMinimapJumpStride(lane.jumpStride);
    applyMinimapStrategy(lane.strategy);
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

  function applyPulseCoachPreset(nextPreset: PulseCoachPresetId = pulseCoachPresetId) {
    const preset = PULSE_COACH_OPTIONS.find((option) => option.id === nextPreset);
    if (!preset) {
      return;
    }
    setPulseCoachPresetId(preset.id);
    setPulseLens(preset.lens);
    setPulseCadenceTarget(preset.target);
    if (preset.id === "release-readiness") {
      setRightRailOpen(true);
      setRevisionFilter("checkpoint");
    }
  }

  function applyPulseIntervention(nextIntervention: PulseInterventionId = pulseInterventionId) {
    const intervention = PULSE_INTERVENTION_OPTIONS.find((option) => option.id === nextIntervention);
    if (!intervention) {
      return;
    }
    setPulseInterventionId(intervention.id);
    setPulseLens(intervention.lens);
    setPulseCadenceTarget(intervention.target);
    setPulseCoachPresetId(intervention.coach);
    setRevisionCadenceProfileId(intervention.cadence);
    setRevisionTimelineLens(intervention.timeline);
    setRightRailOpen(true);
    if (intervention.id === "prep-handoff") {
      setRevisionFilter("checkpoint");
      setRevisionDiffFocus("balanced");
    }
  }

  function applyRevisionStrategy(nextStrategy: RevisionStrategyId = revisionStrategyId) {
    const strategy = REVISION_STRATEGY_OPTIONS.find((option) => option.id === nextStrategy);
    if (!strategy) {
      return;
    }
    setRevisionStrategyId(strategy.id);
    setRevisionFilter(strategy.filter);
    setRevisionDiffFocus(strategy.focus);
    setRevisionDiffDepth(strategy.depth);
    setPendingRestoreSnapshotId(null);
    setRightRailOpen(true);
  }

  function moveRevisionSelection(step: 1 | -1) {
    if (!filteredSnapshots.length) {
      return;
    }
    const currentIndex = filteredSnapshots.findIndex((snapshot) => snapshot.id === selectedSnapshotId);
    const nextIndex =
      currentIndex < 0
        ? step > 0
          ? 0
          : filteredSnapshots.length - 1
        : (currentIndex + step + filteredSnapshots.length) % filteredSnapshots.length;
    const nextSnapshot = filteredSnapshots[nextIndex];
    if (!nextSnapshot) {
      return;
    }
    setSelectedSnapshotId(nextSnapshot.id);
    setPendingRestoreSnapshotId(null);
  }

  function requestSnapshotRestore(snapshot: RevisionSnapshot) {
    if (revisionRestoreGuard === "fast") {
      restoreSnapshot(snapshot);
      setPendingRestoreSnapshotId(null);
      return;
    }
    if (revisionRestoreGuard === "confirm") {
      if (pendingRestoreSnapshotId === snapshot.id) {
        restoreSnapshot(snapshot);
        setPendingRestoreSnapshotId(null);
        return;
      }
      setPendingRestoreSnapshotId(snapshot.id);
      setSelectedSnapshotId(snapshot.id);
      return;
    }
    if (pendingRestoreSnapshotId === snapshot.id && selectedSnapshotId === snapshot.id) {
      restoreSnapshot(snapshot);
      setPendingRestoreSnapshotId(null);
      return;
    }
    setPendingRestoreSnapshotId(snapshot.id);
    setSelectedSnapshotId(snapshot.id);
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

  function applyChunkDeliveryMode(nextMode: ChunkDeliveryModeId = chunkDeliveryModeId) {
    const mode = CHUNK_DELIVERY_MODE_OPTIONS.find((option) => option.id === nextMode);
    if (!mode) {
      return;
    }
    setChunkDeliveryModeId(mode.id);
    applyChunkIntentProfile(mode.intentProfileId, mode.engine);
    setChunkBuilderLayout(mode.layout);
    setChunkBuilderDensity(mode.density);
  }

  function runChunkLaunchPlan(nextPlan: ChunkLaunchPlanId = chunkLaunchPlanId) {
    const plan = CHUNK_LAUNCH_PLAN_OPTIONS.find((option) => option.id === nextPlan);
    if (!plan) {
      return;
    }

    setChunkLaunchPlanId(plan.id);
    if (plan.id === "selected-first") {
      openChunkBuilder(activeChunkAttrs);
      return;
    }

    if (plan.id === "delivery-first") {
      applyChunkDeliveryMode(chunkDeliveryModeId);
      openChunkBuilderWithTemplate(chunkDeliveryTemplate?.id ?? selectedChunkDeliveryIntentProfile.templateId);
      return;
    }

    applyChunkIntentProfile(chunkIntentProfileId);
    openChunkBuilderWithTemplate(selectedChunkIntentProfile.templateId);
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

  function applyChunkCoachMode(nextMode: ChunkCoachMode = chunkCoachMode) {
    const mode = CHUNK_COACH_MODE_OPTIONS.find((option) => option.id === nextMode);
    if (!mode) {
      return;
    }
    setChunkCoachMode(mode.id);
    applyChunkBuildStrategy(mode.buildStrategy);
    applyChunkDeliveryMode(mode.deliveryMode);
    setChunkLaunchPlanId(mode.launchPlan);
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

  function soloPanel(sectionId: string) {
    setPanelCollapsePrefs((current) =>
      PANEL_SECTION_IDS.reduce<PanelCollapsePrefs>((next, id) => {
        next[id] = id !== sectionId;
        return next;
      }, { ...current }),
    );
  }

  function expandAllPanels() {
    setPanelCollapsePrefs((current) =>
      PANEL_SECTION_IDS.reduce<PanelCollapsePrefs>((next, id) => {
        next[id] = false;
        return next;
      }, { ...current }),
    );
  }

  return (
    <div
      className={`app-shell accent-${accent} density-${interfaceDensity} workflow-${workflowTrack} nav-${navigationProfile} workspace-layout-${workspaceLayoutPreset} workspace-intent-${workspaceIntentPresetId} panel-focus-${panelFocusPresetId} session-tempo-${sessionTempoPresetId} mode-lane-${modeGuidanceLaneId} minimap-lane-${minimapCoachLaneId} ${focusMode ? "focus-mode" : ""}`}
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
          <label className="theme-selector panel-focus-selector" htmlFor="panel-focus-selector">
            <span>Panel focus</span>
            <select
              id="panel-focus-selector"
              value={panelFocusPresetId}
              aria-label="Panel focus preset"
              title={selectedPanelFocusPreset.summary}
              onChange={(event) => setPanelFocusPresetId(event.target.value as PanelFocusPresetId)}
            >
              {PANEL_FOCUS_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-action" type="button" title={selectedPanelFocusPreset.tip} onClick={() => applyPanelFocusPreset()}>
            Apply panel focus
          </button>
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
          <label className="theme-selector workspace-intent-selector" htmlFor="workspace-intent-selector">
            <span>Workspace intent</span>
            <select
              id="workspace-intent-selector"
              value={workspaceIntentPresetId}
              aria-label="Workspace intent preset"
              title={selectedWorkspaceIntent.summary}
              onChange={(event) => setWorkspaceIntentPresetId(event.target.value as WorkspaceIntentPresetId)}
            >
              {WORKSPACE_INTENT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-action" type="button" title={selectedWorkspaceIntent.tip} onClick={() => applyWorkspaceIntentPreset()}>
            Apply workspace intent
          </button>
          <label className="theme-selector session-goal-selector" htmlFor="session-goal-selector">
            <span>Session goal</span>
            <select
              id="session-goal-selector"
              value={sessionGoalPresetId}
              aria-label="Session goal"
              title={selectedSessionGoal.summary}
              onChange={(event) => setSessionGoalPresetId(event.target.value as SessionGoalPresetId)}
            >
              {SESSION_GOAL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-action" type="button" title={selectedSessionGoal.tip} onClick={() => applySessionGoalPreset()}>
            Apply session goal
          </button>
          <label className="theme-selector editor-coach-selector" htmlFor="editor-coach-selector">
            <span>Editor coach</span>
            <select
              id="editor-coach-selector"
              value={editorCoachPresetId}
              aria-label="Editor coach"
              title={selectedEditorCoach.summary}
              onChange={(event) => setEditorCoachPresetId(event.target.value as EditorCoachPresetId)}
            >
              {EDITOR_COACH_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-action" type="button" title={selectedEditorCoach.tip} onClick={() => applyEditorCoachPreset()}>
            Apply editor coach
          </button>
          <label className="theme-selector learning-lane-selector" htmlFor="learning-lane-selector">
            <span>Learning lane</span>
            <select
              id="learning-lane-selector"
              value={learningLaneId}
              aria-label="Learning lane"
              title={selectedLearningLane.summary}
              onChange={(event) => setLearningLaneId(event.target.value as LearningLaneId)}
            >
              {LEARNING_LANE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-action" type="button" title={selectedLearningLane.tip} onClick={() => applyLearningLane()}>
            Apply learning lane
          </button>
          <label className="theme-selector cadence-selector" htmlFor="revision-cadence-selector">
            <span>Revision cadence</span>
            <select
              id="revision-cadence-selector"
              value={revisionCadenceProfileId}
              aria-label="Revision cadence profile"
              title={selectedRevisionCadence.summary}
              onChange={(event) => setRevisionCadenceProfileId(event.target.value as RevisionCadenceProfileId)}
            >
              {REVISION_CADENCE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-selector session-tempo-selector" htmlFor="session-tempo-selector">
            <span>Session tempo</span>
            <select
              id="session-tempo-selector"
              value={sessionTempoPresetId}
              aria-label="Session tempo"
              title={selectedSessionTempo.summary}
              onChange={(event) => setSessionTempoPresetId(event.target.value as SessionTempoPresetId)}
            >
              {SESSION_TEMPO_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-action" type="button" title={selectedSessionTempo.tip} onClick={() => applySessionTempo()}>
            Apply tempo
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
            onSolo={() => soloPanel("left-mode")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
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
            <div className="mode-strategy-group mode-lane-group">
              <div className="mode-strategy-head">
                <span>Mode lane</span>
                <label className="mode-scene-select">
                  <span>Lane</span>
                  <select
                    value={modeGuidanceLaneId}
                    title={selectedModeGuidanceLane.summary}
                    onChange={(event) => setModeGuidanceLaneId(event.target.value as ModeGuidanceLaneId)}
                  >
                    {MODE_GUIDANCE_LANE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mode-strategy-grid">
                {MODE_GUIDANCE_LANE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`mode-scene-card ${modeGuidanceLaneId === option.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setModeGuidanceLaneId(option.id)}
                    aria-pressed={modeGuidanceLaneId === option.id}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                  </button>
                ))}
              </div>
              <div className="compact-grid">
                <button className="chip" type="button" onClick={() => applyModeGuidanceLane()}>
                  Apply mode lane
                </button>
                <button className="chip" type="button" onClick={() => rotateModeScene(-1)}>
                  Prev scene
                </button>
                <button className="chip" type="button" onClick={() => rotateModeScene(1)}>
                  Next scene
                </button>
              </div>
              <article className="mode-coach-card">
                <div className="meter-head">
                  <span>{selectedModeGuidanceLane.label} alignment</span>
                  <span>{modeLaneAlignmentScore}%</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${modeLaneAlignmentScore}%` }}></span>
                </div>
                <p className="small-copy">{modeLaneTip}</p>
                <p className="small-copy">{selectedModeGuidanceLane.tip}</p>
              </article>
            </div>
            <div className="mode-strategy-group">
              <div className="mode-strategy-head">
                <span>Mode strategy</span>
                <label className="mode-scene-select">
                  <span>Strategy</span>
                  <select
                    value={modeStrategyId}
                    title={selectedModeStrategy.summary}
                    onChange={(event) => setModeStrategyId(event.target.value as ModeStrategyId)}
                  >
                    {MODE_STRATEGY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mode-strategy-grid">
                {MODE_STRATEGY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`mode-scene-card ${modeStrategyId === option.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setModeStrategyId(option.id)}
                    aria-pressed={modeStrategyId === option.id}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                  </button>
                ))}
              </div>
              <div className="compact-grid">
                <button className="chip" type="button" onClick={() => applyModeStrategy()}>
                  Apply strategy
                </button>
                <button className="chip" type="button" onClick={() => runModeRecoveryCue()}>
                  Run recovery cue
                </button>
              </div>
              <label className="mode-scene-select">
                <span>Recovery cue</span>
                <select
                  value={modeRecoveryCue}
                  title={selectedModeRecoveryCue.tip}
                  onChange={(event) => setModeRecoveryCue(event.target.value as ModeRecoveryCue)}
                >
                  {MODE_RECOVERY_CUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mode-coach-card">
                <p>
                  <strong>{selectedModeStrategy.label}</strong> alignment {modeAlignmentScore}%.
                </p>
                <p>{modeCoachTip}</p>
                <p className="small-copy">{selectedModeRecoveryCue.tip}</p>
              </div>
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
            onSolo={() => soloPanel("left-style-lab")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
          >
            <div className="style-stack">
              <div className="style-group style-lane-group">
                <div className="style-recipe-head">
                  <span className="style-label">Style lane</span>
                  <span className="small-copy">Structured bundle that syncs recipe, persona, and readability target.</span>
                </div>
                <label className="style-control">
                  <span>Lane</span>
                  <select value={styleLaneId} title={selectedStyleLane.summary} onChange={(event) => setStyleLaneId(event.target.value as StyleLaneId)}>
                    {STYLE_LANE_OPTIONS.map((lane) => (
                      <option key={lane.id} value={lane.id}>
                        {lane.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="style-lane-grid">
                  {STYLE_LANE_OPTIONS.map((lane) => (
                    <button
                      key={lane.id}
                      className={`style-lane-card ${styleLaneId === lane.id ? "active" : ""}`}
                      type="button"
                      onClick={() => setStyleLaneId(lane.id)}
                      aria-pressed={styleLaneId === lane.id}
                    >
                      <strong>{lane.label}</strong>
                      <span>{lane.summary}</span>
                    </button>
                  ))}
                </div>
                <div className="compact-grid">
                  <button className="chip" type="button" onClick={() => applyStyleLane(styleLaneId)}>
                    Apply style lane
                  </button>
                </div>
                <article className="style-lane-card-detail">
                  <div className="meter-head">
                    <span>{selectedStyleLane.label} alignment</span>
                    <span>{styleLaneAlignmentScore}%</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${styleLaneAlignmentScore}%` }}></span>
                  </div>
                  <p className="small-copy">
                    Recipe <strong>{selectedStyleRecipe.label}</strong>, persona <strong>{selectedStylePersona.label}</strong>, target{" "}
                    <strong>{selectedStyleReadabilityTarget.label}</strong>.
                  </p>
                  <p className="small-copy">{styleLaneTip}</p>
                  <p className="small-copy">{selectedStyleLane.tip}</p>
                </article>
              </div>

              <div className="style-group style-assist-group">
                <div className="style-recipe-head">
                  <span className="style-label">Style assist</span>
                  <span className="small-copy">Structured coaching presets that synchronize lane, recipe, and persona for your audience.</span>
                </div>
                <label className="style-control">
                  <span>Assist profile</span>
                  <select
                    value={styleAssistPresetId}
                    title={selectedStyleAssist.summary}
                    onChange={(event) => setStyleAssistPresetId(event.target.value as StyleAssistPresetId)}
                  >
                    {STYLE_ASSIST_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="style-assist-grid">
                  {STYLE_ASSIST_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      className={`style-lane-card ${styleAssistPresetId === option.id ? "active" : ""}`}
                      type="button"
                      aria-pressed={styleAssistPresetId === option.id}
                      onClick={() => setStyleAssistPresetId(option.id)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.summary}</span>
                    </button>
                  ))}
                </div>
                <div className="compact-grid">
                  <button className="chip" type="button" onClick={() => applyStyleAssistPreset()}>
                    Apply style assist
                  </button>
                </div>
                <article className="style-lane-card-detail">
                  <div className="meter-head">
                    <span>{selectedStyleAssist.label} alignment</span>
                    <span>{styleAssistAlignmentScore}%</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${styleAssistAlignmentScore}%` }}></span>
                  </div>
                  <p className="small-copy">{selectedStyleAssist.summary}</p>
                  <p className="small-copy">{styleAssistTip}</p>
                  <p className="small-copy">{selectedStyleAssist.tip}</p>
                </article>
              </div>

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

              <div className="style-group style-readability-group">
                <div className="style-recipe-head">
                  <span className="style-label">Readability target</span>
                  <span className="small-copy">Structured rhythm presets with measurable readability coaching.</span>
                </div>
                <label className="style-control">
                  <span>Target</span>
                  <select
                    value={styleReadabilityTargetId}
                    title={selectedStyleReadabilityTarget.summary}
                    onChange={(event) => setStyleReadabilityTargetId(event.target.value as StyleReadabilityTargetId)}
                  >
                    {STYLE_READABILITY_TARGET_OPTIONS.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="compact-grid">
                  {STYLE_READABILITY_TARGET_OPTIONS.map((target) => (
                    <button
                      key={target.id}
                      className={`chip ${styleReadabilityTargetId === target.id ? "active" : ""}`}
                      type="button"
                      aria-pressed={styleReadabilityTargetId === target.id}
                      onClick={() => setStyleReadabilityTargetId(target.id)}
                    >
                      {target.label}
                    </button>
                  ))}
                  <button className="chip" type="button" onClick={() => applyStyleReadabilityTarget()}>
                    Apply target
                  </button>
                </div>
                <article className="style-readability-card">
                  <div className="meter-head">
                    <span>{selectedStyleReadabilityTarget.label} score</span>
                    <span>{readabilityScore}%</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${readabilityScore}%` }}></span>
                  </div>
                  <p className="small-copy">{selectedStyleReadabilityTarget.summary}</p>
                  <p className="small-copy">{readabilityTip}</p>
                  <p className="small-copy">{selectedStyleReadabilityTarget.tip}</p>
                </article>
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
            onSolo={() => soloPanel("left-outline")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
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
              <label className="style-control">
                <span>Focus lens</span>
                <select
                  value={outlineFocusLens}
                  title={selectedOutlineFocusLens.tip}
                  onChange={(event) => setOutlineFocusLens(event.target.value as OutlineFocusLens)}
                >
                  {OUTLINE_FOCUS_LENS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="style-control">
                <span>Window radius</span>
                <select
                  value={String(outlineFocusWindow)}
                  onChange={(event) => setOutlineFocusWindow(Number(event.target.value) as OutlineFocusWindow)}
                  disabled={outlineFocusLens !== "active-window"}
                >
                  {OUTLINE_FOCUS_WINDOW_OPTIONS.map((option) => (
                    <option key={option.value} value={String(option.value)}>
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
                <button className="chip" type="button" onClick={() => moveOutlineLensSelection(-1)}>
                  Prev in lens
                </button>
                <button className="chip" type="button" onClick={() => moveOutlineLensSelection(1)}>
                  Next in lens
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
                <p className="small-copy">
                  Lens: {outlineLensTip} Showing {visibleOutline.length}/{scopedOutline.length || 0} scoped headings (
                  {outlineScopedCoverageRatio}%).
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
                    {outlineFocusLens !== "all-visible" ? (
                      <span className={`outline-lens-badge ${activeSectionKey === item.key ? "active" : ""}`}>
                        {activeSectionKey === item.key ? "Active" : outlineFocusLens === "active-trail" ? "Trail" : "Context"}
                      </span>
                    ) : null}
                  </button>
                  <button className="outline-toggle" type="button" onClick={() => toggleSection(item)}>
                    {collapsedKeys.includes(item.key) ? "Open" : "Fold"}
                  </button>
                </div>
              ))}
              {!visibleOutline.length ? <p className="small-copy">No headings in this lens. Relax filters to continue.</p> : null}
            </div>
          </PanelSection>

          <PanelSection
            sectionId="left-minimap"
            title="Minimap"
            copy="A compressed skyline of the document, tuned for fast navigation."
            collapsed={isPanelCollapsed("left-minimap")}
            onToggle={() => togglePanel("left-minimap")}
            onSolo={() => soloPanel("left-minimap")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
          >
            <div className="minimap-strategy-group">
              <div className="mode-strategy-head">
                <span>Minimap strategy</span>
                <label className="minimap-control">
                  <span>Strategy</span>
                  <select
                    value={minimapStrategyId}
                    title={selectedMinimapStrategy.summary}
                    onChange={(event) => setMinimapStrategyId(event.target.value as MinimapStrategyId)}
                  >
                    {MINIMAP_STRATEGY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mode-strategy-grid">
                {MINIMAP_STRATEGY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`mode-scene-card ${minimapStrategyId === option.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setMinimapStrategyId(option.id)}
                    aria-pressed={minimapStrategyId === option.id}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                  </button>
                ))}
              </div>
              <div className="compact-grid">
                <button className="chip" type="button" onClick={() => applyMinimapStrategy()}>
                  Apply minimap strategy
                </button>
              </div>
              <p className="small-copy">{selectedMinimapStrategy.tip}</p>
            </div>
            <div className="minimap-strategy-group minimap-lane-group">
              <div className="mode-strategy-head">
                <span>Minimap coach lane</span>
                <label className="minimap-control">
                  <span>Lane</span>
                  <select
                    value={minimapCoachLaneId}
                    title={selectedMinimapCoachLane.summary}
                    onChange={(event) => setMinimapCoachLaneId(event.target.value as MinimapCoachLaneId)}
                  >
                    {MINIMAP_COACH_LANE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mode-strategy-grid">
                {MINIMAP_COACH_LANE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`mode-scene-card ${minimapCoachLaneId === option.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setMinimapCoachLaneId(option.id)}
                    aria-pressed={minimapCoachLaneId === option.id}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                  </button>
                ))}
              </div>
              <div className="compact-grid">
                <button className="chip" type="button" onClick={() => applyMinimapCoachLane()}>
                  Apply coach lane
                </button>
                <button className="chip" type="button" onClick={() => jumpToMinimapEdge("first")}>
                  First section
                </button>
                <button className="chip" type="button" onClick={() => jumpToMinimapEdge("last")}>
                  Last section
                </button>
              </div>
              <article className="minimap-coach-card">
                <div className="meter-head">
                  <span>{selectedMinimapCoachLane.label} alignment</span>
                  <span>{minimapCoachLaneScore}%</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${minimapCoachLaneScore}%` }}></span>
                </div>
                <p className="small-copy">{minimapLaneTip}</p>
                <p className="small-copy">{selectedMinimapCoachLane.tip}</p>
              </article>
            </div>
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
              <label className="minimap-control">
                <span>Jump stride</span>
                <select
                  value={String(minimapJumpStride)}
                  title={`${minimapJumpStride} section jump stride`}
                  onChange={(event) => setMinimapJumpStride(Number(event.target.value) as MinimapJumpStride)}
                >
                  {MINIMAP_JUMP_STRIDE_OPTIONS.map((option) => (
                    <option key={option.value} value={String(option.value)}>
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
              <button className="chip" type="button" onClick={() => jumpToMinimapEdge("first")}>
                Jump first
              </button>
              <button className="chip" type="button" onClick={() => jumpToMinimapEdge("last")}>
                Jump last
              </button>
              <button className="chip" type="button" onClick={() => applyNavigationProfilePreset()}>
                Apply navigation profile
              </button>
            </div>
            <p className="small-copy minimap-tip">
              {selectedNavigationProfile.copy} Depth: {selectedMinimapDepthOption.label}.{" "}
              {minimapVisibleOutline.length} sections shown. Jump stride: {minimapJumpStride}.
            </p>
            <div className="minimap-coach-card">
              <p>
                <strong>{selectedMinimapStrategy.label}</strong> alignment {minimapStrategyScore}%.
              </p>
              <p>
                Coverage {minimapCoverageRatio}% with {minimapVisibleOutline.length} visible sections. Estimated scan load{" "}
                {Math.max(1, minimapLoadPerStep)} steps.
              </p>
              <p className="small-copy">{minimapCoachTip}</p>
            </div>
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
              {activeEditor.isActive("table") ? (
                <>
                  <ToolbarInput label="Cell bg">
                    <input
                      type="color"
                      value={toHexColor(tableCellBackgroundRgba)}
                      onChange={(event) => {
                        const nextColor = parseCssColor(event.target.value, tableCellBackgroundRgba);
                        setTableCellBackgroundRgba(nextColor);
                        applyTableCellBackgroundColor(toRgbaString(nextColor));
                      }}
                    />
                  </ToolbarInput>
                  <ToolbarInput label="Grid">
                    <input
                      type="color"
                      value={toHexColor(tableGridRgba)}
                      onChange={(event) => {
                        const nextColor = parseCssColor(event.target.value, tableGridRgba);
                        setTableGridRgba(nextColor);
                        applyTableGridColor(toRgbaString(nextColor));
                      }}
                    />
                  </ToolbarInput>
                  <ToolbarButton label="Row+" active={false} disabled={!activeEditor.can().addRowAfter()} onClick={() => handleToolbar(() => activeEditor.chain().focus().addRowAfter().run())} />
                  <ToolbarButton label="Col+" active={false} disabled={!activeEditor.can().addColumnAfter()} onClick={() => handleToolbar(() => activeEditor.chain().focus().addColumnAfter().run())} />
                  <ToolbarButton
                    label="Merge/Split"
                    active={false}
                    disabled={!activeEditor.can().mergeOrSplit()}
                    onClick={() => handleToolbar(() => activeEditor.chain().focus().mergeOrSplit().run())}
                  />
                  <ToolbarButton
                    label="Clear cell"
                    active={false}
                    onClick={() => handleToolbar(() => applyTableCellBackgroundColor(null))}
                  />
                  <ToolbarButton
                    label="Clear grid"
                    active={false}
                    onClick={() => handleToolbar(() => applyTableGridColor(null))}
                  />
                  <ToolbarButton
                    label="Delete table"
                    active={false}
                    disabled={!activeEditor.can().deleteTable()}
                    onClick={() => handleToolbar(() => activeEditor.chain().focus().deleteTable().run())}
                  />
                </>
              ) : null}
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
              <span className="hud-pill">{selectedWorkspaceIntent.label} intent</span>
              <span className="hud-pill">{selectedEditorCoach.label} coach</span>
              <span className="hud-pill">{selectedLearningLane.label} lane</span>
              <span className="hud-pill">{selectedSessionTempo.label} tempo</span>
              <span>{selectedGuidanceOption.copy}</span>
              <span>{selectedWorkflowTrack.copy}</span>
              <span>{selectedNavigationProfile.copy}</span>
              <span>{selectedWorkspaceIntent.summary}</span>
              <span>{selectedEditorCoach.summary}</span>
              <span>{selectedLearningLane.summary}</span>
              <span>{selectedSessionTempo.summary}</span>
              <span>Density: {selectedDensityOption.label}</span>
              <span>Tempo alignment: {sessionTempoAlignmentScore}%</span>
              <span>Workspace intent alignment: {workspaceIntentAlignmentScore}%</span>
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
              <button className="chip" type="button" onClick={() => applyEditorCoachPreset()}>
                Apply editor coach
              </button>
              <button className="chip" type="button" onClick={() => applyLearningLane()}>
                Apply learning lane
              </button>
              <button className="chip" type="button" onClick={() => applySessionTempo()}>
                Apply tempo preset
              </button>
              <button className="chip" type="button" onClick={() => applyWorkspaceIntentPreset()}>
                Apply workspace intent
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
            onSolo={() => soloPanel("right-document-pulse")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
          >
            <div className="pulse-coach-group">
              <label className="style-control">
                <span>Pulse coach</span>
                <select
                  value={pulseCoachPresetId}
                  title={selectedPulseCoach.summary}
                  onChange={(event) => setPulseCoachPresetId(event.target.value as PulseCoachPresetId)}
                >
                  {PULSE_COACH_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="compact-grid">
                {PULSE_COACH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`chip ${pulseCoachPresetId === option.id ? "active" : ""}`}
                    type="button"
                    aria-pressed={pulseCoachPresetId === option.id}
                    onClick={() => setPulseCoachPresetId(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
                <button className="chip" type="button" onClick={() => applyPulseCoachPreset()}>
                  Apply pulse coach
                </button>
              </div>
              <p className="small-copy">{selectedPulseCoach.summary}</p>
            </div>
            <div className="pulse-intervention-group">
              <label className="style-control">
                <span>Intervention</span>
                <select
                  value={pulseInterventionId}
                  title={selectedPulseIntervention.summary}
                  onChange={(event) => setPulseInterventionId(event.target.value as PulseInterventionId)}
                >
                  {PULSE_INTERVENTION_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="pulse-intervention-grid">
                {PULSE_INTERVENTION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`chip ${pulseInterventionId === option.id ? "active" : ""}`}
                    type="button"
                    aria-pressed={pulseInterventionId === option.id}
                    onClick={() => setPulseInterventionId(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
                <button className="chip" type="button" onClick={() => applyPulseIntervention()}>
                  Run intervention
                </button>
              </div>
              <article className="pulse-coach-card pulse-intervention-card">
                <div className="meter-head">
                  <span>{selectedPulseIntervention.label} readiness</span>
                  <span>{pulseInterventionScore}%</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${pulseInterventionScore}%` }}></span>
                </div>
                <p className="small-copy">{selectedPulseIntervention.summary}</p>
                <p className="small-copy">{pulseInterventionTip}</p>
                <p className="small-copy">{selectedPulseIntervention.tip}</p>
              </article>
            </div>
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
            <p className="small-copy pulse-lens-copy">
              Autosnapshot cadence: <strong>{selectedRevisionCadence.label}</strong> (idle {Math.round(selectedRevisionCadence.idleMs / 1000)}s,
              structure {selectedRevisionCadence.structureMs}ms).
            </p>
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
            <article className="pulse-coach-card">
              <div className="meter-head">
                <span>Revision rhythm</span>
                <span>{pulseRhythmScore}%</span>
              </div>
              <div className="meter">
                <span style={{ width: `${pulseRhythmScore}%` }}></span>
              </div>
              <p className="small-copy">
                {averageSnapshotCadence === null
                  ? "No cadence baseline yet. Capture at least two checkpoints."
                  : `Average checkpoint cadence is ${averageSnapshotCadence} min.`}
              </p>
              <p className="small-copy">
                Tip: {pulseCoachTip}
                {guidanceLevel === "expert" ? " Expert mode keeps this card concise." : ""}
              </p>
            </article>
          </PanelSection>

          <PanelSection
            sectionId="right-find-replace"
            title="Find + Replace"
            copy="Search through the document without leaving the keyboard."
            collapsed={isPanelCollapsed("right-find-replace")}
            onToggle={() => togglePanel("right-find-replace")}
            onSolo={() => soloPanel("right-find-replace")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
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
                <label className="style-control">
                  <span>Coach mode</span>
                  <select value={findCoachMode} onChange={(event) => setFindCoachMode(event.target.value as FindCoachMode)}>
                    {FIND_COACH_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="style-control">
                  <span>Preview rows</span>
                  <select
                    value={String(findPreviewLimit)}
                    onChange={(event) => setFindPreviewLimit(Number(event.target.value) as FindPreviewLimit)}
                  >
                    {FIND_PREVIEW_LIMIT_OPTIONS.map((option) => (
                      <option key={option.value} value={String(option.value)}>
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
                  <button className="chip" type="button" onClick={useSelectionAsFindQuery} disabled={!activeSelectionSeed}>
                    Seed from selection
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
              {findPreviewMatches.length ? (
                <div className="find-preview-list">
                  {findPreviewMatches.map((match, index) => {
                    const matchIndex = findPreviewStartIndex + index;
                    return (
                      <button
                        key={`${match.from}-${match.to}`}
                        type="button"
                        className={`find-preview-item ${matchIndex === activeMatchIndex ? "active" : ""}`}
                        onClick={() => jumpToMatchIndex(matchIndex)}
                      >
                        <span className="find-preview-meta">Match {matchIndex + 1}</span>
                        <span className="find-preview-from">{match.excerpt}</span>
                        <span className="find-preview-to">
                          {buildReplacementPreview(match.excerpt, findQuery, replaceValue, findCaseSensitive, replaceTransform)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
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
                <p className="small-copy">
                  Coach: {selectedFindCoachMode.tip}
                  {findCoachMode === "audit" ? ` ${findRiskMessage}` : ""}
                </p>
                {findCoachMode !== "quick" ? (
                  <p className={`small-copy find-risk-note risk-${findRiskLevel}`}>
                    Replace-all risk: {findRiskLevel.toUpperCase()}.
                  </p>
                ) : null}
              </article>
            </div>
          </PanelSection>

          <PanelSection
            sectionId="right-interaction-block"
            title="Chunk Builder"
            copy="Open a dedicated chunk-builder page and pass changes back to this editor."
            collapsed={isPanelCollapsed("right-interaction-block")}
            onToggle={() => togglePanel("right-interaction-block")}
            onSolo={() => soloPanel("right-interaction-block")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
          >
            <div className="chunk-empty">
              <div className="chunk-coach-group">
                <label className="style-control">
                  <span>Coach lane</span>
                  <select
                    value={chunkCoachMode}
                    title={selectedChunkCoachMode.summary}
                    onChange={(event) => setChunkCoachMode(event.target.value as ChunkCoachMode)}
                  >
                    {CHUNK_COACH_MODE_OPTIONS.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="compact-grid">
                  {CHUNK_COACH_MODE_OPTIONS.map((mode) => (
                    <button
                      key={mode.id}
                      className={`chip ${chunkCoachMode === mode.id ? "active" : ""}`}
                      type="button"
                      aria-pressed={chunkCoachMode === mode.id}
                      onClick={() => setChunkCoachMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                  <button className="chip" type="button" onClick={() => applyChunkCoachMode()}>
                    Apply coach lane
                  </button>
                </div>
                <article className="chunk-coach-card">
                  <div className="meter-head">
                    <span>{selectedChunkCoachMode.label} preflight</span>
                    <span>{chunkPreflightScore}%</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${chunkPreflightScore}%` }}></span>
                  </div>
                  <p className="small-copy">{selectedChunkCoachMode.summary}</p>
                  <p className="small-copy">{chunkCoachTip}</p>
                  <p className="small-copy">{selectedChunkCoachMode.tip}</p>
                </article>
              </div>
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
              <div className="chunk-delivery-group">
                <label className="style-control">
                  <span>Delivery mode</span>
                  <select
                    value={chunkDeliveryModeId}
                    title={selectedChunkDeliveryMode.summary}
                    onChange={(event) => setChunkDeliveryModeId(event.target.value as ChunkDeliveryModeId)}
                  >
                    {CHUNK_DELIVERY_MODE_OPTIONS.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="compact-grid">
                  {CHUNK_DELIVERY_MODE_OPTIONS.map((mode) => (
                    <button
                      key={mode.id}
                      className={`chip ${chunkDeliveryModeId === mode.id ? "active" : ""}`}
                      type="button"
                      aria-pressed={chunkDeliveryModeId === mode.id}
                      onClick={() => setChunkDeliveryModeId(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                  <button className="chip" type="button" onClick={() => applyChunkDeliveryMode()}>
                    Apply delivery mode
                  </button>
                </div>
                <article className="chunk-delivery-card">
                  <div className="meter-head">
                    <span>{selectedChunkDeliveryMode.label} alignment</span>
                    <span>{chunkDeliveryScore}%</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${chunkDeliveryScore}%` }}></span>
                  </div>
                  <p className="small-copy">
                    Intent <strong>{selectedChunkIntentProfile.label}</strong>, layout {chunkBuilderLayout}, density{" "}
                    {chunkBuilderDensity}. Engine target: {selectedChunkDeliveryMode.engine === "javascript" ? "JavaScript" : "Pure HTML"}.
                  </p>
                  <p className="small-copy">{chunkDeliveryTip}</p>
                  <p className="small-copy">
                    Suggested template: <strong>{chunkDeliveryTemplate?.label ?? selectedChunkIntentProfile.templateId}</strong>.{" "}
                    {selectedChunkDeliveryMode.tip}
                  </p>
                </article>
              </div>
              <div className="chunk-launch-group">
                <label className="style-control">
                  <span>Launch plan</span>
                  <select
                    value={chunkLaunchPlanId}
                    title={selectedChunkLaunchPlan.summary}
                    onChange={(event) => setChunkLaunchPlanId(event.target.value as ChunkLaunchPlanId)}
                  >
                    {CHUNK_LAUNCH_PLAN_OPTIONS.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="compact-grid">
                  {CHUNK_LAUNCH_PLAN_OPTIONS.map((plan) => (
                    <button
                      key={plan.id}
                      className={`chip ${chunkLaunchPlanId === plan.id ? "active" : ""}`}
                      type="button"
                      aria-pressed={chunkLaunchPlanId === plan.id}
                      onClick={() => setChunkLaunchPlanId(plan.id)}
                    >
                      {plan.label}
                    </button>
                  ))}
                  <button className="chip" type="button" onClick={() => runChunkLaunchPlan()}>
                    Run launch plan
                  </button>
                </div>
                <article className="chunk-launch-card">
                  <div className="meter-head">
                    <span>{selectedChunkLaunchPlan.label} readiness</span>
                    <span>{chunkLaunchReadinessScore}%</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${chunkLaunchReadinessScore}%` }}></span>
                  </div>
                  <p className="small-copy">{selectedChunkLaunchPlan.summary}</p>
                  <p className="small-copy">{chunkLaunchTip}</p>
                  <p className="small-copy">{selectedChunkLaunchPlan.tip}</p>
                </article>
              </div>
              <article className="chunk-preflight-card">
                <div className="meter-head">
                  <span>Preflight checks</span>
                  <span>
                    {chunkPreflightPassCount}/{chunkPreflightChecks.length}
                  </span>
                </div>
                <div className="chunk-preflight-list">
                  {chunkPreflightChecks.map((check) => (
                    <div key={check.label} className={`chunk-preflight-item ${check.pass ? "pass" : "fail"}`}>
                      <span className={`chunk-preflight-badge ${check.pass ? "pass" : "fail"}`}>{check.pass ? "Pass" : "Fix"}</span>
                      <div>
                        <strong>{check.label}</strong>
                        <p className="small-copy">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
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
            onSolo={() => soloPanel("right-revisions")}
            onExpandAll={expandAllPanels}
            guidanceLevel={guidanceLevel}
          >
            <div className="revision-strategy-group">
              <label className="style-control">
                <span>Revision strategy</span>
                <select
                  value={revisionStrategyId}
                  title={selectedRevisionStrategy.summary}
                  onChange={(event) => setRevisionStrategyId(event.target.value as RevisionStrategyId)}
                >
                  {REVISION_STRATEGY_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="compact-grid">
                {REVISION_STRATEGY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`chip ${revisionStrategyId === option.id ? "active" : ""}`}
                    type="button"
                    aria-pressed={revisionStrategyId === option.id}
                    onClick={() => setRevisionStrategyId(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
                <button className="chip" type="button" onClick={() => applyRevisionStrategy()}>
                  Apply revision strategy
                </button>
              </div>
              <p className="small-copy">{selectedRevisionStrategy.summary}</p>
            </div>
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
              <label className="style-control">
                <span>Diff depth</span>
                <select
                  value={revisionDiffDepth}
                  title={`${selectedRevisionDiffDepth.limit} diff blocks`}
                  onChange={(event) => setRevisionDiffDepth(event.target.value as RevisionDiffDepth)}
                >
                  {REVISION_DIFF_DEPTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="revision-guard-grid">
              <label className="style-control">
                <span>Timeline lens</span>
                <select
                  value={revisionTimelineLens}
                  title={selectedRevisionTimelineLens.tip}
                  onChange={(event) => setRevisionTimelineLens(event.target.value as RevisionTimelineLens)}
                >
                  {REVISION_TIMELINE_LENS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="style-control">
                <span>Restore guard</span>
                <select
                  value={revisionRestoreGuard}
                  title={selectedRevisionRestoreGuard.tip}
                  onChange={(event) => setRevisionRestoreGuard(event.target.value as RevisionRestoreGuard)}
                >
                  {REVISION_RESTORE_GUARD_OPTIONS.map((option) => (
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
                    setPendingRestoreSnapshotId(null);
                  }
                }}
              >
                Jump latest in filter
              </button>
              <button type="button" onClick={() => moveRevisionSelection(-1)}>
                Previous snapshot
              </button>
              <button type="button" onClick={() => moveRevisionSelection(1)}>
                Next snapshot
              </button>
            </div>
            <p className="small-copy revision-meta-copy">
              {filteredSnapshots.length} visible snapshots.{" "}
              {averageSnapshotCadence === null
                ? "Capture two checkpoints to unlock cadence coaching."
                : `Average capture cadence: ${averageSnapshotCadence} min.`}{" "}
              {latestSnapshotAgeMinutes === null ? "" : `Latest snapshot age: ${formatAgeMinutes(latestSnapshotAgeMinutes)}.`}{" "}
              Lens coverage: {revisionTimelineCoverage}%.
            </p>
            <article className="revision-coach-card">
              <div className="revision-summary">
                <span>Net change {revisionNetChange >= 0 ? `+${revisionNetChange}` : revisionNetChange}</span>
                <span>Focus: {selectedRevisionStrategy.label}</span>
                <span>Depth: {selectedRevisionDiffDepth.label}</span>
              </div>
              <p className="small-copy">
                Tip: {revisionCoachTip}
                {guidanceLevel === "expert" ? " Expert mode keeps this recommendation compact." : ""}
              </p>
              <p className="small-copy">Timeline: {revisionTimelineTip}</p>
              <p className="small-copy">
                Guard: {selectedRevisionRestoreGuard.tip} {revisionGuardStatus}
              </p>
            </article>

            <div className="revision-list">
              {filteredSnapshots.map((snapshot) => (
                <article
                  key={snapshot.id}
                  className={`revision-card ${snapshot.id === selectedSnapshotId ? "active" : ""} ${pendingRestoreSnapshotId === snapshot.id ? "pending-restore" : ""}`}
                >
                  <button
                    type="button"
                    className="revision-select"
                    onClick={() => {
                      setSelectedSnapshotId(snapshot.id);
                      if (pendingRestoreSnapshotId && pendingRestoreSnapshotId !== snapshot.id) {
                        setPendingRestoreSnapshotId(null);
                      }
                    }}
                  >
                    <strong>{snapshot.reason === "manual-checkpoint" ? "Checkpoint" : snapshot.reason === "restore" ? "Restore" : "Autosave"}</strong>
                    <span>{formatTime(snapshot.createdAt)}</span>
                  </button>
                  <button
                    type="button"
                    className="revision-restore"
                    onClick={() => requestSnapshotRestore(snapshot)}
                    title={
                      revisionRestoreGuard === "fast"
                        ? "Restore now"
                        : revisionRestoreGuard === "confirm"
                          ? pendingRestoreSnapshotId === snapshot.id
                            ? "Click again to confirm restore"
                            : "Arm this snapshot for confirmation"
                          : selectedSnapshotId === snapshot.id
                            ? "Click again to restore after diff review"
                            : "Select this snapshot first to review diff"
                    }
                  >
                    {pendingRestoreSnapshotId === snapshot.id ? "Confirm restore" : "Restore"}
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
                  {focusedRevisionDiff.slice(0, selectedRevisionDiffDepth.limit).map((block, index) => (
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
  onSolo,
  onExpandAll,
  guidanceLevel,
}: {
  sectionId: string;
  title: string;
  copy: string;
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  onSolo?: () => void;
  onExpandAll?: () => void;
  guidanceLevel?: GuidanceLevel;
}) {
  const contentId = `${sectionId}-content`;
  const guidanceLabel = guidanceLevel ? GUIDANCE_OPTIONS.find((option) => option.value === guidanceLevel)?.label : null;

  return (
    <section className={`panel-section ${collapsed ? "collapsed" : ""}`}>
      <div className="section-heading">
        <div className="section-heading-copy">
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <div className="section-heading-tools">
          {guidanceLabel ? <span className="section-guidance-badge">{guidanceLabel}</span> : null}
          <div className="section-quick-actions">
            {onSolo ? (
              <button className="section-toggle" type="button" onClick={onSolo}>
                Solo
              </button>
            ) : null}
            {onExpandAll ? (
              <button className="section-toggle" type="button" onClick={onExpandAll}>
                Expand all
              </button>
            ) : null}
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
        </div>
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
      id: "table-add-row",
      label: "Table row below",
      description: "Add a new row after the active table row.",
      group: "insert",
      surface: "palette",
      run: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      id: "table-add-column",
      label: "Table column right",
      description: "Add a new column after the active table column.",
      group: "insert",
      surface: "palette",
      run: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      id: "table-merge-split",
      label: "Table merge/split",
      description: "Merge selected cells or split a merged cell.",
      group: "format",
      surface: "palette",
      run: () => editor.chain().focus().mergeOrSplit().run(),
    },
    {
      id: "table-delete",
      label: "Delete table",
      description: "Remove the current table from the document.",
      group: "insert",
      surface: "palette",
      run: () => editor.chain().focus().deleteTable().run(),
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
  const parent = editor.state.selection.$anchor.parent;
  return parent.type.name !== "codeBlock";
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
      table { border-collapse: collapse; width: 100%; --table-grid-color: rgba(0,0,0,0.12); }
      td, th { border: 1px solid var(--table-grid-color); padding: 0.6rem; position: relative; }
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

function readWorkspaceIntentPreference(): WorkspaceIntentPresetId {
  try {
    const raw = localStorage.getItem(WORKSPACE_INTENT_PREFS_KEY);
    if (raw === "onboard-clarity" || raw === "balanced-production" || raw === "ship-readiness") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced-production";
}

function writeWorkspaceIntentPreference(value: WorkspaceIntentPresetId) {
  try {
    localStorage.setItem(WORKSPACE_INTENT_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readPanelFocusPresetPreference(): PanelFocusPresetId {
  try {
    const raw = localStorage.getItem(PANEL_FOCUS_PRESET_PREFS_KEY);
    if (raw === "balanced-overview" || raw === "structure-sweep" || raw === "revision-sprint") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced-overview";
}

function writePanelFocusPresetPreference(value: PanelFocusPresetId) {
  try {
    localStorage.setItem(PANEL_FOCUS_PRESET_PREFS_KEY, value);
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

function readSessionGoalPreference(): SessionGoalPresetId {
  try {
    const raw = localStorage.getItem(SESSION_GOAL_PREFS_KEY);
    if (raw === "draft-momentum" || raw === "structure-tune" || raw === "ship-check") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "structure-tune";
}

function writeSessionGoalPreference(value: SessionGoalPresetId) {
  try {
    localStorage.setItem(SESSION_GOAL_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readEditorCoachPreference(): EditorCoachPresetId {
  try {
    const raw = localStorage.getItem(EDITOR_COACH_PREFS_KEY);
    if (raw === "learn-loop" || raw === "steady-shift" || raw === "ship-rigorous") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "steady-shift";
}

function writeEditorCoachPreference(value: EditorCoachPresetId) {
  try {
    localStorage.setItem(EDITOR_COACH_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readLearningLanePreference(): LearningLaneId {
  try {
    const raw = localStorage.getItem(LEARNING_LANE_PREFS_KEY);
    if (raw === "teach-me" || raw === "steady-work" || raw === "ship-fast") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "steady-work";
}

function writeLearningLanePreference(value: LearningLaneId) {
  try {
    localStorage.setItem(LEARNING_LANE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readRevisionCadencePreference(): RevisionCadenceProfileId {
  try {
    const raw = localStorage.getItem(REVISION_CADENCE_PREFS_KEY);
    if (raw === "gentle" || raw === "balanced" || raw === "intensive") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced";
}

function writeRevisionCadencePreference(value: RevisionCadenceProfileId) {
  try {
    localStorage.setItem(REVISION_CADENCE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readSessionTempoPreference(): SessionTempoPresetId {
  try {
    const raw = localStorage.getItem(SESSION_TEMPO_PREFS_KEY);
    if (raw === "steady-atelier" || raw === "focus-sprint" || raw === "handoff-runway") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "steady-atelier";
}

function writeSessionTempoPreference(value: SessionTempoPresetId) {
  try {
    localStorage.setItem(SESSION_TEMPO_PREFS_KEY, value);
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

function readModeStrategyPreference(): ModeStrategyId {
  try {
    const raw = localStorage.getItem(MODE_STRATEGY_PREFS_KEY);
    if (raw === "momentum-lane" || raw === "sprint-recovery" || raw === "qa-rails") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "sprint-recovery";
}

function writeModeStrategyPreference(value: ModeStrategyId) {
  try {
    localStorage.setItem(MODE_STRATEGY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readModeRecoveryCuePreference(): ModeRecoveryCue {
  try {
    const raw = localStorage.getItem(MODE_RECOVERY_CUE_PREFS_KEY);
    if (raw === "checkpoint-first" || raw === "open-structure" || raw === "focus-reset") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "open-structure";
}

function writeModeRecoveryCuePreference(value: ModeRecoveryCue) {
  try {
    localStorage.setItem(MODE_RECOVERY_CUE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readModeGuidanceLanePreference(): ModeGuidanceLaneId {
  try {
    const raw = localStorage.getItem(MODE_GUIDANCE_LANE_PREFS_KEY);
    if (raw === "orient-and-write" || raw === "sustain-flow" || raw === "handoff-guard") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "sustain-flow";
}

function writeModeGuidanceLanePreference(value: ModeGuidanceLaneId) {
  try {
    localStorage.setItem(MODE_GUIDANCE_LANE_PREFS_KEY, value);
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

function readMinimapStrategyPreference(): MinimapStrategyId {
  try {
    const raw = localStorage.getItem(MINIMAP_STRATEGY_PREFS_KEY);
    if (raw === "context-ladder" || raw === "fast-scan" || raw === "ship-verifier") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "fast-scan";
}

function writeMinimapStrategyPreference(value: MinimapStrategyId) {
  try {
    localStorage.setItem(MINIMAP_STRATEGY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readMinimapJumpStridePreference(): MinimapJumpStride {
  try {
    const raw = localStorage.getItem(MINIMAP_JUMP_STRIDE_PREFS_KEY);
    if (raw === "1" || raw === "2" || raw === "3") {
      return Number(raw) as MinimapJumpStride;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return 1;
}

function writeMinimapJumpStridePreference(value: MinimapJumpStride) {
  try {
    localStorage.setItem(MINIMAP_JUMP_STRIDE_PREFS_KEY, String(value));
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readMinimapCoachLanePreference(): MinimapCoachLaneId {
  try {
    const raw = localStorage.getItem(MINIMAP_COACH_LANE_PREFS_KEY);
    if (raw === "map-learn" || raw === "scan-balance" || raw === "audit-handoff") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "scan-balance";
}

function writeMinimapCoachLanePreference(value: MinimapCoachLaneId) {
  try {
    localStorage.setItem(MINIMAP_COACH_LANE_PREFS_KEY, value);
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

function readPulseCoachPreference(): PulseCoachPresetId {
  try {
    const raw = localStorage.getItem(PULSE_COACH_PREFS_KEY);
    if (raw === "cadence-guard" || raw === "structure-shape" || raw === "release-readiness") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "cadence-guard";
}

function writePulseCoachPreference(value: PulseCoachPresetId) {
  try {
    localStorage.setItem(PULSE_COACH_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readPulseInterventionPreference(): PulseInterventionId {
  try {
    const raw = localStorage.getItem(PULSE_INTERVENTION_PREFS_KEY);
    if (raw === "stabilize-flow" || raw === "rebalance-structure" || raw === "prep-handoff") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "rebalance-structure";
}

function writePulseInterventionPreference(value: PulseInterventionId) {
  try {
    localStorage.setItem(PULSE_INTERVENTION_PREFS_KEY, value);
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

function readRevisionStrategyPreference(): RevisionStrategyId {
  try {
    const raw = localStorage.getItem(REVISION_STRATEGY_PREFS_KEY);
    if (raw === "checkpoint-qa" || raw === "growth-audit" || raw === "trim-pass") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "checkpoint-qa";
}

function writeRevisionStrategyPreference(value: RevisionStrategyId) {
  try {
    localStorage.setItem(REVISION_STRATEGY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readRevisionDiffDepthPreference(): RevisionDiffDepth {
  try {
    const raw = localStorage.getItem(REVISION_DIFF_DEPTH_PREFS_KEY);
    if (raw === "tight" || raw === "balanced" || raw === "extended") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced";
}

function writeRevisionDiffDepthPreference(value: RevisionDiffDepth) {
  try {
    localStorage.setItem(REVISION_DIFF_DEPTH_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readRevisionRestoreGuardPreference(): RevisionRestoreGuard {
  try {
    const raw = localStorage.getItem(REVISION_RESTORE_GUARD_PREFS_KEY);
    if (raw === "fast" || raw === "confirm" || raw === "diff-first") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "confirm";
}

function writeRevisionRestoreGuardPreference(value: RevisionRestoreGuard) {
  try {
    localStorage.setItem(REVISION_RESTORE_GUARD_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readRevisionTimelineLensPreference(): RevisionTimelineLens {
  try {
    const raw = localStorage.getItem(REVISION_TIMELINE_LENS_PREFS_KEY);
    if (raw === "all" || raw === "last-hour" || raw === "latest-three") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "all";
}

function writeRevisionTimelineLensPreference(value: RevisionTimelineLens) {
  try {
    localStorage.setItem(REVISION_TIMELINE_LENS_PREFS_KEY, value);
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

function readFindCoachModePreference(): FindCoachMode {
  try {
    const raw = localStorage.getItem(FIND_COACH_MODE_PREFS_KEY);
    if (raw === "quick" || raw === "guided" || raw === "audit") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "guided";
}

function writeFindCoachModePreference(value: FindCoachMode) {
  try {
    localStorage.setItem(FIND_COACH_MODE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readFindPreviewLimitPreference(): FindPreviewLimit {
  try {
    const raw = localStorage.getItem(FIND_PREVIEW_LIMIT_PREFS_KEY);
    if (raw === "3" || raw === "6" || raw === "10") {
      return Number(raw) as FindPreviewLimit;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return 6;
}

function writeFindPreviewLimitPreference(value: FindPreviewLimit) {
  try {
    localStorage.setItem(FIND_PREVIEW_LIMIT_PREFS_KEY, String(value));
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

function readChunkCoachModePreference(): ChunkCoachMode {
  try {
    const raw = localStorage.getItem(CHUNK_COACH_MODE_PREFS_KEY);
    if (raw === "learn-safe" || raw === "balanced-flow" || raw === "ship-control") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "balanced-flow";
}

function writeChunkCoachModePreference(value: ChunkCoachMode) {
  try {
    localStorage.setItem(CHUNK_COACH_MODE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readChunkDeliveryModePreference(): ChunkDeliveryModeId {
  try {
    const raw = localStorage.getItem(CHUNK_DELIVERY_MODE_PREFS_KEY);
    if (raw === "lesson-safe" || raw === "demo-live" || raw === "publish-proof") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "demo-live";
}

function writeChunkDeliveryModePreference(value: ChunkDeliveryModeId) {
  try {
    localStorage.setItem(CHUNK_DELIVERY_MODE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readChunkLaunchPlanPreference(): ChunkLaunchPlanId {
  try {
    const raw = localStorage.getItem(CHUNK_LAUNCH_PLAN_PREFS_KEY);
    if (raw === "selected-first" || raw === "delivery-first" || raw === "intent-lab") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "selected-first";
}

function writeChunkLaunchPlanPreference(value: ChunkLaunchPlanId) {
  try {
    localStorage.setItem(CHUNK_LAUNCH_PLAN_PREFS_KEY, value);
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

function readOutlineFocusLensPreference(): OutlineFocusLens {
  try {
    const raw = localStorage.getItem(OUTLINE_FOCUS_LENS_PREFS_KEY);
    if (raw === "all-visible" || raw === "active-window" || raw === "active-trail") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "all-visible";
}

function writeOutlineFocusLensPreference(value: OutlineFocusLens) {
  try {
    localStorage.setItem(OUTLINE_FOCUS_LENS_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readOutlineFocusWindowPreference(): OutlineFocusWindow {
  try {
    const raw = localStorage.getItem(OUTLINE_FOCUS_WINDOW_PREFS_KEY);
    if (raw === "1" || raw === "2" || raw === "3") {
      return Number(raw) as OutlineFocusWindow;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return 2;
}

function writeOutlineFocusWindowPreference(value: OutlineFocusWindow) {
  try {
    localStorage.setItem(OUTLINE_FOCUS_WINDOW_PREFS_KEY, String(value));
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readStyleReadabilityPreference(): StyleReadabilityTargetId {
  try {
    const raw = localStorage.getItem(STYLE_READABILITY_PREFS_KEY);
    if (raw === "scan-light" || raw === "narrative-flow" || raw === "dense-brief") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "narrative-flow";
}

function writeStyleReadabilityPreference(value: StyleReadabilityTargetId) {
  try {
    localStorage.setItem(STYLE_READABILITY_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readStyleLanePreference(): StyleLaneId {
  try {
    const raw = localStorage.getItem(STYLE_LANE_PREFS_KEY);
    if (raw === "teach-clarity" || raw === "steady-narrative" || raw === "ship-contrast") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "steady-narrative";
}

function writeStyleLanePreference(value: StyleLaneId) {
  try {
    localStorage.setItem(STYLE_LANE_PREFS_KEY, value);
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
}

function readStyleAssistPreference(): StyleAssistPresetId {
  try {
    const raw = localStorage.getItem(STYLE_ASSIST_PREFS_KEY);
    if (raw === "clarify-lesson" || raw === "narrative-flow" || raw === "contrast-qa") {
      return raw;
    }
  } catch {
    // Ignore storage errors in hardened standalone/file:// mode.
  }
  return "narrative-flow";
}

function writeStyleAssistPreference(value: StyleAssistPresetId) {
  try {
    localStorage.setItem(STYLE_ASSIST_PREFS_KEY, value);
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

function buildReplacementPreview(
  excerpt: string,
  query: string,
  replacementValue: string,
  caseSensitive: boolean,
  mode: ReplaceTransform,
) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return excerpt;
  }
  const replacement = transformReplacement(replacementValue, mode);
  const flags = caseSensitive ? "g" : "gi";
  const pattern = new RegExp(escapeRegExp(normalizedQuery), flags);
  const replaced = excerpt.replace(pattern, replacement);
  return replaced === excerpt ? excerpt : replaced;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function resolveLengthValueToPx(value: string, fallbackPx: number) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(-?\d*\.?\d+)(px|em|rem|pt)$/);
  if (!match) {
    return fallbackPx;
  }

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) {
    return fallbackPx;
  }
  const unit = match[2];
  if (unit === "em" || unit === "rem") {
    return numeric * 16;
  }
  if (unit === "pt") {
    return numeric * (4 / 3);
  }
  return numeric;
}

function resolveLineHeightToRatio(value: string, fontSizePx: number) {
  const parsed = parseLineHeightValue(value, "1.7");
  const numeric = Number.parseFloat(parsed.numberValue);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1.7;
  }
  if (parsed.unit === "unitless") {
    return numeric;
  }
  if (parsed.unit === "%") {
    return numeric / 100;
  }
  const pixelEquivalent = resolveLengthValueToPx(`${parsed.numberValue}${parsed.unit}`, fontSizePx * 1.7);
  return fontSizePx > 0 ? pixelEquivalent / fontSizePx : 1.7;
}

function resolveLengthValueToEm(value: string, fontSizePx: number) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(-?\d*\.?\d+)(px|em|rem|pt|%)$/);
  if (!match) {
    return 0;
  }

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const unit = match[2];
  if (unit === "em" || unit === "rem") {
    return numeric;
  }
  if (unit === "%") {
    return numeric / 100;
  }
  const pxValue = unit === "pt" ? numeric * (4 / 3) : numeric;
  return fontSizePx > 0 ? pxValue / fontSizePx : 0;
}

function scoreRange(value: number, min: number, max: number, weight: number) {
  if (!Number.isFinite(value) || max <= min) {
    return 0;
  }
  if (value >= min && value <= max) {
    return weight;
  }
  const distance = value < min ? min - value : value - max;
  const span = max - min;
  const falloff = Math.max(0, 1 - distance / span);
  return weight * falloff;
}

function scoreCenter(value: number, center: number, tolerance: number, weight: number) {
  if (!Number.isFinite(value) || tolerance <= 0) {
    return 0;
  }
  const distance = Math.abs(value - center);
  const falloff = Math.max(0, 1 - distance / tolerance);
  return weight * falloff;
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
