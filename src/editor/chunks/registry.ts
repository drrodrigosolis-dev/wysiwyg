import type {
  ChunkCategory,
  ChunkCompatibility,
  ChunkData,
  ChunkDidacticCopy,
  ChunkField,
  ChunkRepeaterItemField,
  ChunkRepeaterField,
  ChunkRestriction,
  ChunkTemplateConcept,
  ChunkTemplateEngine,
  ChunkTemplate,
  InteractiveChunkAttrs,
} from "./types";

export const RAW_CHUNK_TEMPLATE_ID = "raw-html-block";
export const INTERACTIVE_CHUNK_VERSION = 1;

type ChunkLayout =
  | "gallery"
  | "hero"
  | "timeline"
  | "cards"
  | "divider"
  | "roadmap"
  | "quotes"
  | "takeaways"
  | "footnotes"
  | "metrics"
  | "pros-cons"
  | "compare-table"
  | "matrix"
  | "checklist"
  | "map"
  | "observation"
  | "route"
  | "weather"
  | "cta"
  | "links"
  | "resource"
  | "bio"
  | "social-proof"
  | "testimonials"
  | "pricing"
  | "donation"
  | "faq"
  | "reveal"
  | "anchor-nav"
  | "choice"
  | "contact"
  | "subscribe"
  | "references"
  | "deadline"
  | "tabs"
  | "stepper"
  | "sticky-progress"
  | "dismissible"
  | "poll"
  | "quiz"
  | "filter"
  | "sort"
  | "tag-selector"
  | "scenario"
  | "countdown"
  | "copy"
  | "share"
  | "modal"
  | "slider"
  | "lightbox"
  | "expandable-timeline"
  | "counters"
  | "route-stepper"
  | "hotspot";

type TemplateSeed = {
  id: string;
  conceptId?: string;
  category: ChunkCategory;
  restriction: ChunkRestriction;
  layout: ChunkLayout;
  description: string;
};

const TEMPLATE_SEEDS: TemplateSeed[] = [
  { id: "scroll-carousel", category: "Visual Storytelling", restriction: "strict", layout: "gallery", description: "Horizontal image carousel with captions." },
  { id: "snap-gallery-strip", category: "Visual Storytelling", restriction: "strict", layout: "gallery", description: "Scroll-snap gallery strip for dense visuals." },
  { id: "masonry-gallery", category: "Visual Storytelling", restriction: "strict", layout: "gallery", description: "Masonry-like gallery cards in a responsive grid." },
  { id: "filmstrip-gallery", category: "Visual Storytelling", restriction: "strict", layout: "gallery", description: "Filmstrip presentation with stacked captions." },
  { id: "hero-figure-overlay", category: "Visual Storytelling", restriction: "strict", layout: "hero", description: "Hero image with overlay headline and supporting copy." },
  { id: "stacked-photo-essay", category: "Visual Storytelling", restriction: "strict", layout: "gallery", description: "Photo essay stack with narrative summaries." },
  { id: "before-after-slider", category: "Visual Storytelling", restriction: "enhanced", layout: "slider", description: "Before/after image comparison slider." },
  { id: "lightbox-gallery", category: "Visual Storytelling", restriction: "enhanced", layout: "lightbox", description: "Gallery that opens selected media in a lightbox." },

  { id: "vertical-timeline", category: "Narrative Flow", restriction: "strict", layout: "timeline", description: "Vertical timeline of dated milestones." },
  { id: "milestone-cards", category: "Narrative Flow", restriction: "strict", layout: "cards", description: "Milestone cards with stage labels and copy." },
  { id: "chapter-divider-band", category: "Narrative Flow", restriction: "strict", layout: "divider", description: "Section divider band for chapter transitions." },
  { id: "process-roadmap", category: "Narrative Flow", restriction: "strict", layout: "roadmap", description: "Process roadmap with sequenced phases." },
  { id: "quote-journey-strip", category: "Narrative Flow", restriction: "strict", layout: "quotes", description: "Quote journey with short reflective highlights." },
  { id: "key-takeaways-panel", category: "Narrative Flow", restriction: "strict", layout: "takeaways", description: "Key takeaway panel for the current section." },
  { id: "expandable-timeline", category: "Narrative Flow", restriction: "enhanced", layout: "expandable-timeline", description: "Timeline with expand/collapse details." },
  { id: "footnote-popovers", category: "Narrative Flow", restriction: "enhanced", layout: "footnotes", description: "Inline footnote references with popover detail." },

  { id: "metric-cards-row", category: "Data & Comparison", restriction: "strict", layout: "metrics", description: "Row of headline metrics with support copy." },
  { id: "stat-spotlight", category: "Data & Comparison", restriction: "strict", layout: "metrics", description: "Single metric spotlight with context." },
  { id: "kpi-trend-cards", category: "Data & Comparison", restriction: "strict", layout: "metrics", description: "KPI cards showing trend statements." },
  { id: "pros-cons-cards", category: "Data & Comparison", restriction: "strict", layout: "pros-cons", description: "Pros and cons side-by-side decision cards." },
  { id: "comparison-table-compact", category: "Data & Comparison", restriction: "strict", layout: "compare-table", description: "Compact comparison table with key dimensions." },
  { id: "feature-matrix-grid", category: "Data & Comparison", restriction: "strict", layout: "matrix", description: "Feature matrix grid for alternatives." },
  { id: "checklist-progress", category: "Data & Comparison", restriction: "strict", layout: "checklist", description: "Checklist with completion emphasis." },
  { id: "animated-counters", category: "Data & Comparison", restriction: "enhanced", layout: "counters", description: "Animated counters for headline numbers." },

  { id: "map-spotlight-card", category: "Field & Location", restriction: "strict", layout: "map", description: "Map spotlight card with location details." },
  { id: "region-facts-grid", category: "Field & Location", restriction: "strict", layout: "cards", description: "Region fact cards in a concise grid." },
  { id: "species-observation-card", category: "Field & Location", restriction: "strict", layout: "observation", description: "Species observation snapshot with metadata." },
  { id: "route-legs-list", category: "Field & Location", restriction: "strict", layout: "route", description: "Route leg list with sequence and notes." },
  { id: "location-checklist", category: "Field & Location", restriction: "strict", layout: "checklist", description: "Field checklist for location-based tasks." },
  { id: "weather-window-card", category: "Field & Location", restriction: "strict", layout: "weather", description: "Weather window summary for planning." },
  { id: "interactive-route-stepper", category: "Field & Location", restriction: "enhanced", layout: "route-stepper", description: "Interactive route stepper control." },
  { id: "hotspot-map-overlay", category: "Field & Location", restriction: "enhanced", layout: "hotspot", description: "Map overlay with hotspot detail toggles." },

  { id: "cta-banner", category: "Conversion & Credibility", restriction: "strict", layout: "cta", description: "Strong CTA banner with action link." },
  { id: "related-links-grid", category: "Conversion & Credibility", restriction: "strict", layout: "links", description: "Related links grid for continued reading." },
  { id: "resource-download-card", category: "Conversion & Credibility", restriction: "strict", layout: "resource", description: "Download card for a featured resource." },
  { id: "author-bio-card", category: "Conversion & Credibility", restriction: "strict", layout: "bio", description: "Author bio card with trust indicators." },
  { id: "social-proof-strip", category: "Conversion & Credibility", restriction: "strict", layout: "social-proof", description: "Social proof strip with key endorsements." },
  { id: "testimonial-quote-grid", category: "Conversion & Credibility", restriction: "strict", layout: "testimonials", description: "Quote testimonial grid." },
  { id: "pricing-tier-cards", category: "Conversion & Credibility", restriction: "strict", layout: "pricing", description: "Pricing tier cards for plan comparison." },
  { id: "donation-impact-cards", category: "Conversion & Credibility", restriction: "strict", layout: "donation", description: "Donation impact cards by amount." },

  { id: "faq-accordion-details", category: "Disclosure & Navigation", restriction: "strict", layout: "faq", description: "FAQ details/summary stack." },
  { id: "reveal-spoiler", category: "Disclosure & Navigation", restriction: "strict", layout: "reveal", description: "Spoiler/reveal block with progressive disclosure." },
  { id: "expandable-details-stack", category: "Disclosure & Navigation", restriction: "strict", layout: "faq", description: "Expandable details stack for disclosures." },
  { id: "anchor-jump-menu", category: "Disclosure & Navigation", restriction: "strict", layout: "anchor-nav", description: "Anchor jump menu to nearby sections." },
  { id: "tabs-panel", category: "Disclosure & Navigation", restriction: "enhanced", layout: "tabs", description: "Tabbed panel component." },
  { id: "stepper-panel", category: "Disclosure & Navigation", restriction: "enhanced", layout: "stepper", description: "Stepper panel with next/previous navigation." },
  { id: "sticky-progress-nav", category: "Disclosure & Navigation", restriction: "enhanced", layout: "sticky-progress", description: "Sticky progress navigation component." },
  { id: "dismissible-announcement", category: "Disclosure & Navigation", restriction: "enhanced", layout: "dismissible", description: "Dismissible announcement banner." },

  { id: "dual-choice-cards", category: "Selection & Choice", restriction: "strict", layout: "choice", description: "Dual-choice comparison cards." },
  { id: "true-false-cards", category: "Selection & Choice", restriction: "strict", layout: "choice", description: "True/false statement cards." },
  { id: "poll-single-choice", category: "Selection & Choice", restriction: "enhanced", layout: "poll", description: "Single-choice poll block." },
  { id: "quiz-mcq", category: "Selection & Choice", restriction: "enhanced", layout: "quiz", description: "Multiple-choice quiz component." },
  { id: "filterable-card-grid", category: "Selection & Choice", restriction: "enhanced", layout: "filter", description: "Filterable grid of cards by tag." },
  { id: "sort-toggle-grid", category: "Selection & Choice", restriction: "enhanced", layout: "sort", description: "Sort toggle grid for ranking content." },
  { id: "tag-selector-board", category: "Selection & Choice", restriction: "enhanced", layout: "tag-selector", description: "Tag selector board with active state." },
  { id: "scenario-branch-cards", category: "Selection & Choice", restriction: "enhanced", layout: "scenario", description: "Scenario branch cards for decision paths." },

  { id: "contact-form-lite", category: "Utility Microtools", restriction: "strict", layout: "contact", description: "Lightweight contact form layout." },
  { id: "subscribe-box", category: "Utility Microtools", restriction: "strict", layout: "subscribe", description: "Email subscribe capture box." },
  { id: "copyable-reference-list", category: "Utility Microtools", restriction: "strict", layout: "references", description: "Copy-friendly list of references." },
  { id: "deadline-callout", category: "Utility Microtools", restriction: "strict", layout: "deadline", description: "Deadline callout with urgency messaging." },
  { id: "countdown-deadline", category: "Utility Microtools", restriction: "enhanced", layout: "countdown", description: "Live countdown timer to a deadline." },
  { id: "copy-to-clipboard-snippet", category: "Utility Microtools", restriction: "enhanced", layout: "copy", description: "Copy-to-clipboard snippet component." },
  { id: "share-link-builder", category: "Utility Microtools", restriction: "enhanced", layout: "share", description: "Share link builder with copy action." },
  { id: "modal-info-drawer", category: "Utility Microtools", restriction: "enhanced", layout: "modal", description: "Modal info drawer triggered inline." },
];

if (TEMPLATE_SEEDS.length !== 64) {
  throw new Error(`Expected 64 interactive chunk templates, found ${String(TEMPLATE_SEEDS.length)}.`);
}

const ACCENT_OPTIONS = [
  { label: "Ember", value: "ember" },
  { label: "Tide", value: "tide" },
  { label: "Moss", value: "moss" },
  { label: "Rose", value: "rose" },
  { label: "Gold", value: "gold" },
  { label: "Slate", value: "slate" },
] as const;

const CHUNK_WIDTH_OPTIONS = [
  { label: "Content width", value: "content" },
  { label: "Wide", value: "wide" },
  { label: "Full width", value: "full" },
] as const;

const ALIGNMENT_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
] as const;

const CONTROL_SHAPE_OPTIONS = [
  { label: "Pill", value: "pill" },
  { label: "Rounded", value: "rounded" },
  { label: "Square", value: "square" },
] as const;

const CAROUSEL_ICON_PRESETS = ["◀", "◁", "←", "❮", "⟵", "⇠", "◄", "‹", "↞"] as const;
const CAROUSEL_ICON_PRESETS_NEXT = ["▶", "▷", "→", "❯", "⟶", "⇢", "►", "›", "↠"] as const;

const SUMMARY_OVERRIDES: Record<string, string> = {
  "checklist-progress":
    "Use this template to list items and check them off when you complete them. The progress bar updates based on how many items are completed.",
  "location-checklist":
    "Use this checklist to prepare for field work and mark each item once it is verified on site.",
  "before-after-slider":
    "Add two images and compare them using the slider in enhanced runtime.",
  "poll-single-choice":
    "List options for a quick single-choice poll and collect one click per reader.",
  "quiz-mcq":
    "Provide one question with multiple options; readers get instant feedback in enhanced runtime.",
};

type ChunkConceptFilter = {
  engine?: ChunkTemplateEngine;
  category?: ChunkCategory;
  capabilityTag?: string;
};

const RAW_TEMPLATE: ChunkTemplate = {
  id: RAW_CHUNK_TEMPLATE_ID,
  engine: "html",
  conceptId: RAW_CHUNK_TEMPLATE_ID,
  variantLabel: "HTML",
  layoutContract: "raw-html-block",
  label: "Raw HTML Block",
  description: "Raw HTML block with strict allowlist validation.",
  category: "Utility Microtools",
  restriction: "strict",
  capabilityTags: ["advanced", "custom", "manual-markup"],
  didactic: {
    whenToUse: "Use when a structured template cannot express your layout.",
    whyHtml: "Works with strict allowlist validation and no runtime dependencies.",
    whyJavaScript: "Prefer structured JavaScript templates for richer behavior.",
    constraints: "Inline scripts and inline event handlers are blocked.",
  },
  fields: [{ type: "textarea", key: "rawHtml", label: "Raw HTML", rows: 10 }],
  defaultData: {},
  compatibility: {
    strictAllowlist: "degrades",
    enhancedRuntime: "optional",
  },
  keywords: ["raw", "html", "custom"],
  render: () => "",
};

const HTML_TEMPLATE_SEEDS: TemplateSeed[] = TEMPLATE_SEEDS.map((seed) => ({
  ...seed,
  conceptId: seed.id,
}));

const JAVASCRIPT_TEMPLATE_SEEDS: TemplateSeed[] = TEMPLATE_SEEDS.map((seed) => ({
  ...seed,
  id: `${seed.id}-js`,
  conceptId: seed.id,
  restriction: "enhanced",
  description: `${seed.description.replace(/\.$/, "")}. JavaScript-enhanced variant with richer interaction controls.`,
}));

if (HTML_TEMPLATE_SEEDS.length !== 64) {
  throw new Error(`Expected 64 HTML chunk templates, found ${String(HTML_TEMPLATE_SEEDS.length)}.`);
}

if (JAVASCRIPT_TEMPLATE_SEEDS.length !== 64) {
  throw new Error(`Expected 64 JavaScript chunk templates, found ${String(JAVASCRIPT_TEMPLATE_SEEDS.length)}.`);
}

function createTemplateFromSeed(seed: TemplateSeed, engine: ChunkTemplateEngine): ChunkTemplate {
  const conceptId = seed.conceptId ?? seed.id;
  const label = formatTemplateLabel(conceptId);
  const fields =
    engine === "javascript"
      ? [...buildTemplateFields(seed, label), ...buildJavaScriptBehaviorFields(seed)]
      : buildTemplateFields(seed, label);

  const compatibility: ChunkCompatibility = {
    strictAllowlist: "works",
    enhancedRuntime: engine === "javascript" || seed.restriction === "enhanced" ? "required" : "none",
  };

  const capabilityTags = buildCapabilityTags(seed, engine);
  const didactic = buildDidacticCopy(seed, engine, label);
  const keywords = [
    seed.id.replaceAll("-", " "),
    conceptId.replaceAll("-", " "),
    label.toLowerCase(),
    seed.category.toLowerCase(),
    seed.layout.replaceAll("-", " "),
    seed.restriction,
    engine,
    ...capabilityTags,
  ];

  const defaultData = {
    ...buildDefaultData(seed),
    ...(engine === "javascript" ? buildJavaScriptFieldDefaults(seed) : {}),
  };

  return {
    id: seed.id,
    engine,
    conceptId,
    variantLabel: engine === "javascript" ? "JavaScript" : "HTML",
    layoutContract: seed.id,
    label,
    description: seed.description,
    category: seed.category,
    restriction: engine === "javascript" ? "enhanced" : seed.restriction,
    capabilityTags,
    didactic,
    fields,
    defaultData,
    compatibility,
    keywords,
    render: (data) => renderTemplate(seed, data),
  };
}

export const HTML_INTERACTIVE_CHUNK_TEMPLATES: ChunkTemplate[] = HTML_TEMPLATE_SEEDS.map((seed) =>
  createTemplateFromSeed(seed, "html"),
);

export const JAVASCRIPT_INTERACTIVE_CHUNK_TEMPLATES: ChunkTemplate[] = JAVASCRIPT_TEMPLATE_SEEDS.map((seed) =>
  createTemplateFromSeed(seed, "javascript"),
);

export const INTERACTIVE_CHUNK_TEMPLATES: ChunkTemplate[] = HTML_INTERACTIVE_CHUNK_TEMPLATES;
export const STRUCTURED_CHUNK_TEMPLATES: ChunkTemplate[] = [
  ...HTML_INTERACTIVE_CHUNK_TEMPLATES,
  ...JAVASCRIPT_INTERACTIVE_CHUNK_TEMPLATES,
];

const CHUNK_VARIANTS_BY_CONCEPT = new Map<string, Partial<Record<ChunkTemplateEngine, ChunkTemplate>>>();
STRUCTURED_CHUNK_TEMPLATES.forEach((template) => {
  const current = CHUNK_VARIANTS_BY_CONCEPT.get(template.conceptId) ?? {};
  current[template.engine] = template;
  CHUNK_VARIANTS_BY_CONCEPT.set(template.conceptId, current);
});

const CONCEPT_ORDER = HTML_TEMPLATE_SEEDS.map((seed) => seed.conceptId ?? seed.id);
export const CHUNK_TEMPLATE_CONCEPTS: ChunkTemplateConcept[] = CONCEPT_ORDER.map((conceptId) => {
  const variants = CHUNK_VARIANTS_BY_CONCEPT.get(conceptId) ?? {};
  const htmlTemplate = variants.html ?? null;
  const jsTemplate = variants.javascript ?? null;
  const anchor = htmlTemplate ?? jsTemplate;
  if (!anchor) {
    throw new Error(`Missing chunk concept anchor template for ${conceptId}.`);
  }

  const tags = Array.from(
    new Set([
      ...(htmlTemplate?.capabilityTags ?? []),
      ...(jsTemplate?.capabilityTags ?? []),
    ]),
  );

  return {
    id: conceptId,
    label: formatTemplateLabel(conceptId),
    category: anchor.category,
    tags,
    didactic: anchor.didactic,
    templateIds: {
      html: htmlTemplate?.id,
      javascript: jsTemplate?.id,
    },
    defaultEngine: "html",
  };
});

const CHUNK_CONCEPT_BY_ID = new Map(CHUNK_TEMPLATE_CONCEPTS.map((concept) => [concept.id, concept]));

export const ALL_CHUNK_TEMPLATES: ChunkTemplate[] = [...STRUCTURED_CHUNK_TEMPLATES, RAW_TEMPLATE];

const CHUNK_TEMPLATE_BY_ID = new Map(ALL_CHUNK_TEMPLATES.map((template) => [template.id, template]));

export function getChunkTemplate(templateId: string): ChunkTemplate | null {
  return CHUNK_TEMPLATE_BY_ID.get(templateId) ?? null;
}

export function getStructuredChunkTemplates(engine: ChunkTemplateEngine | "all" = "html") {
  if (engine === "javascript") {
    return JAVASCRIPT_INTERACTIVE_CHUNK_TEMPLATES;
  }
  if (engine === "all") {
    return STRUCTURED_CHUNK_TEMPLATES;
  }
  return HTML_INTERACTIVE_CHUNK_TEMPLATES;
}

export function getChunkCategories() {
  return Array.from(new Set(HTML_INTERACTIVE_CHUNK_TEMPLATES.map((template) => template.category)));
}

export function getChunkCapabilityTags(filter: { engine?: ChunkTemplateEngine; category?: ChunkCategory } = {}) {
  const templates = getStructuredChunkTemplates(filter.engine ?? "all").filter((template) => {
    if (filter.category && template.category !== filter.category) {
      return false;
    }
    return true;
  });
  return Array.from(new Set(templates.flatMap((template) => template.capabilityTags))).sort();
}

export function getChunkTemplateConcept(conceptId: string): ChunkTemplateConcept | null {
  return CHUNK_CONCEPT_BY_ID.get(conceptId) ?? null;
}

export function getChunkTemplateConceptByTemplateId(templateId: string): ChunkTemplateConcept | null {
  const template = getChunkTemplate(templateId);
  if (!template || template.id === RAW_CHUNK_TEMPLATE_ID) {
    return null;
  }
  return getChunkTemplateConcept(template.conceptId);
}

export function resolveChunkTemplateId(
  conceptId: string,
  engine: ChunkTemplateEngine = "html",
  fallbackEngine: ChunkTemplateEngine = "html",
) {
  const concept = getChunkTemplateConcept(conceptId);
  if (!concept) {
    return null;
  }
  return concept.templateIds[engine] ?? concept.templateIds[fallbackEngine] ?? null;
}

export function getChunkTemplateConcepts(filter: ChunkConceptFilter = {}) {
  return CHUNK_TEMPLATE_CONCEPTS.filter((concept) => {
    if (filter.category && concept.category !== filter.category) {
      return false;
    }
    if (filter.engine && !concept.templateIds[filter.engine]) {
      return false;
    }
    if (filter.capabilityTag && !concept.tags.includes(filter.capabilityTag)) {
      return false;
    }
    return true;
  });
}

export function parseChunkDataJson(dataJson: string, fallback: ChunkData): ChunkData {
  try {
    const parsed = JSON.parse(dataJson) as ChunkData;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...fallback };
    }
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

export function createStructuredChunkAttrs(templateId: string, overrides?: ChunkData): InteractiveChunkAttrs {
  const candidate = getChunkTemplate(templateId);
  const template =
    candidate && candidate.id !== RAW_CHUNK_TEMPLATE_ID ? candidate : HTML_INTERACTIVE_CHUNK_TEMPLATES[0];
  const data = { ...template.defaultData, ...(overrides ?? {}) };

  return {
    templateId: template.id,
    mode: "structured",
    dataJson: JSON.stringify(data),
    rawHtml: "",
    version: INTERACTIVE_CHUNK_VERSION,
    restriction: template.restriction,
  };
}

export function createRawChunkAttrs(rawHtml = "", restriction: ChunkRestriction = "strict"): InteractiveChunkAttrs {
  return {
    templateId: RAW_CHUNK_TEMPLATE_ID,
    mode: "raw",
    dataJson: JSON.stringify({}),
    rawHtml,
    version: INTERACTIVE_CHUNK_VERSION,
    restriction,
  };
}

export function renderTemplateById(templateId: string, data: ChunkData) {
  const template = getChunkTemplate(templateId);
  if (!template || template.id === RAW_CHUNK_TEMPLATE_ID) {
    return "";
  }

  return template.render(data);
}

export function formatTemplateLabel(templateId: string) {
  const uppercaseWords = new Set(["faq", "kpi", "cta", "mcq"]);
  return templateId
    .split("-")
    .map((part) => {
      if (uppercaseWords.has(part)) {
        return part.toUpperCase();
      }
      return part.slice(0, 1).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function buildTemplateFields(seed: TemplateSeed, label: string): ChunkField[] {
  const fields: ChunkField[] = [
    buildTopLevelTitleField(seed, label),
    buildTopLevelSummaryField(seed),
    {
      type: "select",
      key: "accent",
      label: "Accent tone",
      options: [...ACCENT_OPTIONS],
      helpText: "Sets the visual tone used by this block.",
    },
  ];

  fields.push(...buildGlobalCustomizationFields());

  const repeater = buildRepeaterFieldForSeed(seed);
  if (repeater) {
    fields.push(repeater);
  }

  fields.push(...extraFieldsForLayout(seed));
  return fields;
}

function buildJavaScriptBehaviorFields(seed: TemplateSeed): ChunkField[] {
  const layoutName = seed.layout.replaceAll("-", " ");
  const shared: ChunkField[] = [
    {
      type: "toggle",
      key: "persistInteractionState",
      label: "Remember interaction state",
      helpText: "Keeps each reader's progress (tabs, filters, choices) stable while they navigate.",
    },
    {
      type: "toggle",
      key: "announceInteractionState",
      label: "Announce interaction state",
      helpText: "Adds explicit status copy updates so interactive state changes stay readable.",
    },
    {
      type: "select",
      key: "stateMemory",
      label: "State memory scope",
      options: [
        { label: "None", value: "none" },
        { label: "Session", value: "session" },
        { label: "Persistent", value: "local" },
      ],
      helpText: "Choose whether state resets on refresh, per tab session, or across visits.",
    },
    {
      type: "select",
      key: "statusVerbosity",
      label: "Status feedback detail",
      options: [
        { label: "Concise", value: "concise" },
        { label: "Balanced", value: "balanced" },
        { label: "Didactic", value: "didactic" },
      ],
      helpText: "Controls how much explanatory feedback is shown after interactions.",
    },
    {
      type: "toggle",
      key: "keyboardShortcuts",
      label: "Enable keyboard shortcuts",
      helpText: "Arrow/Enter shortcuts for readers who navigate without pointer input.",
    },
    {
      type: "toggle",
      key: "navigationWrap",
      label: "Wrap keyboard navigation",
      helpText: "When enabled, arrow navigation loops from end to start instead of stopping at boundaries.",
    },
    {
      type: "toggle",
      key: "hoverActivation",
      label: "Enable hover activation",
      helpText: "Allows hover states to activate controls for rapid scanning workflows.",
    },
    {
      type: "number",
      key: "autoAdvanceMs",
      label: "Auto-advance interval",
      min: 0,
      max: 30000,
      step: 250,
      unit: "ms",
      helpText: "0 disables auto-play. Higher values cycle tabs/steps/carousels automatically.",
    },
    {
      type: "select",
      key: "motionProfile",
      label: "Motion profile",
      options: [
        { label: "Reduced", value: "reduced" },
        { label: "Balanced", value: "balanced" },
        { label: "Expressive", value: "expressive" },
      ],
      helpText: "Adjusts transition intensity and pacing across this interactive chunk.",
    },
    {
      type: "select",
      key: "highlightIntensity",
      label: "Interaction highlight intensity",
      options: [
        { label: "Subtle", value: "subtle" },
        { label: "Balanced", value: "balanced" },
        { label: "Strong", value: "strong" },
      ],
      helpText: "Controls how strongly active selections and focused states are emphasized.",
    },
    {
      type: "select",
      key: "selectionBehavior",
      label: "Cross-item selection",
      options: [
        { label: "Disabled", value: "none" },
        { label: "Single active", value: "single" },
        { label: "Multiple active", value: "multiple" },
      ],
      helpText: "Adds selectable cards/list items in JavaScript chunks for guided scanning.",
    },
    {
      type: "select",
      key: "detailsDisclosureMode",
      label: "Details disclosure mode",
      options: [
        { label: "Single open", value: "single" },
        { label: "Multiple open", value: "multiple" },
      ],
      helpText: "Controls how FAQ/details style blocks open and close in JavaScript chunks.",
    },
    {
      type: "toggle",
      key: "showInteractionStatus",
      label: "Show interaction status line",
      helpText: "Adds inline status feedback after selections, submissions, and disclosure changes.",
    },
    {
      type: "toggle",
      key: "statusOnLoad",
      label: "Show onboarding status on load",
      helpText: "Displays a one-line helper status when the chunk first hydrates.",
    },
    {
      type: "number",
      key: "staggerRevealMs",
      label: "Reveal cadence",
      min: 0,
      max: 400,
      step: 10,
      unit: "ms",
      helpText: "Staggers item reveal timing. Use 0 to disable staged reveal.",
    },
  ];

  if (["tabs", "stepper", "poll", "quiz", "filter", "sort", "tag-selector", "scenario"].includes(seed.layout)) {
    return [
      {
        type: "select",
        key: "interactionPreset",
        label: "Interaction preset",
        options: [
          { label: "Guided", value: "guided" },
          { label: "Balanced", value: "balanced" },
          { label: "Expert", value: "expert" },
        ],
        helpText: `Optimizes ${layoutName} behavior for coaching, neutral, or advanced flows.`,
      },
      ...shared,
    ];
  }

  if (["gallery", "slider", "lightbox", "hotspot", "route-stepper", "map"].includes(seed.layout)) {
    return [
      {
        type: "number",
        key: "transitionMs",
        label: "Transition speed",
        min: 120,
        max: 2200,
        step: 20,
        unit: "ms",
        helpText: `Controls animation tempo for ${layoutName} interactions.`,
      },
      {
        type: "select",
        key: "gestureMode",
        label: "Input behavior",
        options: [
          { label: "Click-first", value: "click" },
          { label: "Pointer + touch", value: "pointer-touch" },
          { label: "Keyboard + pointer", value: "keyboard-pointer" },
        ],
        helpText: "Tune controls based on how readers are most likely to navigate.",
      },
      ...shared,
    ];
  }

  if (["countdown", "copy", "share", "modal", "dismissible", "sticky-progress", "counters", "checklist"].includes(seed.layout)) {
    return [
      {
        type: "number",
        key: "runtimeUpdateIntervalMs",
        label: "Live update interval",
        min: 250,
        max: 30000,
        step: 250,
        unit: "ms",
        helpText: `Sets how often ${layoutName} state refreshes while active.`,
      },
      {
        type: "toggle",
        key: "deferHydrationUntilVisible",
        label: "Defer runtime until visible",
        helpText: "Improves performance in long documents by activating when scrolled into view.",
      },
      ...shared,
    ];
  }

  return [
    {
      type: "select",
      key: "interactionPreset",
      label: "Interaction preset",
      options: [
        { label: "Guided", value: "guided" },
        { label: "Balanced", value: "balanced" },
        { label: "Expert", value: "expert" },
      ],
      helpText: `Adapts ${layoutName} behavior for different reader skill levels.`,
      },
      ...shared,
    ];
}

function buildJavaScriptFieldDefaults(seed: TemplateSeed): ChunkData {
  const sharedDefaults: ChunkData = {
    persistInteractionState: true,
    announceInteractionState: true,
    stateMemory: "session",
    statusVerbosity: "balanced",
    keyboardShortcuts: true,
    navigationWrap: true,
    hoverActivation: false,
    autoAdvanceMs: 0,
    motionProfile: "balanced",
    highlightIntensity: "balanced",
    selectionBehavior: "single",
    detailsDisclosureMode: "single",
    showInteractionStatus: true,
    statusOnLoad: true,
    staggerRevealMs: 40,
  };

  if (["tabs", "stepper", "poll", "quiz", "filter", "sort", "tag-selector", "scenario"].includes(seed.layout)) {
    return {
      ...sharedDefaults,
      interactionPreset: "guided",
    };
  }

  if (["gallery", "slider", "lightbox", "hotspot", "route-stepper", "map"].includes(seed.layout)) {
    return {
      ...sharedDefaults,
      transitionMs: 340,
      gestureMode: "pointer-touch",
    };
  }

  if (["countdown", "copy", "share", "modal", "dismissible", "sticky-progress", "counters", "checklist"].includes(seed.layout)) {
    return {
      ...sharedDefaults,
      runtimeUpdateIntervalMs: 1000,
      deferHydrationUntilVisible: true,
    };
  }

  return {
    ...sharedDefaults,
    interactionPreset: "balanced",
  };
}

function buildCapabilityTags(seed: TemplateSeed, engine: ChunkTemplateEngine) {
  const categoryTag = seed.category.toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]+/g, "-");
  const tags = new Set<string>([
    categoryTag,
    seed.layout,
    seed.restriction === "enhanced" || engine === "javascript" ? "runtime" : "strict-safe",
    engine,
  ]);

  if (engine === "javascript") {
    tags.add("stateful");
    tags.add("keyboard");
    tags.add("motion");
    tags.add("personalizable");
  }

  if (["tabs", "stepper", "sticky-progress", "anchor-nav", "dismissible"].includes(seed.layout)) {
    tags.add("navigation");
  }
  if (["poll", "quiz", "choice", "filter", "sort", "tag-selector", "scenario"].includes(seed.layout)) {
    tags.add("selection");
  }
  if (["gallery", "hero", "slider", "lightbox", "hotspot"].includes(seed.layout)) {
    tags.add("media");
  }
  if (["metrics", "matrix", "compare-table", "counters", "checklist"].includes(seed.layout)) {
    tags.add("analysis");
  }
  if (["contact", "subscribe", "copy", "share", "modal"].includes(seed.layout)) {
    tags.add("utility");
  }
  if (["cta", "pricing", "donation", "social-proof", "testimonials"].includes(seed.layout)) {
    tags.add("conversion");
  }

  return Array.from(tags);
}

function buildDidacticCopy(seed: TemplateSeed, engine: ChunkTemplateEngine, label: string): ChunkDidacticCopy {
  return {
    whenToUse: `Use ${label} when you need a ${seed.layout.replaceAll("-", " ")} block inside ${seed.category.toLowerCase()} content.`,
    whyHtml: "HTML variant is simpler to maintain and favors strict-safe rendering with minimal runtime risk.",
    whyJavaScript:
      "JavaScript variant unlocks richer interaction states, keyboard controls, persistence, autoplay pacing, motion tuning, and didactic status feedback through the curated runtime.",
    constraints:
      engine === "javascript"
        ? "Uses curated runtime handlers only. Personalization is extensive, but custom user-authored scripts are intentionally not supported."
        : "Static-first behavior. For richer state transitions, switch this concept to the JavaScript variant.",
  };
}

function buildGlobalCustomizationFields(): ChunkField[] {
  return [
    {
      type: "select",
      key: "containerWidth",
      label: "Chunk width",
      options: [...CHUNK_WIDTH_OPTIONS],
      helpText: "Controls how much horizontal space the chunk occupies.",
    },
    {
      type: "select",
      key: "containerAlign",
      label: "Chunk alignment",
      options: [...ALIGNMENT_OPTIONS],
      helpText: "Align the chunk container inside the available space.",
    },
    {
      type: "select",
      key: "headerAlign",
      label: "Header alignment",
      options: [...ALIGNMENT_OPTIONS],
      helpText: "Align title and summary text.",
    },
    {
      type: "number",
      key: "surfacePadding",
      label: "Surface padding",
      min: 4,
      max: 40,
      step: 1,
      unit: "px",
    },
    {
      type: "number",
      key: "surfaceRadius",
      label: "Surface radius",
      min: 0,
      max: 40,
      step: 1,
      unit: "px",
    },
    {
      type: "number",
      key: "surfaceBorderOpacity",
      label: "Border opacity",
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      type: "number",
      key: "surfaceBlur",
      label: "Surface blur",
      min: 0,
      max: 18,
      step: 1,
      unit: "px",
    },
    {
      type: "number",
      key: "surfaceShadow",
      label: "Surface shadow strength",
      min: 0,
      max: 48,
      step: 1,
      unit: "px",
    },
    {
      type: "number",
      key: "itemGap",
      label: "Item spacing",
      min: 0,
      max: 30,
      step: 1,
      unit: "px",
    },
    {
      type: "number",
      key: "mediaRadius",
      label: "Image/card corner radius",
      min: 0,
      max: 32,
      step: 1,
      unit: "px",
    },
    {
      type: "select",
      key: "controlShape",
      label: "Control shape",
      options: [...CONTROL_SHAPE_OPTIONS],
      helpText: "Applies to action buttons, pills, and controls.",
    },
    {
      type: "color",
      key: "surfaceBackgroundColor",
      label: "Surface background color",
      placeholder: "#ffffff",
    },
    {
      type: "color",
      key: "surfaceTextColor",
      label: "Surface text color",
      placeholder: "#21160f",
    },
    {
      type: "color",
      key: "headingColor",
      label: "Heading color",
      placeholder: "#21160f",
    },
    {
      type: "color",
      key: "summaryColor",
      label: "Summary color",
      placeholder: "#6b584a",
    },
    {
      type: "color",
      key: "controlBackgroundColor",
      label: "Control background color",
      placeholder: "#ffffff",
    },
    {
      type: "color",
      key: "controlTextColor",
      label: "Control text color",
      placeholder: "#21160f",
    },
  ];
}

function buildTopLevelTitleField(seed: TemplateSeed, label: string): ChunkField {
  if (seed.layout === "checklist") {
    return {
      type: "text",
      key: "title",
      label: "Checklist heading",
      placeholder: "Preparation checklist",
      helpText: "Shown at the top of this checklist block.",
    };
  }

  if (seed.layout === "gallery" || seed.layout === "lightbox" || seed.layout === "slider" || seed.layout === "hero") {
    return {
      type: "text",
      key: "title",
      label: "Gallery heading",
      placeholder: "Field image gallery",
      helpText: "Short heading shown above this media block.",
    };
  }

  if (seed.layout === "timeline" || seed.layout === "roadmap" || seed.layout === "route" || seed.layout === "route-stepper") {
    return {
      type: "text",
      key: "title",
      label: "Sequence heading",
      placeholder: "Project timeline",
      helpText: "Introduces the sequence below.",
    };
  }

  if (seed.layout === "metrics" || seed.layout === "counters") {
    return {
      type: "text",
      key: "title",
      label: "Metrics heading",
      placeholder: "Performance highlights",
      helpText: "Use a concise heading for this metrics block.",
    };
  }

  return {
    type: "text",
    key: "title",
    label: "Title",
    placeholder: label,
    helpText: "Shown at the top of this interactive chunk.",
  };
}

function buildTopLevelSummaryField(seed: TemplateSeed): ChunkField {
  return {
    type: "textarea",
    key: "summary",
    label: "Summary",
    rows: 3,
    placeholder: `Explain how readers should use this ${seed.layout.replaceAll("-", " ")} block.`,
    helpText: "Appears directly under the title.",
  };
}

function buildRepeaterFieldForSeed(seed: TemplateSeed): ChunkRepeaterField | null {
  const conceptId = seed.conceptId ?? seed.id;
  if (
    seed.layout === "countdown" ||
    seed.layout === "copy" ||
    seed.layout === "share" ||
    seed.layout === "modal" ||
    seed.layout === "contact" ||
    seed.layout === "subscribe"
  ) {
    return null;
  }

  if (conceptId === "checklist-progress") {
    return baseRepeater({
      label: "Checklist items",
      itemLabel: "Task",
      minItems: 2,
      maxItems: 12,
      helpText: "Toggle 'Completed' to update progress in the preview.",
      itemFields: [
        textItemField("title", "Task", "Define route checkpoints"),
        textareaItemField("body", "Details", "Optional extra context.", 2),
        toggleItemField("done", "Completed", "Checked items count toward progress."),
        textItemField("value", "Weight or estimate", "1"),
      ],
    });
  }

  if (conceptId === "location-checklist") {
    return baseRepeater({
      label: "On-site checklist",
      itemLabel: "Item",
      minItems: 2,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Checklist item", "GPS synced"),
        textareaItemField("body", "Instruction", "Confirm coordinate format.", 2),
        toggleItemField("done", "Checked"),
      ],
    });
  }

  if (conceptId === "before-after-slider") {
    return baseRepeater({
      label: "Before / after images",
      itemLabel: "State",
      minItems: 2,
      maxItems: 2,
      helpText: "Two images are required: first = before, second = after.",
      itemFields: [
        textItemField("title", "Label", "Before"),
        urlItemField("image", "Image URL", "https://picsum.photos/seed/before/1200/700"),
      ],
    });
  }

  if (conceptId === "scroll-carousel") {
    return baseRepeater({
      label: "Carousel items",
      itemLabel: "Image",
      minItems: 3,
      helpText: "No practical cap. Add as many images as needed.",
      itemFields: [
        textItemField("title", "Caption title", "Frame title"),
        textareaItemField("body", "Caption text", "Short description.", 2),
        urlItemField("image", "Image URL", "https://picsum.photos/seed/gallery-1/1200/800"),
        urlItemField("link", "Open link (optional)", "https://example.com/full-image"),
      ],
    });
  }

  if (seed.layout === "gallery" || seed.layout === "lightbox") {
    return baseRepeater({
      label: "Gallery items",
      itemLabel: "Image",
      minItems: 3,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Caption title", "Frame title"),
        textareaItemField("body", "Caption text", "Short description.", 2),
        urlItemField("image", "Image URL", "https://picsum.photos/seed/gallery-1/1200/800"),
        urlItemField("link", "Open link (optional)", "https://example.com/full-image"),
      ],
    });
  }

  if (seed.layout === "timeline" || seed.layout === "expandable-timeline") {
    return baseRepeater({
      label: "Timeline entries",
      itemLabel: "Entry",
      minItems: 3,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Entry title", "Milestone"),
        textareaItemField("body", "Entry details", "What happened here?", 2),
        textItemField("tag", "Date or phase", "Week 1"),
      ],
    });
  }

  if (seed.layout === "metrics" || seed.layout === "counters") {
    return baseRepeater({
      label: "Metrics",
      itemLabel: "Metric",
      minItems: 2,
      maxItems: 8,
      itemFields: [
        textItemField("title", "Metric label", "Observations"),
        textItemField("value", "Metric value", "48"),
        textareaItemField("body", "Context", "Across three routes.", 2),
        textItemField("tag", "Trend or segment", "Up 12%"),
      ],
    });
  }

  if (seed.layout === "compare-table" || seed.layout === "matrix") {
    return baseRepeater({
      label: "Rows",
      itemLabel: "Row",
      minItems: 3,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Row label", "Coverage"),
        textItemField("value", "Value", "High"),
        textareaItemField("body", "Notes", "Concise support notes.", 2),
      ],
    });
  }

  if (seed.layout === "checklist") {
    return baseRepeater({
      label: "Checklist items",
      itemLabel: "Item",
      minItems: 2,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Item", "Calibrate GPS"),
        textareaItemField("body", "Details", "Add completion criteria.", 2),
        toggleItemField("done", "Completed"),
      ],
    });
  }

  if (seed.layout === "faq" || seed.layout === "reveal" || seed.layout === "footnotes") {
    return baseRepeater({
      label: seed.layout === "faq" ? "Questions" : seed.layout === "reveal" ? "Reveal content" : "Footnotes",
      itemLabel: seed.layout === "faq" ? "Question" : seed.layout === "reveal" ? "Reveal" : "Footnote",
      minItems: 1,
      maxItems: 12,
      itemFields: [
        textItemField("title", seed.layout === "faq" ? "Question" : "Title", "Add title"),
        textareaItemField("body", "Body", "Add details", 3),
      ],
    });
  }

  if (seed.layout === "links" || seed.layout === "references" || seed.layout === "anchor-nav") {
    return baseRepeater({
      label: seed.layout === "anchor-nav" ? "Anchor links" : "Links",
      itemLabel: seed.layout === "anchor-nav" ? "Anchor" : "Link",
      minItems: 2,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Label", "Methods"),
        ...(seed.layout === "anchor-nav" ? [] : [urlItemField("link", "URL", "https://example.com/resource")]),
        ...(seed.layout === "links" ? [textareaItemField("body", "Description", "Why this link matters.", 2)] : []),
      ],
    });
  }

  if (seed.layout === "choice" || seed.layout === "poll" || seed.layout === "quiz") {
    return baseRepeater({
      label: seed.layout === "poll" ? "Poll options" : seed.layout === "quiz" ? "Quiz options" : "Choices",
      itemLabel: "Option",
      minItems: 2,
      maxItems: 6,
      helpText: seed.layout === "quiz" ? "The first option is treated as correct in this template." : undefined,
      itemFields: [
        textItemField("title", "Option label", "Option A"),
        textareaItemField("body", "Explanation", "Optional supporting text.", 2),
        ...(seed.layout === "choice" ? [urlItemField("link", "Option link (optional)", "https://example.com/option-a")] : []),
      ],
    });
  }

  if (seed.layout === "filter" || seed.layout === "sort" || seed.layout === "tag-selector" || seed.layout === "scenario") {
    return baseRepeater({
      label: seed.layout === "scenario" ? "Scenario branches" : "Cards",
      itemLabel: seed.layout === "scenario" ? "Scenario" : "Card",
      minItems: 2,
      maxItems: 12,
      itemFields: [
        textItemField("title", seed.layout === "scenario" ? "Scenario title" : "Card title", "Route A"),
        textareaItemField("body", "Details", "Add contextual details.", 2),
        textItemField("tag", "Tag", "High elevation"),
        textItemField("value", "Value", "72"),
        ...(seed.layout === "scenario" ? [urlItemField("link", "Branch link", "https://example.com/branch")] : []),
      ],
    });
  }

  if (seed.layout === "hero") {
    return baseRepeater({
      label: "Hero content",
      itemLabel: "Hero item",
      minItems: 1,
      maxItems: 1,
      itemFields: [
        textItemField("title", "Hero title", "Montezuma Road Survey"),
        textareaItemField("body", "Hero subtitle", "A high-elevation biodiversity corridor.", 2),
        urlItemField("image", "Background image URL", "https://picsum.photos/seed/hero-1/1400/800"),
        urlItemField("link", "Hero link", "https://example.com/report"),
      ],
    });
  }

  if (seed.layout === "cards") {
    return baseRepeater({
      label: "Cards",
      itemLabel: "Card",
      minItems: 2,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Card title", "Milestone reached"),
        textareaItemField("body", "Card text", "Summarize the main point for this card.", 2),
        textItemField("tag", "Tag", "Phase 1"),
        textItemField("value", "Value (optional)", "24"),
      ],
    });
  }

  if (seed.layout === "divider") {
    return baseRepeater({
      label: "Divider content",
      itemLabel: "Divider",
      minItems: 1,
      maxItems: 1,
      itemFields: [
        textItemField("title", "Section title", "Chapter 2"),
        textareaItemField("body", "Transition text", "Move readers to the next section focus.", 2),
      ],
    });
  }

  if (seed.layout === "roadmap" || seed.layout === "route" || seed.layout === "route-stepper" || seed.layout === "stepper") {
    return baseRepeater({
      label: "Steps",
      itemLabel: "Step",
      minItems: 2,
      maxItems: 12,
      itemFields: [
        textItemField("title", "Step title", "Prepare equipment"),
        textareaItemField("body", "Step details", "Describe what must happen at this step.", 2),
        textItemField("tag", "Phase or terrain", "Phase 1"),
        textItemField("value", "Distance/ETA (optional)", "1.2 km • 25 min"),
      ],
    });
  }

  if (seed.layout === "quotes" || seed.layout === "takeaways" || seed.layout === "testimonials") {
    return baseRepeater({
      label: seed.layout === "takeaways" ? "Takeaways" : "Quotes",
      itemLabel: seed.layout === "takeaways" ? "Takeaway" : "Quote",
      minItems: 2,
      maxItems: 8,
      itemFields: [
        textItemField("title", seed.layout === "takeaways" ? "Takeaway title" : "Attribution", "Contributor"),
        textareaItemField("body", seed.layout === "takeaways" ? "Takeaway text" : "Quote text", "Add supporting content.", 3),
      ],
    });
  }

  if (seed.layout === "pros-cons") {
    return baseRepeater({
      label: "Pros and cons",
      itemLabel: "Point",
      minItems: 2,
      maxItems: 2,
      itemFields: [
        textItemField("title", "Heading", "Pros"),
        textareaItemField("body", "Explanation", "Summarize strengths or tradeoffs.", 2),
      ],
    });
  }

  if (seed.layout === "map" || seed.layout === "hotspot") {
    return baseRepeater({
      label: seed.layout === "hotspot" ? "Hotspots" : "Map details",
      itemLabel: seed.layout === "hotspot" ? "Hotspot" : "Location",
      minItems: seed.layout === "hotspot" ? 2 : 1,
      maxItems: 10,
      itemFields: [
        textItemField("title", "Label", seed.layout === "hotspot" ? "Station A" : "Tatamá sector"),
        textareaItemField("body", "Details", "Add contextual field notes.", 2),
        urlItemField("image", seed.layout === "hotspot" ? "Base image URL" : "Map/image URL", "https://picsum.photos/seed/map/1000/700"),
        textItemField("value", "Coordinates (optional)", "4.73, -76.08"),
      ],
    });
  }

  if (seed.layout === "observation") {
    return baseRepeater({
      label: "Observation entries",
      itemLabel: "Observation",
      minItems: 1,
      maxItems: 8,
      itemFields: [
        textItemField("title", "Observed subject", "Morpho helenor"),
        textareaItemField("body", "Observation notes", "Observed crossing open canopy at 08:15.", 2),
        textItemField("tag", "Status", "Confirmed"),
        textItemField("value", "Count", "3 individuals"),
        urlItemField("image", "Photo URL", "https://picsum.photos/seed/observation/900/600"),
      ],
    });
  }

  if (seed.layout === "weather") {
    return baseRepeater({
      label: "Forecast points",
      itemLabel: "Forecast",
      minItems: 1,
      maxItems: 5,
      itemFields: [
        textItemField("title", "Window", "Early morning"),
        textItemField("value", "Temperature", "18"),
        textareaItemField("body", "Conditions", "Low wind, partial cloud cover.", 2),
      ],
    });
  }

  if (seed.layout === "cta" || seed.layout === "resource" || seed.layout === "bio" || seed.layout === "deadline" || seed.layout === "dismissible") {
    return baseRepeater({
      label: "Primary content",
      itemLabel: "Content",
      minItems: 1,
      maxItems: 1,
      itemFields: [
        textItemField("title", "Title", "Primary message"),
        textareaItemField("body", "Body", "Supporting detail for this block.", 2),
        urlItemField("link", "Link (optional)", "https://example.com"),
        urlItemField("image", "Image URL (optional)", "https://picsum.photos/seed/content/600/400"),
        textItemField("value", "Value (optional)", "May 30, 2026"),
      ],
    });
  }

  if (seed.layout === "social-proof") {
    return baseRepeater({
      label: "Proof badges",
      itemLabel: "Badge",
      minItems: 2,
      maxItems: 12,
      itemFields: [textItemField("title", "Badge text", "Trusted by 120+ field teams")],
    });
  }

  if (seed.layout === "pricing" || seed.layout === "donation") {
    return baseRepeater({
      label: seed.layout === "pricing" ? "Pricing tiers" : "Impact tiers",
      itemLabel: "Tier",
      minItems: 2,
      maxItems: 6,
      itemFields: [
        textItemField("title", "Tier title", "Team"),
        textItemField("value", seed.layout === "pricing" ? "Price" : "Amount", "$49"),
        textareaItemField("body", "Description", "What this tier includes.", 2),
      ],
    });
  }

  if (seed.layout === "tabs") {
    return baseRepeater({
      label: "Tabs",
      itemLabel: "Tab",
      minItems: 2,
      maxItems: 8,
      itemFields: [
        textItemField("title", "Tab label", "Overview"),
        textareaItemField("body", "Tab content", "Summarize this section in one focused paragraph.", 3),
      ],
    });
  }

  if (seed.layout === "sticky-progress") {
    return baseRepeater({
      label: "Navigation steps",
      itemLabel: "Section",
      minItems: 3,
      maxItems: 12,
      itemFields: [textItemField("title", "Section label", "Methods")],
    });
  }

  if (seed.layout === "slider") {
    return baseRepeater({
      label: "Slider images",
      itemLabel: "Image",
      minItems: 2,
      maxItems: 2,
      itemFields: [
        textItemField("title", "Label", "Before"),
        urlItemField("image", "Image URL", "https://picsum.photos/seed/slider-before/1200/700"),
      ],
    });
  }

  return baseRepeater({
    label: "Items",
    itemLabel: "Item",
    minItems: 1,
    maxItems: 8,
    itemFields: [
      textItemField("title", "Title", "Item title"),
      textareaItemField("body", "Body", "Item details", 2),
      urlItemField("link", "Link", "https://example.com"),
      urlItemField("image", "Image URL", "https://picsum.photos/seed/item/1000/700"),
      textItemField("tag", "Tag", "Primary"),
      textItemField("value", "Value", "12"),
    ],
  });
}

function baseRepeater(input: {
  label: string;
  itemLabel: string;
  itemFields: ChunkRepeaterItemField[];
  minItems?: number;
  maxItems?: number;
  helpText?: string;
}): ChunkRepeaterField {
  return {
    type: "repeater",
    key: "items",
    label: input.label,
    itemLabel: input.itemLabel,
    minItems: input.minItems ?? 1,
    ...(typeof input.maxItems === "number" ? { maxItems: input.maxItems } : {}),
    itemFields: input.itemFields,
    helpText: input.helpText,
  };
}

function textItemField(key: string, label: string, placeholder?: string, helpText?: string): ChunkRepeaterItemField {
  return { type: "text", key, label, placeholder, helpText };
}

function textareaItemField(key: string, label: string, placeholder?: string, rows = 2, helpText?: string): ChunkRepeaterItemField {
  return { type: "textarea", key, label, placeholder, rows, helpText };
}

function urlItemField(key: string, label: string, placeholder?: string, helpText?: string): ChunkRepeaterItemField {
  return { type: "url", key, label, placeholder, helpText };
}

function toggleItemField(key: string, label: string, helpText?: string): ChunkRepeaterItemField {
  return { type: "toggle", key, label, helpText };
}

function extraFieldsForLayout(seed: TemplateSeed): ChunkField[] {
  if ((seed.conceptId ?? seed.id) === "snap-gallery-strip") {
    return [
      {
        type: "number",
        key: "galleryCardWidth",
        label: "Gallery card width",
        min: 180,
        max: 640,
        step: 2,
        unit: "px",
      },
      {
        type: "number",
        key: "galleryImageHeight",
        label: "Gallery image height",
        min: 120,
        max: 420,
        step: 2,
        unit: "px",
      },
      {
        type: "toggle",
        key: "snapGalleryShowArrows",
        label: "Show gallery arrows",
        helpText: "Adds previous/next controls in JavaScript variants for guided browsing.",
      },
    ];
  }

  if ((seed.conceptId ?? seed.id) === "scroll-carousel") {
    return [
      {
        type: "number",
        key: "carouselCardWidth",
        label: "Carousel card width",
        min: 220,
        max: 720,
        step: 2,
        unit: "px",
      },
      {
        type: "number",
        key: "carouselFadeWidth",
        label: "Edge fade width",
        min: 0,
        max: 220,
        step: 1,
        unit: "px",
      },
      {
        type: "number",
        key: "carouselFadeBlur",
        label: "Edge fade blur",
        min: 0,
        max: 22,
        step: 1,
        unit: "px",
      },
      {
        type: "color",
        key: "carouselFadeColor",
        label: "Edge fade color",
        placeholder: "#ffffff",
      },
      {
        type: "toggle",
        key: "carouselShowArrows",
        label: "Show scroll arrows",
      },
      {
        type: "icon",
        key: "carouselPrevIcon",
        label: "Previous arrow icon",
        placeholder: "◀",
        presets: [...CAROUSEL_ICON_PRESETS],
      },
      {
        type: "icon",
        key: "carouselNextIcon",
        label: "Next arrow icon",
        placeholder: "▶",
        presets: [...CAROUSEL_ICON_PRESETS_NEXT],
      },
      {
        type: "number",
        key: "carouselArrowSize",
        label: "Arrow button size",
        min: 24,
        max: 70,
        step: 1,
        unit: "px",
      },
      {
        type: "color",
        key: "carouselArrowBgColor",
        label: "Arrow background color",
        placeholder: "#ffffff",
      },
      {
        type: "color",
        key: "carouselArrowColor",
        label: "Arrow icon color",
        placeholder: "#1e88e5",
      },
      {
        type: "number",
        key: "carouselArrowOffset",
        label: "Arrow horizontal offset",
        min: 0,
        max: 48,
        step: 1,
        unit: "px",
      },
      {
        type: "number",
        key: "carouselScrollStep",
        label: "Arrow scroll step",
        min: 120,
        max: 1200,
        step: 10,
        unit: "px",
        helpText: "How far each arrow click scrolls the carousel.",
      },
    ];
  }

  if (seed.layout === "countdown") {
    return [
      {
        type: "text",
        key: "deadline",
        label: "Deadline (ISO datetime)",
        placeholder: "2030-01-01T00:00:00Z",
        helpText: "Use ISO format for accurate countdown behavior.",
      },
      {
        type: "text",
        key: "buttonLabel",
        label: "Button label",
        placeholder: "Reserve your spot",
      },
    ];
  }

  if (seed.layout === "copy") {
    return [
      {
        type: "textarea",
        key: "snippet",
        label: "Snippet",
        rows: 4,
        placeholder: "npm run build",
        helpText: "Readers can copy this snippet in enhanced runtime.",
      },
    ];
  }

  if (seed.layout === "share") {
    return [
      {
        type: "url",
        key: "shareUrl",
        label: "Share URL",
        placeholder: "https://example.com/article",
      },
      {
        type: "text",
        key: "shareLabel",
        label: "Button label",
        placeholder: "Copy share link",
      },
    ];
  }

  if (seed.layout === "modal") {
    return [
      {
        type: "text",
        key: "buttonLabel",
        label: "Trigger label",
        placeholder: "Open details",
      },
      {
        type: "textarea",
        key: "modalBody",
        label: "Drawer content",
        rows: 4,
        placeholder: "Expanded details for this topic.",
      },
    ];
  }

  return [];
}

function buildDefaultData(seed: TemplateSeed): ChunkData {
  const conceptId = seed.conceptId ?? seed.id;
  const base: ChunkData = {
    title: formatTemplateLabel(conceptId),
    summary: defaultSummaryForSeed(seed),
    accent: seed.restriction === "enhanced" ? "tide" : "ember",
    containerWidth: "wide",
    containerAlign: "center",
    headerAlign: "left",
    surfacePadding: 14,
    surfaceRadius: 16,
    surfaceBorderOpacity: 12,
    surfaceBlur: 0,
    surfaceShadow: 12,
    itemGap: 10,
    mediaRadius: 12,
    controlShape: "pill",
    surfaceBackgroundColor: "rgba(255,255,255,0.74)",
    surfaceTextColor: "#21160f",
    headingColor: "#21160f",
    summaryColor: "#6b584a",
    controlBackgroundColor: "rgba(255,255,255,0.92)",
    controlTextColor: "#21160f",
  };

  const items = buildDefaultItems(seed);
  if (items.length > 0) {
    base.items = items;
  }

  if (seed.layout === "countdown") {
    base.deadline = "2030-01-01T00:00:00Z";
    base.buttonLabel = "Reserve now";
  }

  if (seed.layout === "copy") {
    base.snippet = "npm run build && npm run test";
  }

  if (seed.layout === "share") {
    base.shareUrl = "https://example.com/reports/tatama-field-notes";
    base.shareLabel = "Copy share link";
  }

  if (seed.layout === "modal") {
    base.buttonLabel = "Open details";
    base.modalBody = "Add expanded context, caveats, methods, or implementation notes here.";
  }

  if (conceptId === "scroll-carousel") {
    base.carouselCardWidth = 360;
    base.carouselFadeWidth = 44;
    base.carouselFadeBlur = 0;
    base.carouselFadeColor = "#ffffff";
    base.carouselShowArrows = true;
    base.carouselPrevIcon = "◀";
    base.carouselNextIcon = "▶";
    base.carouselArrowSize = 34;
    base.carouselArrowBgColor = "rgba(255,255,255,0.9)";
    base.carouselArrowColor = "#1e88e5";
    base.carouselArrowOffset = 6;
    base.carouselScrollStep = 340;
  }

  return base;
}

function defaultSummaryForSeed(seed: TemplateSeed) {
  const override = SUMMARY_OVERRIDES[seed.conceptId ?? seed.id];
  if (override) {
    return override;
  }

  return `Use this template to configure a ${seed.layout.replaceAll("-", " ")} block with purpose-specific controls.`;
}

type DefaultChunkItem = {
  title: string;
  body: string;
  link: string;
  image: string;
  tag: string;
  value: string;
  done: boolean;
};

function buildDefaultItems(seed: TemplateSeed): DefaultChunkItem[] {
  const conceptId = seed.conceptId ?? seed.id;
  if (
    seed.layout === "countdown" ||
    seed.layout === "copy" ||
    seed.layout === "share" ||
    seed.layout === "modal" ||
    seed.layout === "contact" ||
    seed.layout === "subscribe"
  ) {
    return [];
  }

  if (conceptId === "checklist-progress") {
    return [
      createDefaultItem(seed, 0, { title: "Define route checkpoints", body: "Confirm coordinates and access notes.", done: false }),
      createDefaultItem(seed, 1, { title: "Prepare camera batteries", body: "Carry one backup set.", done: false }),
      createDefaultItem(seed, 2, { title: "Print observation sheets", body: "Use weather-safe paper if possible.", done: false }),
      createDefaultItem(seed, 3, { title: "Verify permits", body: "Attach permit IDs to session notes.", done: false }),
    ];
  }

  if (conceptId === "location-checklist") {
    return [
      createDefaultItem(seed, 0, { title: "GPS synced", body: "Timezone and coordinate format confirmed.", done: false }),
      createDefaultItem(seed, 1, { title: "Weather checked", body: "Wind and precipitation within safe range.", done: false }),
      createDefaultItem(seed, 2, { title: "Sample labels packed", body: "Pre-numbered and waterproof.", done: false }),
    ];
  }

  if (conceptId === "before-after-slider") {
    return [
      createDefaultItem(seed, 0, { title: "Before", image: "https://picsum.photos/seed/before-after-1/1200/700" }),
      createDefaultItem(seed, 1, { title: "After", image: "https://picsum.photos/seed/before-after-2/1200/700" }),
    ];
  }

  if (seed.layout === "gallery" || seed.layout === "lightbox") {
    return Array.from({ length: 5 }, (_, index) =>
      createDefaultItem(seed, index, {
        title: `Frame ${index + 1}`,
        body: "Add a short caption with context for this image.",
        link: "https://example.com/full-image",
      }),
    );
  }

  if (seed.layout === "timeline" || seed.layout === "expandable-timeline") {
    return Array.from({ length: 4 }, (_, index) =>
      createDefaultItem(seed, index, {
        title: `Milestone ${index + 1}`,
        body: "Document what happened at this point in the process.",
        tag: `Week ${index + 1}`,
      }),
    );
  }

  if (seed.layout === "hero") {
    return [
      createDefaultItem(seed, 0, {
        title: "Montezuma Road Survey",
        body: "A high-elevation biodiversity corridor.",
        image: "https://picsum.photos/seed/hero-default/1400/800",
        link: "https://example.com/reports/montezuma-road",
      }),
    ];
  }

  if (seed.layout === "roadmap" || seed.layout === "route" || seed.layout === "route-stepper" || seed.layout === "stepper") {
    return Array.from({ length: 4 }, (_, index) =>
      createDefaultItem(seed, index, {
        title: `Step ${index + 1}`,
        body: "Describe what should happen in this step.",
        tag: "Phase",
        value: `${(index + 1) * 0.8} km`,
      }),
    );
  }

  if (seed.layout === "quotes" || seed.layout === "takeaways" || seed.layout === "testimonials") {
    return Array.from({ length: 4 }, (_, index) =>
      createDefaultItem(seed, index, {
        title: seed.layout === "takeaways" ? `Takeaway ${index + 1}` : `Contributor ${index + 1}`,
        body: seed.layout === "takeaways" ? "Add a practical implication." : "Replace with a meaningful quote.",
      }),
    );
  }

  if (seed.layout === "metrics" || seed.layout === "counters") {
    return Array.from({ length: 4 }, (_, index) =>
      createDefaultItem(seed, index, {
        title: `Metric ${index + 1}`,
        value: String((index + 1) * 24),
        body: "Add short context for this metric.",
        tag: index % 2 === 0 ? "Upward trend" : "Stable",
      }),
    );
  }

  if (seed.layout === "pros-cons") {
    return [
      createDefaultItem(seed, 0, { title: "Pros", body: "Summarize strengths of this option." }),
      createDefaultItem(seed, 1, { title: "Cons", body: "Summarize risks or tradeoffs." }),
    ];
  }

  if (seed.layout === "cards") {
    return Array.from({ length: 4 }, (_, index) =>
      createDefaultItem(seed, index, {
        title: `Card ${index + 1}`,
        body: "Replace with milestone or regional fact content.",
        tag: `Group ${index + 1}`,
        value: String((index + 1) * 10),
      }),
    );
  }

  if (seed.layout === "map" || seed.layout === "hotspot") {
    return [
      createDefaultItem(seed, 0, {
        title: "Tatamá sector",
        body: "Primary observation corridor near creek crossing.",
        value: "4.73, -76.08",
      }),
      ...(seed.layout === "hotspot"
        ? [
            createDefaultItem(seed, 1, { title: "Station B", body: "Open canopy crossing." }),
            createDefaultItem(seed, 2, { title: "Station C", body: "Low activity but high diversity." }),
          ]
        : []),
    ];
  }

  if (seed.layout === "observation") {
    return [
      createDefaultItem(seed, 0, {
        title: "Morpho helenor",
        body: "Observed crossing open canopy at 08:15.",
        tag: "Confirmed",
        value: "3 individuals",
      }),
    ];
  }

  if (seed.layout === "weather") {
    return [createDefaultItem(seed, 0, { title: "Morning window", value: "18", body: "Light wind, partial cloud cover." })];
  }

  if (seed.layout === "cta" || seed.layout === "resource" || seed.layout === "bio" || seed.layout === "deadline" || seed.layout === "dismissible") {
    return [createDefaultItem(seed, 0, { title: "Primary message", body: "Add concise supporting copy." })];
  }

  if (seed.layout === "social-proof") {
    return [
      createDefaultItem(seed, 0, { title: "Trusted by 120+ field teams" }),
      createDefaultItem(seed, 1, { title: "Used across 5 conservation organizations" }),
      createDefaultItem(seed, 2, { title: "4.8/5 stakeholder rating" }),
    ];
  }

  if (seed.layout === "pricing" || seed.layout === "donation") {
    return [
      createDefaultItem(seed, 0, { title: "Starter", value: "$19", body: "For small field teams." }),
      createDefaultItem(seed, 1, { title: "Team", value: "$49", body: "For active operations." }),
      createDefaultItem(seed, 2, { title: "Org", value: "$99", body: "For multi-project programs." }),
    ];
  }

  if (seed.layout === "tabs") {
    return [
      createDefaultItem(seed, 0, { title: "Overview", body: "High-level summary for quick orientation." }),
      createDefaultItem(seed, 1, { title: "Method", body: "How data was collected and validated." }),
      createDefaultItem(seed, 2, { title: "Findings", body: "Key patterns and implications." }),
    ];
  }

  if (seed.layout === "sticky-progress") {
    return [
      createDefaultItem(seed, 0, { title: "Context" }),
      createDefaultItem(seed, 1, { title: "Methods" }),
      createDefaultItem(seed, 2, { title: "Results" }),
      createDefaultItem(seed, 3, { title: "Next steps" }),
    ];
  }

  if (seed.layout === "slider") {
    return [
      createDefaultItem(seed, 0, { title: "Before", image: "https://picsum.photos/seed/slider-before-default/1200/700" }),
      createDefaultItem(seed, 1, { title: "After", image: "https://picsum.photos/seed/slider-after-default/1200/700" }),
    ];
  }

  if (seed.layout === "faq") {
    return Array.from({ length: 4 }, (_, index) =>
      createDefaultItem(seed, index, {
        title: `FAQ question ${index + 1}`,
        body: "Add a concise answer with practical guidance.",
      }),
    );
  }

  if (seed.layout === "links" || seed.layout === "references" || seed.layout === "anchor-nav") {
    return [
      createDefaultItem(seed, 0, { title: "Overview", body: "High-level context link." }),
      createDefaultItem(seed, 1, { title: "Methods", body: "How the data was captured." }),
      createDefaultItem(seed, 2, { title: "Results", body: "Detailed outputs and interpretation." }),
    ];
  }

  if (seed.layout === "choice" || seed.layout === "poll" || seed.layout === "quiz") {
    return [
      createDefaultItem(seed, 0, { title: "Option A", body: "Primary option details." }),
      createDefaultItem(seed, 1, { title: "Option B", body: "Alternative option details." }),
      createDefaultItem(seed, 2, { title: "Option C", body: "Optional third choice." }),
    ];
  }

  if (seed.layout === "filter" || seed.layout === "sort" || seed.layout === "tag-selector") {
    return [
      createDefaultItem(seed, 0, { title: "Route A", body: "High canopy cover.", tag: "High elevation", value: "92" }),
      createDefaultItem(seed, 1, { title: "Route B", body: "Open edge habitat.", tag: "Edge", value: "64" }),
      createDefaultItem(seed, 2, { title: "Route C", body: "Mixed canopy and stream.", tag: "Riparian", value: "78" }),
    ];
  }

  if (seed.layout === "scenario") {
    return [
      createDefaultItem(seed, 0, { title: "Heavy rain", body: "Switch to sheltered route and shorten loop.", link: "https://example.com/rain-plan" }),
      createDefaultItem(seed, 1, { title: "Equipment failure", body: "Use backup kit and reduce sampling scope.", link: "https://example.com/backup-kit" }),
    ];
  }

  return Array.from({ length: 4 }, (_, index) =>
    createDefaultItem(seed, index, {
      title: `Item ${index + 1}`,
      body: `Adapt this ${seed.layout.replaceAll("-", " ")} element for your narrative.`,
    }),
  );
}

function createDefaultItem(seed: TemplateSeed, index: number, overrides?: Partial<DefaultChunkItem>): DefaultChunkItem {
  return {
    title: `Item ${index + 1}`,
    body: `Adapt this ${seed.layout.replaceAll("-", " ")} element for your narrative.`,
    link: "https://example.com",
    image: `https://picsum.photos/seed/${seed.id}-${index + 1}/1000/700`,
    tag: "General",
    value: String((index + 1) * 12),
    done: false,
    ...(overrides ?? {}),
  };
}

type ChunkPresentation = {
  width: "content" | "wide" | "full";
  align: "left" | "center" | "right";
  headerAlign: "left" | "center" | "right";
  padding: number;
  radius: number;
  borderOpacity: number;
  blur: number;
  shadow: number;
  itemGap: number;
  mediaRadius: number;
  controlShape: "pill" | "rounded" | "square";
  surfaceBackgroundColor: string;
  surfaceTextColor: string;
  headingColor: string;
  summaryColor: string;
  controlBackgroundColor: string;
  controlTextColor: string;
};

const CHUNK_ACCENT_COLORS: Record<string, string> = {
  ember: "#f26d3d",
  tide: "#2f6cf6",
  moss: "#14825d",
  rose: "#c94975",
  gold: "#ce9123",
  slate: "#485e7e",
};

function readChunkPresentation(data: ChunkData): ChunkPresentation {
  return {
    width: readOneOf(data, "containerWidth", ["content", "wide", "full"], "wide"),
    align: readOneOf(data, "containerAlign", ["left", "center", "right"], "center"),
    headerAlign: readOneOf(data, "headerAlign", ["left", "center", "right"], "left"),
    padding: readNumber(data, "surfacePadding", 14, 4, 40),
    radius: readNumber(data, "surfaceRadius", 16, 0, 40),
    borderOpacity: readNumber(data, "surfaceBorderOpacity", 12, 0, 100),
    blur: readNumber(data, "surfaceBlur", 0, 0, 18),
    shadow: readNumber(data, "surfaceShadow", 12, 0, 48),
    itemGap: readNumber(data, "itemGap", 10, 0, 30),
    mediaRadius: readNumber(data, "mediaRadius", 12, 0, 32),
    controlShape: readOneOf(data, "controlShape", ["pill", "rounded", "square"], "pill"),
    surfaceBackgroundColor: readColor(data, "surfaceBackgroundColor", "rgba(255,255,255,0.74)"),
    surfaceTextColor: readColor(data, "surfaceTextColor", "#21160f"),
    headingColor: readColor(data, "headingColor", "#21160f"),
    summaryColor: readColor(data, "summaryColor", "#6b584a"),
    controlBackgroundColor: readColor(data, "controlBackgroundColor", "rgba(255,255,255,0.92)"),
    controlTextColor: readColor(data, "controlTextColor", "#21160f"),
  };
}

function buildChunkStyleAttribute(presentation: ChunkPresentation, accent: string) {
  const width = presentation.width === "content" ? "72%" : presentation.width === "wide" ? "88%" : "100%";
  const maxWidth = presentation.width === "content" ? "760px" : presentation.width === "wide" ? "1160px" : "100%";
  const marginLeft = presentation.align === "right" ? "auto" : presentation.align === "center" ? "auto" : "0";
  const marginRight = presentation.align === "left" ? "auto" : presentation.align === "center" ? "auto" : "0";
  const controlRadius = presentation.controlShape === "square" ? "8px" : presentation.controlShape === "rounded" ? "12px" : "999px";
  const shadowAlpha = clampNumber(0.06 + presentation.shadow / 260, 0.04, 0.36);
  const accentColor = CHUNK_ACCENT_COLORS[accent] ?? CHUNK_ACCENT_COLORS.ember;
  const styleEntries: Array<[string, string]> = [
    ["--vi-accent", accentColor],
    ["--vi-accent-soft", "color-mix(in srgb, var(--vi-accent, #f26d3d) 12%, white)"],
    ["--vi-accent-soft-strong", "color-mix(in srgb, var(--vi-accent, #f26d3d) 20%, white)"],
    ["--vi-accent-border", "color-mix(in srgb, var(--vi-accent, #f26d3d) 34%, transparent)"],
    ["--vi-accent-border-strong", "color-mix(in srgb, var(--vi-accent, #f26d3d) 46%, transparent)"],
    ["--vi-positive", "color-mix(in srgb, var(--vi-accent, #f26d3d) 34%, #14825d)"],
    ["--vi-positive-soft", "color-mix(in srgb, var(--vi-positive, #14825d) 18%, white)"],
    ["--vi-negative", "color-mix(in srgb, var(--vi-accent, #f26d3d) 30%, #c24f3f)"],
    ["--vi-negative-soft", "color-mix(in srgb, var(--vi-negative, #c24f3f) 16%, white)"],
    ["--vi-warning", "color-mix(in srgb, var(--vi-accent, #f26d3d) 58%, #8c6a2e)"],
    ["--vi-container-width", width],
    ["--vi-container-max-width", maxWidth],
    ["--vi-container-margin-left", marginLeft],
    ["--vi-container-margin-right", marginRight],
    ["--vi-container-padding", `${presentation.padding}px`],
    ["--vi-container-radius", `${presentation.radius}px`],
    ["--vi-container-border-color", `rgba(0,0,0,${(presentation.borderOpacity / 100).toFixed(2)})`],
    ["--vi-container-bg", presentation.surfaceBackgroundColor],
    ["--vi-container-blur", `${presentation.blur}px`],
    ["--vi-container-shadow", presentation.shadow > 0 ? `0 14px ${Math.max(16, presentation.shadow * 2)}px rgba(0,0,0,${shadowAlpha.toFixed(2)})` : "none"],
    ["--vi-chunk-text", presentation.surfaceTextColor],
    ["--vi-heading-color", presentation.headingColor],
    ["--vi-summary-color", presentation.summaryColor],
    ["--vi-header-align", presentation.headerAlign],
    ["--vi-item-gap", `${presentation.itemGap}px`],
    ["--vi-media-radius", `${presentation.mediaRadius}px`],
    ["--vi-control-radius", controlRadius],
    ["--vi-control-bg", presentation.controlBackgroundColor],
    ["--vi-control-color", presentation.controlTextColor],
  ];

  return styleEntries.map(([key, val]) => `${key}:${val}`).join(";");
}

function renderTemplate(seed: TemplateSeed, data: ChunkData): string {
  const conceptId = seed.conceptId ?? seed.id;
  const title = escapeHtml(readString(data, "title", formatTemplateLabel(conceptId)));
  const summary = escapeHtml(readString(data, "summary", ""));
  const accent = readAccent(data);
  const presentation = readChunkPresentation(data);
  const items = readItems(data);
  const toneClass = `vi-tone-${accent}`;
  const runtimeAttr = seed.restriction === "enhanced" ? "required" : "none";
  const engine = seed.id.endsWith("-js") ? "javascript" : "html";
  const isJavaScriptEngine = engine === "javascript";
  const chunkStyle = buildChunkStyleAttribute(presentation, accent);
  const interactionPreset = escapeAttribute(readString(data, "interactionPreset", "balanced"));
  const gestureMode = escapeAttribute(readString(data, "gestureMode", "pointer-touch"));
  const runtimeUpdateInterval = String(readNumber(data, "runtimeUpdateIntervalMs", 1000, 250, 30000));
  const deferHydration = readBoolean(data, "deferHydrationUntilVisible", false) ? "true" : "false";
  const persistInteractionState = isJavaScriptEngine && readBoolean(data, "persistInteractionState", true) ? "true" : "false";
  const announceInteractionState = isJavaScriptEngine && readBoolean(data, "announceInteractionState", true) ? "true" : "false";
  const stateMemory = escapeAttribute(readString(data, "stateMemory", isJavaScriptEngine ? "session" : "none"));
  const statusVerbosity = escapeAttribute(readString(data, "statusVerbosity", isJavaScriptEngine ? "balanced" : "concise"));
  const keyboardShortcuts = isJavaScriptEngine && readBoolean(data, "keyboardShortcuts", true) ? "true" : "false";
  const navigationWrap = isJavaScriptEngine && readBoolean(data, "navigationWrap", true) ? "true" : "false";
  const hoverActivation = isJavaScriptEngine && readBoolean(data, "hoverActivation", false) ? "true" : "false";
  const autoAdvanceMs = String(readNumber(data, "autoAdvanceMs", 0, 0, isJavaScriptEngine ? 30000 : 0));
  const motionProfile = escapeAttribute(readString(data, "motionProfile", isJavaScriptEngine ? "balanced" : "reduced"));
  const highlightIntensity = escapeAttribute(readString(data, "highlightIntensity", isJavaScriptEngine ? "balanced" : "subtle"));
  const transitionMs = String(readNumber(data, "transitionMs", isJavaScriptEngine ? 340 : 0, 0, isJavaScriptEngine ? 5000 : 0));
  const selectionBehavior = escapeAttribute(
    readString(data, "selectionBehavior", isJavaScriptEngine ? "single" : "none"),
  );
  const detailsDisclosureMode = escapeAttribute(
    readString(data, "detailsDisclosureMode", isJavaScriptEngine ? "single" : "multiple"),
  );
  const showInteractionStatus = isJavaScriptEngine && readBoolean(data, "showInteractionStatus", true) ? "true" : "false";
  const statusOnLoad = isJavaScriptEngine && readBoolean(data, "statusOnLoad", false) ? "true" : "false";
  const staggerRevealMs = String(readNumber(data, "staggerRevealMs", isJavaScriptEngine ? 40 : 0, 0, 400));

  const header = `<header class="vi-chunk-head"><h3>${title}</h3>${summary ? `<p>${summary}</p>` : ""}</header>`;
  const rawBody = renderTemplateVariant(seed, items, data) ?? renderLayout(seed.layout, items, data);
  const normalizedBody = normalizeVariantInlineAccentStyles(rawBody);
  const body = isJavaScriptEngine ? injectJavaScriptSelectableMarkers(normalizedBody) : normalizedBody;

  return `<section class="vi-chunk vi-template-${seed.id} ${toneClass}" data-vi-template="${seed.id}" data-vi-contract="${seed.id}" data-vi-runtime="${runtimeAttr}" data-vi-layout="${seed.layout}" data-vi-engine="${engine}" data-vi-interaction-preset="${interactionPreset}" data-vi-gesture-mode="${gestureMode}" data-vi-runtime-update-ms="${runtimeUpdateInterval}" data-vi-defer-hydration="${deferHydration}" data-vi-persist-state="${persistInteractionState}" data-vi-announce-state="${announceInteractionState}" data-vi-state-memory="${stateMemory}" data-vi-status-verbosity="${statusVerbosity}" data-vi-keyboard-shortcuts="${keyboardShortcuts}" data-vi-navigation-wrap="${navigationWrap}" data-vi-hover-activation="${hoverActivation}" data-vi-auto-advance-ms="${autoAdvanceMs}" data-vi-motion-profile="${motionProfile}" data-vi-highlight-intensity="${highlightIntensity}" data-vi-transition-ms="${transitionMs}" data-vi-selection-behavior="${selectionBehavior}" data-vi-details-mode="${detailsDisclosureMode}" data-vi-show-status="${showInteractionStatus}" data-vi-status-on-load="${statusOnLoad}" data-vi-stagger-ms="${staggerRevealMs}" style="${escapeAttribute(chunkStyle)}">${header}${body}</section>`;
}

function renderTemplateVariant(seed: TemplateSeed, items: ChunkItem[], data: ChunkData): string | null {
  switch (seed.conceptId ?? seed.id) {
    case "scroll-carousel":
      return renderScrollCarousel(items, data);
    case "snap-gallery-strip":
      return renderSnapGalleryStrip(items, data, seed.id.endsWith("-js"));
    case "masonry-gallery":
      return renderMasonryGallery(items);
    case "filmstrip-gallery":
      return renderFilmstripGallery(items);
    case "stacked-photo-essay":
      return renderStackedPhotoEssay(items);
    case "vertical-timeline":
      return renderVerticalTimeline(items);
    case "chapter-divider-band":
      return renderChapterDividerBand(items);
    case "process-roadmap":
      return renderProcessRoadmap(items);
    case "quote-journey-strip":
      return renderQuoteJourneyStrip(items);
    case "expandable-timeline":
      return renderExpandableTimeline(items);
    case "footnote-popovers":
      return renderFootnotePopovers(items);
    case "milestone-cards":
      return renderMilestoneCards(items);
    case "key-takeaways-panel":
      return renderTakeawaysPanel(items);
    case "metric-cards-row":
      return renderMetricCardsRow(items);
    case "stat-spotlight":
      return renderStatSpotlight(items);
    case "kpi-trend-cards":
      return renderKpiTrendCards(items);
    case "feature-matrix-grid":
      return renderFeatureMatrixGrid(items);
    case "checklist-progress":
      return renderChecklistProgress(items);
    case "map-spotlight-card":
      return renderMapSpotlightCard(items);
    case "region-facts-grid":
      return renderRegionFactsGrid(items);
    case "species-observation-card":
      return renderSpeciesObservationCard(items);
    case "route-legs-list":
      return renderRouteLegsList(items);
    case "location-checklist":
      return renderLocationChecklist(items);
    case "weather-window-card":
      return renderWeatherWindowCard(items);
    case "cta-banner":
      return renderCtaBanner(items);
    case "related-links-grid":
      return renderRelatedLinksGrid(items);
    case "resource-download-card":
      return renderResourceDownloadCard(items);
    case "author-bio-card":
      return renderAuthorBioCard(items);
    case "social-proof-strip":
      return renderSocialProofStrip(items);
    case "testimonial-quote-grid":
      return renderTestimonialQuoteGrid(items);
    case "pricing-tier-cards":
      return renderPricingTierCards(items);
    case "donation-impact-cards":
      return renderDonationImpactCards(items);
    case "faq-accordion-details":
      return renderFaqAccordionDetails(items);
    case "reveal-spoiler":
      return renderRevealSpoiler(items);
    case "expandable-details-stack":
      return renderExpandableDetailsStack(items);
    case "anchor-jump-menu":
      return renderAnchorJumpMenu(items);
    case "dual-choice-cards":
      return renderDualChoiceCards(items);
    case "true-false-cards":
      return renderTrueFalseCards(items);
    case "filterable-card-grid":
      return renderFilterableCardGrid(items);
    case "sort-toggle-grid":
      return renderSortToggleGrid(items);
    case "tag-selector-board":
      return renderTagSelectorBoard(items);
    case "scenario-branch-cards":
      return renderScenarioBranchCards(items);
    case "contact-form-lite":
      return renderContactFormLite();
    case "subscribe-box":
      return renderSubscribeBox();
    case "copyable-reference-list":
      return renderCopyableReferenceList(items);
    case "deadline-callout":
      return renderDeadlineCallout(items);
    default:
      return null;
  }
}

function renderScrollCarousel(items: ChunkItem[], data: ChunkData) {
  const cardWidth = readNumber(data, "carouselCardWidth", 360, 220, 720);
  const fadeWidth = readNumber(data, "carouselFadeWidth", 44, 0, 220);
  const fadeBlur = readNumber(data, "carouselFadeBlur", 0, 0, 22);
  const fadeColor = readColor(data, "carouselFadeColor", "#ffffff");
  const showArrows = readBoolean(data, "carouselShowArrows", true);
  const previousIcon = sanitizeIconLabel(readString(data, "carouselPrevIcon", "◀"), "◀");
  const nextIcon = sanitizeIconLabel(readString(data, "carouselNextIcon", "▶"), "▶");
  const arrowSize = readNumber(data, "carouselArrowSize", 34, 24, 70);
  const arrowBackgroundColor = readColor(data, "carouselArrowBgColor", "rgba(255,255,255,0.9)");
  const arrowColor = normalizeCarouselArrowColor(readColor(data, "carouselArrowColor", "#1e88e5"));
  const arrowOffset = readNumber(data, "carouselArrowOffset", 6, 0, 48);
  const scrollStep = readNumber(data, "carouselScrollStep", 340, 120, 1200);

  const cards = items
    .map(
      (item) =>
        `<figure style="margin:0;flex:0 0 auto;width:min(${cardWidth}px,82vw);scroll-snap-align:start;text-align:center;">
          <a href="${escapeAttribute(safeUrl(item.image))}" target="_blank" rel="noopener">
            <img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" style="width:100%;height:280px;object-fit:cover;border-radius:12px;display:block;box-shadow:0 10px 26px rgba(0,0,0,.12);border:1px solid color-mix(in srgb, var(--vi-accent, #2f6cf6) 24%, transparent);" />
          </a>
          <figcaption style="font-size:14px;margin-top:8px;opacity:.95;"><strong>${escapeHtml(item.title)}</strong>${item.body ? ` - ${escapeHtml(item.body)}` : ""}</figcaption>
        </figure>`,
    )
    .join("");

  return `<div data-vi-component="scroll-carousel" data-vi-scroll-step="${scrollStep}" style="position:relative;border:1px solid color-mix(in srgb, var(--vi-accent, #2f6cf6) 35%, transparent);border-radius:14px;padding:12px;background:linear-gradient(180deg, color-mix(in srgb, var(--vi-accent, #2f6cf6) 10%, white), color-mix(in srgb, var(--vi-accent, #2f6cf6) 4%, white));overflow:hidden;">
      <div aria-hidden="true" style="position:absolute;left:0;top:0;width:${fadeWidth}px;height:100%;pointer-events:none;z-index:2;background:linear-gradient(to right, ${fadeColor}, transparent);${fadeBlur > 0 ? `backdrop-filter:blur(${fadeBlur}px);` : ""}"></div>
      <div aria-hidden="true" style="position:absolute;right:0;top:0;width:${fadeWidth}px;height:100%;pointer-events:none;z-index:2;background:linear-gradient(to left, ${fadeColor}, transparent);${fadeBlur > 0 ? `backdrop-filter:blur(${fadeBlur}px);` : ""}"></div>
      ${
        showArrows
          ? `<button type="button" data-vi-carousel-prev aria-label="Scroll carousel backward" style="position:absolute;left:${arrowOffset}px;top:50%;transform:translateY(-50%);z-index:3;width:${arrowSize}px;height:${arrowSize}px;border-radius:999px;border:1px solid rgba(0,0,0,.16);background:${arrowBackgroundColor};color:${arrowColor};display:grid;place-items:center;cursor:pointer;">${escapeHtml(previousIcon)}</button>
      <button type="button" data-vi-carousel-next aria-label="Scroll carousel forward" style="position:absolute;right:${arrowOffset}px;top:50%;transform:translateY(-50%);z-index:3;width:${arrowSize}px;height:${arrowSize}px;border-radius:999px;border:1px solid rgba(0,0,0,.16);background:${arrowBackgroundColor};color:${arrowColor};display:grid;place-items:center;cursor:pointer;">${escapeHtml(nextIcon)}</button>`
          : ""
      }
      <div style="display:flex;align-items:center;gap:10px;margin:0 0 10px 0;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:var(--vi-accent, #2f6cf6);"></span>
        <div style="font-size:14px;opacity:.9;">Scroll/swipe to browse • Click image to open full size</div>
      </div>
      <div data-vi-carousel-track style="display:flex;overflow-x:auto;gap:16px;padding:8px 4px 10px 4px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;">
        ${cards}
      </div>
    </div>`;
}

function renderSnapGalleryStrip(items: ChunkItem[], data: ChunkData, isJavaScript = false) {
  const cardWidth = readNumber(data, "galleryCardWidth", 260, 180, 640);
  const imageHeight = readNumber(data, "galleryImageHeight", 180, 120, 420);
  const showArrows = isJavaScript ? readBoolean(data, "snapGalleryShowArrows", true) : false;
  const autoPlayHint = isJavaScript
    ? '<small style="display:block;margin:0 0 8px 0;opacity:.78;">Use arrows, trackpad, or keyboard to navigate.</small>'
    : "";

  return `<div data-vi-component="snap-gallery" style="position:relative;padding:8px 0;">
      <div aria-hidden="true" style="position:absolute;left:0;top:0;bottom:0;width:32px;pointer-events:none;background:linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0));"></div>
      <div aria-hidden="true" style="position:absolute;right:0;top:0;bottom:0;width:32px;pointer-events:none;background:linear-gradient(to left, rgba(255,255,255,0.95), rgba(255,255,255,0));"></div>
      ${
        showArrows
          ? `<button type="button" data-vi-carousel-prev aria-label="Scroll snap gallery backward" style="position:absolute;left:6px;top:50%;transform:translateY(-50%);z-index:3;width:34px;height:34px;border-radius:999px;border:1px solid rgba(0,0,0,.16);background:#fff;color:#1f1f1f;display:grid;place-items:center;cursor:pointer;">◀</button>
      <button type="button" data-vi-carousel-next aria-label="Scroll snap gallery forward" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);z-index:3;width:34px;height:34px;border-radius:999px;border:1px solid rgba(0,0,0,.16);background:#fff;color:#1f1f1f;display:grid;place-items:center;cursor:pointer;">▶</button>`
          : ""
      }
      ${autoPlayHint}
      <div data-vi-carousel-track style="display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 4px 10px 4px;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;">
        ${items
          .slice(0, 10)
          .map(
            (item) => `<article style="scroll-snap-align:center;flex:0 0 auto;width:min(${cardWidth}px,74vw);border:1px solid rgba(0,0,0,.12);border-radius:12px;overflow:hidden;background:#fff;">
                <img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" style="width:100%;height:${imageHeight}px;object-fit:cover;display:block;" />
                <div style="padding:8px 10px;">
                  <strong style="display:block;font-size:14px;">${escapeHtml(item.title)}</strong>
                  <small style="opacity:.85;">${escapeHtml(item.body)}</small>
                </div>
              </article>`,
          )
          .join("")}
      </div>
    </div>`;
}

function renderMasonryGallery(items: ChunkItem[]) {
  return `<div style="columns:220px;column-gap:12px;">
      ${items
        .slice(0, 10)
        .map(
          (item, index) => `<figure style="break-inside:avoid;margin:0 0 12px 0;border:1px solid rgba(0,0,0,.12);border-radius:12px;overflow:hidden;background:#fff;">
              <img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" style="width:100%;height:${index % 3 === 0 ? "260px" : index % 3 === 1 ? "210px" : "290px"};object-fit:cover;display:block;" />
              <figcaption style="padding:8px 10px;font-size:13px;">${escapeHtml(item.title)}</figcaption>
            </figure>`,
        )
        .join("")}
    </div>`;
}

function renderFilmstripGallery(items: ChunkItem[]) {
  const featured = items[0] ?? { title: "Featured", body: "", image: "", link: "" };
  return `<div style="display:grid;gap:10px;">
      <figure style="margin:0;border:1px solid rgba(0,0,0,.12);border-radius:14px;overflow:hidden;background:#fff;">
        <img src="${escapeAttribute(safeUrl(featured.image))}" alt="${escapeAttribute(featured.title)}" style="width:100%;height:320px;object-fit:cover;display:block;" />
        <figcaption style="padding:10px 12px;"><strong>${escapeHtml(featured.title)}</strong><div style="opacity:.88;">${escapeHtml(featured.body)}</div></figcaption>
      </figure>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
        ${items
          .slice(1, 10)
          .map(
            (item) => `<a href="${escapeAttribute(safeUrl(item.image))}" target="_blank" rel="noopener" style="flex:0 0 auto;width:120px;text-decoration:none;color:inherit;">
                <img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" style="width:120px;height:82px;object-fit:cover;border-radius:10px;border:1px solid rgba(0,0,0,.14);display:block;" />
                <small style="display:block;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.title)}</small>
              </a>`,
          )
          .join("")}
      </div>
    </div>`;
}

function renderStackedPhotoEssay(items: ChunkItem[]) {
  return `<div style="display:grid;gap:12px;">
      ${items
        .slice(0, 6)
        .map(
          (item) => `<article style="display:flex;flex-wrap:wrap;gap:12px;border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:10px;background:#fff;">
              <img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" style="width:min(240px,100%);height:160px;object-fit:cover;border-radius:10px;display:block;" />
              <div style="flex:1;min-width:180px;">
                <h4 style="margin:0 0 6px 0;font-size:16px;">${escapeHtml(item.title)}</h4>
                <p style="margin:0;opacity:.9;">${escapeHtml(item.body)}</p>
              </div>
            </article>`,
        )
        .join("")}
    </div>`;
}

function renderVerticalTimeline(items: ChunkItem[]) {
  return `<ol style="list-style:none;margin:0;padding:0;display:grid;gap:10px;">
      ${items
        .slice(0, 8)
        .map(
          (item, index) => `<li style="display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;align-items:start;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:rgba(47,108,246,.16);font-size:12px;">${index + 1}</span>
              <article style="border-left:2px solid rgba(47,108,246,.28);padding-left:10px;">
                <strong>${escapeHtml(item.title)}</strong>
                <p style="margin:4px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p>
              </article>
            </li>`,
        )
        .join("")}
    </ol>`;
}

function renderChapterDividerBand(items: ChunkItem[]) {
  const first = items[0] ?? { title: "Chapter", body: "Section transition" };
  return `<div style="border:1px dashed rgba(0,0,0,.25);border-radius:12px;padding:12px;background:linear-gradient(90deg, rgba(242,109,61,.1), rgba(47,108,246,.08));text-align:center;">
      <small style="letter-spacing:.08em;text-transform:uppercase;opacity:.75;">Chapter Divider</small>
      <h4 style="margin:6px 0 4px 0;">${escapeHtml(first.title)}</h4>
      <p style="margin:0;opacity:.88;">${escapeHtml(first.body)}</p>
    </div>`;
}

function renderProcessRoadmap(items: ChunkItem[]) {
  return `<ol style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px;">
      ${items
        .slice(0, 6)
        .map(
          (item, index) => `<li style="flex:1 1 180px;border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:10px;background:#fff;">
              <small style="opacity:.76;">Step ${index + 1}</small>
              <strong style="display:block;margin-top:4px;">${escapeHtml(item.title)}</strong>
              <p style="margin:4px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p>
            </li>`,
        )
        .join("")}
    </ol>`;
}

function renderQuoteJourneyStrip(items: ChunkItem[]) {
  return `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
      ${items
        .slice(0, 6)
        .map(
          (item) => `<blockquote style="margin:0;flex:0 0 min(260px,78vw);border-left:3px solid rgba(242,109,61,.6);background:#fff;border-radius:10px;padding:10px;">
              <p style="margin:0;">"${escapeHtml(item.body)}"</p>
              <cite style="display:block;margin-top:6px;font-style:normal;font-weight:600;">${escapeHtml(item.title)}</cite>
            </blockquote>`,
        )
        .join("")}
    </div>`;
}

function renderExpandableTimeline(items: ChunkItem[]) {
  return `<div class="vi-faq">
      ${items
        .slice(0, 8)
        .map(
          (item, index) => `<details ${index === 0 ? "open" : ""} style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;background:#fff;">
              <summary><strong>${escapeHtml(item.title)}</strong></summary>
              <p style="margin:8px 0 0 0;">${escapeHtml(item.body)}</p>
              <small style="opacity:.75;">${escapeHtml(item.tag || `Stage ${index + 1}`)}</small>
            </details>`,
        )
        .join("")}
    </div>`;
}

function renderFootnotePopovers(items: ChunkItem[]) {
  return `<ol style="margin:0;padding-left:20px;display:grid;gap:8px;">
      ${items
        .slice(0, 8)
        .map(
          (item, index) => `<li style="position:relative;">
            <button type="button" data-vi-component="footnote" data-vi-footnote="${index}" aria-expanded="false" style="border:0;background:transparent;color:inherit;padding:0;text-align:left;cursor:pointer;">
              <sup>${index + 1}</sup> ${escapeHtml(item.title)}
            </button>
            <div hidden data-vi-footnote-popover="${index}" style="margin-top:6px;padding:8px 10px;border-radius:10px;border:1px solid rgba(0,0,0,.14);background:#fff;box-shadow:0 10px 24px rgba(0,0,0,.08);">
              <small style="display:block;opacity:.92;">${escapeHtml(item.body)}</small>
            </div>
          </li>`,
        )
        .join("")}
    </ol>`;
}

function renderMilestoneCards(items: ChunkItem[]) {
  return `<ol style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
      ${items
        .slice(0, 6)
        .map(
          (item, index) => `<li style="border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:10px;background:#fff;">
              <span style="display:inline-block;font-size:12px;border-radius:999px;padding:2px 8px;background:rgba(47,108,246,.12);margin-bottom:6px;">Milestone ${index + 1}</span>
              <strong style="display:block;">${escapeHtml(item.title)}</strong>
              <p style="margin:6px 0 0 0;font-size:14px;opacity:.9;">${escapeHtml(item.body)}</p>
            </li>`,
        )
        .join("")}
    </ol>`;
}

function renderTakeawaysPanel(items: ChunkItem[]) {
  return `<div style="border:1px solid rgba(20,130,93,.28);border-radius:12px;padding:12px;background:linear-gradient(180deg, rgba(20,130,93,.08), rgba(20,130,93,.02));">
      <ul style="margin:0;padding:0;list-style:none;display:grid;gap:8px;">
        ${items
          .slice(0, 6)
          .map(
            (item) => `<li style="display:flex;gap:8px;align-items:flex-start;">
                <span style="display:inline-flex;width:18px;height:18px;border-radius:999px;background:#14825d;color:#fff;align-items:center;justify-content:center;font-size:12px;">✓</span>
                <div><strong>${escapeHtml(item.title)}</strong><div style="opacity:.88;">${escapeHtml(item.body)}</div></div>
              </li>`,
          )
          .join("")}
      </ul>
    </div>`;
}

function renderMetricCardsRow(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
      ${items
        .slice(0, 4)
        .map(
          (item) => `<article style="border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:10px;background:#fff;">
              <strong style="display:block;font-size:24px;line-height:1;color:#2f6cf6;">${escapeHtml(item.value)}</strong>
              <span style="display:block;margin-top:4px;font-weight:600;">${escapeHtml(item.title)}</span>
              <small style="opacity:.86;">${escapeHtml(item.body)}</small>
            </article>`,
        )
        .join("")}
    </div>`;
}

function renderStatSpotlight(items: ChunkItem[]) {
  const stat = items[0] ?? { title: "Headline stat", body: "", value: "0" };
  return `<article style="text-align:center;border:1px solid rgba(47,108,246,.3);border-radius:14px;padding:18px 12px;background:linear-gradient(180deg, rgba(47,108,246,.08), rgba(47,108,246,.02));">
      <strong style="display:block;font-size:42px;line-height:1;color:#2f6cf6;">${escapeHtml(stat.value)}</strong>
      <h4 style="margin:8px 0 6px 0;">${escapeHtml(stat.title)}</h4>
      <p style="margin:0;opacity:.9;">${escapeHtml(stat.body)}</p>
    </article>`;
}

function renderKpiTrendCards(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
      ${items
        .slice(0, 4)
        .map((item, index) => {
          const trendUp = index % 2 === 0;
          return `<article style="border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:10px;background:#fff;">
              <small style="opacity:.78;">${escapeHtml(item.tag || "KPI")}</small>
              <strong style="display:block;font-size:26px;margin-top:2px;">${escapeHtml(item.value)}</strong>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
                <span style="color:${trendUp ? "#14825d" : "#c24f3f"};font-weight:700;">${trendUp ? "▲" : "▼"}</span>
                <span style="font-size:13px;opacity:.9;">${escapeHtml(item.title)}</span>
              </div>
              <small style="display:block;margin-top:4px;opacity:.84;">${escapeHtml(item.body)}</small>
            </article>`;
        })
        .join("")}
    </div>`;
}

function renderFeatureMatrixGrid(items: ChunkItem[]) {
  return `<table style="width:100%;border-collapse:collapse;">
      <thead><tr><th style="text-align:left;border-bottom:1px solid rgba(0,0,0,.16);padding:6px;">Feature</th><th style="text-align:left;border-bottom:1px solid rgba(0,0,0,.16);padding:6px;">Coverage</th><th style="text-align:left;border-bottom:1px solid rgba(0,0,0,.16);padding:6px;">Notes</th></tr></thead>
      <tbody>
        ${items
          .slice(0, 8)
          .map(
            (item) => `<tr><td style="padding:6px;border-bottom:1px solid rgba(0,0,0,.08);">${escapeHtml(item.title)}</td><td style="padding:6px;border-bottom:1px solid rgba(0,0,0,.08);">${escapeHtml(item.value)}</td><td style="padding:6px;border-bottom:1px solid rgba(0,0,0,.08);">${escapeHtml(item.body)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderChecklistProgress(items: ChunkItem[]) {
  const total = Math.max(items.length, 1);
  const checked = items.filter((item) => item.done).length;
  const ratio = Math.round((checked / total) * 100);
  return `<div data-vi-component="checklist-progress">
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;"><strong>Progress</strong><span data-vi-progress-value>${ratio}% complete</span></div>
      <div style="height:8px;border-radius:999px;background:rgba(0,0,0,.1);overflow:hidden;margin-bottom:10px;"><span data-vi-progress-fill style="display:block;height:100%;width:${ratio}%;background:#14825d;"></span></div>
      <ul style="list-style:none;margin:0;padding:0;display:grid;gap:6px;">
        ${items
          .slice(0, 8)
          .map(
            (item) =>
              `<li style="display:flex;gap:8px;align-items:center;"><input type="checkbox" data-vi-check-item ${item.done ? "checked" : ""} /><span>${escapeHtml(item.title)}</span></li>`,
          )
          .join("")}
      </ul>
    </div>`;
}

function renderMapSpotlightCard(items: ChunkItem[]) {
  const spot = items[0] ?? { title: "Location", body: "", image: "", value: "" };
  return `<article style="display:grid;grid-template-columns:minmax(120px,180px) minmax(0,1fr);gap:10px;border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:10px;background:#fff;">
      <img src="${escapeAttribute(safeUrl(spot.image))}" alt="${escapeAttribute(spot.title)}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;" />
      <div>
        <strong style="display:block;">${escapeHtml(spot.title)}</strong>
        <small style="opacity:.78;">${escapeHtml(spot.value || "Coordinates")}</small>
        <p style="margin:6px 0 0 0;opacity:.88;">${escapeHtml(spot.body)}</p>
      </div>
    </article>`;
}

function renderRegionFactsGrid(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
      ${items
        .slice(0, 8)
        .map(
          (item) => `<article style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;background:#fff;">
              <small style="opacity:.76;">${escapeHtml(item.tag || "Fact")}</small>
              <strong style="display:block;margin-top:2px;">${escapeHtml(item.title)}</strong>
              <div style="font-size:20px;color:#2f6cf6;margin-top:4px;">${escapeHtml(item.value)}</div>
            </article>`,
        )
        .join("")}
    </div>`;
}

function renderSpeciesObservationCard(items: ChunkItem[]) {
  const item = items[0] ?? { title: "Species", body: "", image: "", tag: "", value: "" };
  return `<article style="border:1px solid rgba(0,0,0,.14);border-radius:12px;overflow:hidden;background:#fff;">
      <img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" style="width:100%;height:220px;object-fit:cover;display:block;" />
      <div style="padding:10px;">
        <strong>${escapeHtml(item.title)}</strong>
        <div style="display:flex;gap:8px;margin-top:4px;font-size:13px;opacity:.8;"><span>${escapeHtml(item.tag || "Observed")}</span><span>${escapeHtml(item.value || "n/a")}</span></div>
        <p style="margin:6px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p>
      </div>
    </article>`;
}

function renderRouteLegsList(items: ChunkItem[]) {
  return `<ol style="margin:0;padding-left:20px;display:grid;gap:8px;">
      ${items
        .slice(0, 8)
        .map(
          (item) => `<li><strong>${escapeHtml(item.title)}</strong><div style="opacity:.84;">${escapeHtml(item.body)}</div><small style="opacity:.72;">${escapeHtml(item.value || item.tag)}</small></li>`,
        )
        .join("")}
    </ol>`;
}

function renderLocationChecklist(items: ChunkItem[]) {
  return `<fieldset style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:10px;">
      <legend style="padding:0 4px;">On-site checklist</legend>
      <ul style="list-style:none;margin:0;padding:0;display:grid;gap:6px;">
        ${items
          .slice(0, 8)
          .map(
            (item) =>
              `<li><label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" ${item.done ? "checked" : ""} /><span>${escapeHtml(item.title)}</span></label></li>`,
          )
          .join("")}
      </ul>
    </fieldset>`;
}

function renderWeatherWindowCard(items: ChunkItem[]) {
  const item = items[0] ?? { title: "Weather window", body: "", value: "" };
  return `<article style="border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:12px;background:linear-gradient(180deg, rgba(47,108,246,.1), rgba(47,108,246,.03));">
      <small style="opacity:.76;">Forecast window</small>
      <strong style="display:block;margin-top:4px;">${escapeHtml(item.title)}</strong>
      <div style="font-size:26px;color:#2f6cf6;margin-top:4px;">${escapeHtml(item.value)}°</div>
      <p style="margin:4px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p>
    </article>`;
}

function renderCtaBanner(items: ChunkItem[]) {
  const item = items[0] ?? { title: "Call to action", body: "", link: "" };
  return `<a href="${escapeAttribute(safeUrl(item.link))}" style="display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid rgba(242,109,61,.35);border-radius:12px;padding:12px;background:linear-gradient(90deg, rgba(242,109,61,.12), rgba(242,109,61,.02));text-decoration:none;color:inherit;">
      <span><strong style="display:block;">${escapeHtml(item.title)}</strong><small style="opacity:.84;">${escapeHtml(item.body)}</small></span>
      <span style="font-weight:700;">Go</span>
    </a>`;
}

function renderRelatedLinksGrid(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
      ${items
        .slice(0, 8)
        .map(
          (item) => `<a href="${escapeAttribute(safeUrl(item.link))}" style="display:block;border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;text-decoration:none;color:inherit;background:#fff;"><strong>${escapeHtml(item.title)}</strong><small style="display:block;opacity:.82;margin-top:4px;">${escapeHtml(item.body)}</small></a>`,
        )
        .join("")}
    </div>`;
}

function renderResourceDownloadCard(items: ChunkItem[]) {
  const resource = items[0] ?? { title: "Resource", body: "", link: "" };
  return `<article style="border:1px solid rgba(0,0,0,.14);border-radius:14px;padding:14px;background:#fff;display:grid;gap:8px;">
      <small style="opacity:.75;">Featured download</small>
      <strong style="font-size:18px;">${escapeHtml(resource.title)}</strong>
      <p style="margin:0;opacity:.88;">${escapeHtml(resource.body)}</p>
      <a href="${escapeAttribute(safeUrl(resource.link))}" style="display:inline-block;text-decoration:none;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:6px 12px;width:fit-content;">Download</a>
    </article>`;
}

function renderSocialProofStrip(items: ChunkItem[]) {
  return `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
      ${items
        .slice(0, 8)
        .map(
          (item) => `<div style="flex:0 0 auto;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:6px 10px;background:#fff;white-space:nowrap;">
              <strong>${escapeHtml(item.title)}</strong>
            </div>`,
        )
        .join("")}
    </div>`;
}

function renderTestimonialQuoteGrid(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
      ${items
        .slice(0, 6)
        .map(
          (item) => `<blockquote style="margin:0;border-left:3px solid rgba(47,108,246,.5);border-radius:10px;padding:10px;background:#fff;">
              <p style="margin:0;">"${escapeHtml(item.body)}"</p>
              <cite style="display:block;margin-top:6px;font-style:normal;opacity:.82;">${escapeHtml(item.title)}</cite>
            </blockquote>`,
        )
        .join("")}
    </div>`;
}

function renderPricingTierCards(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
      ${items
        .slice(0, 4)
        .map(
          (item, index) => `<article style="border:1px solid ${index === 1 ? "rgba(47,108,246,.45)" : "rgba(0,0,0,.12)"};border-radius:12px;padding:12px;background:#fff;">
              ${index === 1 ? '<small style="display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(47,108,246,.12);margin-bottom:6px;">Popular</small>' : ""}
              <strong style="display:block;">${escapeHtml(item.title)}</strong>
              <div style="font-size:24px;margin:6px 0;">${escapeHtml(item.value)}</div>
              <p style="margin:0;opacity:.88;">${escapeHtml(item.body)}</p>
            </article>`,
        )
        .join("")}
    </div>`;
}

function renderDonationImpactCards(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
      ${items
        .slice(0, 4)
        .map(
          (item) => `<article style="border:1px solid rgba(20,130,93,.28);border-radius:12px;padding:10px;background:rgba(20,130,93,.05);">
              <strong style="display:block;font-size:22px;color:#14825d;">${escapeHtml(item.value)}</strong>
              <span style="display:block;font-weight:600;margin-top:2px;">${escapeHtml(item.title)}</span>
              <small style="display:block;margin-top:4px;opacity:.86;">${escapeHtml(item.body)}</small>
            </article>`,
        )
        .join("")}
    </div>`;
}

function renderAuthorBioCard(items: ChunkItem[]) {
  const author = items[0] ?? { title: "Author", body: "", image: "", link: "" };
  return `<article style="display:grid;grid-template-columns:90px minmax(0,1fr);gap:10px;border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:10px;background:#fff;">
      <img src="${escapeAttribute(safeUrl(author.image))}" alt="${escapeAttribute(author.title)}" style="width:90px;height:90px;border-radius:999px;object-fit:cover;" />
      <div><strong>${escapeHtml(author.title)}</strong><p style="margin:6px 0;opacity:.88;">${escapeHtml(author.body)}</p><a href="${escapeAttribute(safeUrl(author.link))}" style="font-size:13px;">View profile</a></div>
    </article>`;
}

function renderFaqAccordionDetails(items: ChunkItem[]) {
  return `<div class="vi-faq">
      ${items
        .slice(0, 8)
        .map(
          (item, index) => `<details ${index === 0 ? "open" : ""} style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;background:#fff;"><summary>${escapeHtml(item.title)}</summary><p style="margin:8px 0 0 0;">${escapeHtml(item.body)}</p></details>`,
        )
        .join("")}
    </div>`;
}

function renderRevealSpoiler(items: ChunkItem[]) {
  const spoiler = items[0] ?? { title: "Reveal", body: "" };
  return `<details style="border:1px dashed rgba(0,0,0,.22);border-radius:10px;padding:8px;background:#fff;">
      <summary style="font-weight:600;">${escapeHtml(spoiler.title || "Show spoiler")}</summary>
      <p style="margin:8px 0 0 0;">${escapeHtml(spoiler.body)}</p>
    </details>`;
}

function renderExpandableDetailsStack(items: ChunkItem[]) {
  return `<div style="display:grid;gap:8px;">
      ${items
        .slice(0, 8)
        .map(
          (item) => `<details style="border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:8px;background:#fff;"><summary><strong>${escapeHtml(item.title)}</strong></summary><div style="margin-top:8px;opacity:.88;">${escapeHtml(item.body)}</div></details>`,
        )
        .join("")}
    </div>`;
}

function renderAnchorJumpMenu(items: ChunkItem[]) {
  return `<nav style="display:flex;flex-wrap:wrap;gap:6px;">
      ${items
        .slice(0, 8)
        .map(
          (item, index) => `<a href="#section-${index + 1}" style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:4px 10px;text-decoration:none;color:inherit;background:#fff;">${escapeHtml(item.title)}</a>`,
        )
        .join("")}
    </nav>`;
}

function renderDualChoiceCards(items: ChunkItem[]) {
  return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
      ${items
        .slice(0, 2)
        .map(
          (item) => `<article style="border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:10px;background:#fff;"><strong>${escapeHtml(item.title)}</strong><p style="margin:6px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p><a href="${escapeAttribute(safeUrl(item.link))}" style="font-size:13px;">Choose</a></article>`,
        )
        .join("")}
    </div>`;
}

function renderTrueFalseCards(items: ChunkItem[]) {
  return `<div style="display:grid;gap:8px;">
      ${items
        .slice(0, 2)
        .map(
          (item, index) => `<article style="display:flex;align-items:flex-start;gap:8px;border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;background:#fff;"><span style="display:inline-flex;min-width:44px;justify-content:center;border-radius:999px;padding:2px 8px;background:${index === 0 ? "rgba(20,130,93,.16)" : "rgba(194,79,63,.16)"};">${index === 0 ? "True" : "False"}</span><div><strong>${escapeHtml(item.title)}</strong><p style="margin:4px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p></div></article>`,
        )
        .join("")}
    </div>`;
}

function renderFilterableCardGrid(items: ChunkItem[]) {
  const tags = Array.from(new Set(items.slice(0, 6).map((item) => item.tag || item.title))).slice(0, 4);
  return `<div class="vi-filter" data-vi-component="filter">
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
        ${tags
          .map(
            (tag) => `<button type="button" data-vi-filter-key="${escapeAttribute(tag)}" style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:4px 10px;background:#fff;">${escapeHtml(tag)}</button>`,
          )
          .join("")}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
        ${items
          .slice(0, 8)
          .map(
            (item) => `<article data-vi-filter-item="${escapeAttribute(item.tag || item.title)}" style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;background:#fff;">
                <strong>${escapeHtml(item.title)}</strong>
                <p style="margin:4px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p>
              </article>`,
          )
          .join("")}
      </div>
    </div>`;
}

function renderSortToggleGrid(items: ChunkItem[]) {
  return `<div class="vi-filter" data-vi-component="sort">
      <div class="vi-filter-controls" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
        <button type="button" data-vi-sort-desc style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:4px 10px;background:#fff;">Highest first</button>
        <button type="button" data-vi-sort-asc style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:4px 10px;background:#fff;">Lowest first</button>
      </div>
      <ol class="vi-card-grid" style="margin:0;padding-left:18px;display:grid;gap:6px;">
        ${items
          .slice(0, 8)
          .map((item) => {
            const numericValue = Number.parseFloat(item.value.replace(/[^0-9.-]/g, ""));
            const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
            return `<li data-vi-filter-item="${escapeAttribute(item.tag || item.title)}" data-vi-sort-value="${escapeAttribute(String(safeValue))}"><strong>${escapeHtml(item.title)}</strong> <small style="opacity:.8;">${escapeHtml(item.value)}</small></li>`;
          })
          .join("")}
      </ol>
    </div>`;
}

function renderTagSelectorBoard(items: ChunkItem[]) {
  return `<div class="vi-filter" data-vi-component="filter">
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
        ${items
          .slice(0, 8)
          .map(
            (item) => `<button type="button" data-vi-filter-key="${escapeAttribute(item.tag || item.title)}" style="border:1px solid rgba(0,0,0,.15);border-radius:10px;padding:8px 12px;background:#fff;">
                ${escapeHtml(item.tag || item.title)}
              </button>`,
          )
          .join("")}
      </div>
      <div class="vi-card-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px;">
        ${items
          .slice(0, 8)
          .map(
            (item) => `<article data-vi-filter-item="${escapeAttribute(item.tag || item.title)}" style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:8px;background:#fff;">
                <strong>${escapeHtml(item.title)}</strong>
                <p style="margin:4px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p>
              </article>`,
          )
          .join("")}
      </div>
      <p data-vi-filter-status style="margin:6px 0 0 0;opacity:.86;">Choose tags to refine visible cards.</p>
    </div>`;
}

function renderScenarioBranchCards(items: ChunkItem[]) {
  return `<div style="display:grid;gap:10px;">
      ${items
        .slice(0, 4)
        .map(
          (item, index) => `<article style="border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:10px;background:#fff;">
              <strong>Scenario ${index + 1}: ${escapeHtml(item.title)}</strong>
              <p style="margin:6px 0;">${escapeHtml(item.body)}</p>
              <a href="${escapeAttribute(safeUrl(item.link))}" style="font-size:13px;">Explore branch</a>
            </article>`,
        )
        .join("")}
    </div>`;
}

function renderContactFormLite() {
  return '<form class="vi-form" action="#" method="post"><label>Name<input type="text" placeholder="Jane Doe" /></label><label>Email<input type="email" placeholder="jane@example.com" /></label><label>Message<textarea rows="3" placeholder="How can we help?"></textarea></label><button type="submit">Send</button></form>';
}

function renderSubscribeBox() {
  return '<form class="vi-form vi-form-inline" action="#" method="post"><label>Email<input type="email" placeholder="you@example.com" /></label><button type="submit">Subscribe</button></form>';
}

function renderCopyableReferenceList(items: ChunkItem[]) {
  return `<ol style="margin:0;padding-left:18px;display:grid;gap:6px;">
      ${items
        .slice(0, 8)
        .map(
          (item, index) => `<li><code>${index + 1}. ${escapeHtml(item.title)}</code> <a href="${escapeAttribute(safeUrl(item.link))}" style="font-size:12px;">Open</a></li>`,
        )
        .join("")}
    </ol>`;
}

function renderDeadlineCallout(items: ChunkItem[]) {
  const item = items[0] ?? { title: "Deadline", body: "", value: "" };
  return `<article style="border:1px solid rgba(194,79,63,.35);border-radius:12px;padding:10px;background:linear-gradient(180deg, rgba(194,79,63,.12), rgba(194,79,63,.03));">
      <small style="opacity:.78;">Deadline</small>
      <strong style="display:block;margin-top:4px;">${escapeHtml(item.title)}</strong>
      <p style="margin:4px 0 0 0;opacity:.88;">${escapeHtml(item.body)}</p>
      <div style="margin-top:6px;font-weight:700;color:#c24f3f;">${escapeHtml(item.value || "Soon")}</div>
    </article>`;
}

function renderLayout(layout: ChunkLayout, items: ChunkItem[], data: ChunkData): string {
  switch (layout) {
    case "gallery":
      return `<div class="vi-gallery">${items
        .map(
          (item) => `<figure><img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" /><figcaption><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.body)}</span></figcaption></figure>`,
        )
        .join("")}</div>`;

    case "hero": {
      const hero = items[0] ?? { title: "Hero", body: "", image: "", link: "" };
      return `<a class="vi-hero" href="${escapeAttribute(safeUrl(hero.link))}"><img src="${escapeAttribute(safeUrl(hero.image))}" alt="${escapeAttribute(hero.title)}" /><span class="vi-hero-copy"><strong>${escapeHtml(hero.title)}</strong><small>${escapeHtml(hero.body)}</small></span></a>`;
    }

    case "timeline":
    case "expandable-timeline":
    case "route":
    case "route-stepper":
    case "roadmap":
      return `<ol class="vi-timeline" ${layout === "route-stepper" ? 'data-vi-component="stepper"' : ""}>${items
        .map(
          (item, index) => `<li data-vi-step="${index}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p><small>${escapeHtml(item.tag)}</small></li>`,
        )
        .join("")}</ol>${
        layout === "route-stepper"
          ? '<div class="vi-stepper-actions"><button type="button" data-vi-stepper-prev>Previous</button><button type="button" data-vi-stepper-next>Next</button></div>'
          : ""
      }`;

    case "cards":
    case "takeaways":
    case "map":
    case "observation":
    case "resource":
    case "social-proof":
    case "testimonials":
    case "pricing":
    case "donation":
    case "scenario":
      return `<div class="vi-card-grid">${renderCardItems(items)}</div>`;

    case "divider":
      return `<div class="vi-divider">${escapeHtml((items[0] ?? { body: "" }).body || "Section transition")}</div>`;

    case "quotes":
      return `<div class="vi-quote-strip">${items
        .map((item) => `<blockquote><p>${escapeHtml(item.body)}</p><cite>${escapeHtml(item.title)}</cite></blockquote>`)
        .join("")}</div>`;

    case "metrics":
    case "counters":
      return `<div class="vi-metric-grid" ${layout === "counters" ? 'data-vi-component="counters"' : ""}>${items
        .map(
          (item) => `<article><strong data-vi-counter-value="${escapeAttribute(item.value)}">${escapeHtml(item.value)}</strong><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.body)}</small></article>`,
        )
        .join("")}</div>`;

    case "pros-cons":
      return `<div class="vi-split-grid">${items
        .slice(0, 2)
        .map((item, index) => `<article class="${index === 0 ? "vi-pro" : "vi-con"}"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.body)}</p></article>`)
        .join("")}</div>`;

    case "compare-table":
    case "matrix":
      return `<table class="vi-compare"><thead><tr><th>Item</th><th>Detail</th><th>Value</th></tr></thead><tbody>${items
        .map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.body)}</td><td>${escapeHtml(item.value)}</td></tr>`)
        .join("")}</tbody></table>`;

    case "checklist":
      return `<ul class="vi-checklist">${items
        .map((item) => `<li><input type="checkbox" ${item.done ? "checked" : ""} /><span>${escapeHtml(item.title)}</span></li>`)
        .join("")}</ul>`;

    case "weather":
      return `<div class="vi-weather-cards">${items
        .slice(0, 3)
        .map((item) => `<article><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p><small>${escapeHtml(item.value)}°</small></article>`)
        .join("")}</div>`;

    case "cta":
      return `<a class="vi-cta" href="${escapeAttribute(safeUrl((items[0] ?? { link: "" }).link))}"><span>${escapeHtml((items[0] ?? { title: "Act now" }).title)}</span><small>${escapeHtml((items[0] ?? { body: "" }).body)}</small></a>`;

    case "links":
      return `<div class="vi-link-grid">${items
        .map((item) => `<a href="${escapeAttribute(safeUrl(item.link))}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.body)}</span></a>`)
        .join("")}</div>`;

    case "bio":
      return `<article class="vi-bio"><img src="${escapeAttribute(safeUrl((items[0] ?? { image: "" }).image))}" alt="${escapeAttribute((items[0] ?? { title: "Author" }).title)}" /><div><h4>${escapeHtml((items[0] ?? { title: "Author" }).title)}</h4><p>${escapeHtml((items[0] ?? { body: "" }).body)}</p><a href="${escapeAttribute(safeUrl((items[0] ?? { link: "" }).link))}">Profile</a></div></article>`;

    case "faq":
    case "reveal":
    case "footnotes":
      return `<div class="vi-faq">${items
        .map(
          (item, index) => `<details ${index === 0 ? "open" : ""}><summary>${escapeHtml(item.title)}</summary><p>${escapeHtml(item.body)}</p></details>`,
        )
        .join("")}</div>`;

    case "anchor-nav":
      return `<nav class="vi-anchor-nav">${items
        .map((item, index) => `<a href="#section-${index + 1}">${escapeHtml(item.title)}</a>`)
        .join("")}</nav>`;

    case "tabs": {
      const tabButtons = items
        .map(
          (item, index) => `<button type="button" data-vi-tab="${index}" aria-selected="${index === 0 ? "true" : "false"}">${escapeHtml(item.title)}</button>`,
        )
        .join("");
      const tabPanels = items
        .map(
          (item, index) => `<article data-vi-panel="${index}" ${index === 0 ? "" : "hidden"}><p>${escapeHtml(item.body)}</p></article>`,
        )
        .join("");
      return `<div class="vi-tabs" data-vi-component="tabs"><div class="vi-tabs-list">${tabButtons}</div><div class="vi-tabs-panels">${tabPanels}</div></div>`;
    }

    case "stepper":
      return `<div class="vi-stepper" data-vi-component="stepper"><ol>${items
        .map(
          (item, index) => `<li data-vi-step="${index}" ${index === 0 ? "" : "hidden"}><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p></li>`,
        )
        .join("")}</ol><div class="vi-stepper-actions"><button type="button" data-vi-stepper-prev>Previous</button><button type="button" data-vi-stepper-next>Next</button></div></div>`;

    case "sticky-progress":
      return `<div class="vi-sticky-progress" data-vi-component="sticky-progress"><div class="vi-progress-track"><span data-vi-progress-fill style="width: 0%"></span></div><ul>${items
        .map((item) => `<li>${escapeHtml(item.title)}</li>`)
        .join("")}</ul></div>`;

    case "dismissible":
      return `<div class="vi-dismissible" data-vi-component="dismissible"><p>${escapeHtml((items[0] ?? { body: "Announcement" }).body)}</p><button type="button" data-vi-dismiss>Dismiss</button></div>`;

    case "choice":
      return `<div class="vi-choice-grid">${items
        .slice(0, 2)
        .map((item) => `<article><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p></article>`)
        .join("")}</div>`;

    case "poll":
      return `<div class="vi-poll" data-vi-component="poll"><p>${escapeHtml((items[0] ?? { body: "Choose one" }).body)}</p><div>${items
        .slice(0, 4)
        .map((item, index) => `<button type="button" data-vi-poll-option="${index}">${escapeHtml(item.title)}</button>`)
        .join("")}</div><small data-vi-poll-status>Pick one option.</small></div>`;

    case "quiz":
      return `<div class="vi-quiz" data-vi-component="quiz"><p>${escapeHtml((items[0] ?? { body: "Answer the question" }).body)}</p>${items
        .slice(0, 4)
        .map(
          (item, index) => `<button type="button" data-vi-quiz-option="${index}" data-vi-correct="${index === 0 ? "true" : "false"}">${escapeHtml(item.title)}</button>`,
        )
        .join("")}<small data-vi-quiz-status>Choose an option.</small></div>`;

    case "filter":
    case "sort":
    case "tag-selector":
      return `<div class="vi-filter" data-vi-component="${layout === "sort" ? "sort" : "filter"}"><div class="vi-filter-controls">${items
        .slice(0, 3)
        .map((item) => `<button type="button" data-vi-filter-key="${escapeAttribute(item.tag || item.title)}">${escapeHtml(item.tag || item.title)}</button>`)
        .join("")}</div><div class="vi-card-grid">${items
        .map(
          (item) => `<article data-vi-filter-item="${escapeAttribute(item.tag || item.title)}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p></article>`,
        )
        .join("")}</div></div>`;

    case "contact":
      return '<form class="vi-form" action="#" method="post"><label>Name<input type="text" placeholder="Jane Doe" /></label><label>Email<input type="email" placeholder="jane@example.com" /></label><label>Message<textarea rows="3" placeholder="How can we help?"></textarea></label><button type="submit">Send</button></form>';

    case "subscribe":
      return '<form class="vi-form vi-form-inline" action="#" method="post"><label>Email<input type="email" placeholder="you@example.com" /></label><button type="submit">Subscribe</button></form>';

    case "references":
      return `<ol class="vi-reference-list">${items
        .map((item) => `<li><code>${escapeHtml(item.title)}</code><a href="${escapeAttribute(safeUrl(item.link))}">Source</a></li>`)
        .join("")}</ol>`;

    case "deadline":
      return `<div class="vi-deadline"><strong>${escapeHtml((items[0] ?? { title: "Deadline" }).title)}</strong><p>${escapeHtml((items[0] ?? { body: "" }).body)}</p></div>`;

    case "countdown":
      return `<div class="vi-countdown" data-vi-component="countdown" data-vi-deadline="${escapeAttribute(readString(data, "deadline", "2030-01-01T00:00:00Z"))}"><strong data-vi-countdown-value>--:--:--</strong><button type="button">${escapeHtml(readString(data, "buttonLabel", "Join now"))}</button></div>`;

    case "copy":
      return `<div class="vi-copy" data-vi-component="copy"><pre><code data-vi-copy-source>${escapeHtml(readString(data, "snippet", "npm run build"))}</code></pre><button type="button" data-vi-copy-target="inline">Copy</button><small data-vi-copy-status>Ready to copy.</small></div>`;

    case "share":
      return `<div class="vi-share" data-vi-component="share"><input type="url" value="${escapeAttribute(readString(data, "shareUrl", "https://example.com/story"))}" data-vi-share-input /><button type="button" data-vi-share-copy>${escapeHtml(readString(data, "shareLabel", "Share"))}</button><small data-vi-share-status>Copy the link to share.</small></div>`;

    case "modal":
      return `<div class="vi-modal" data-vi-component="modal"><button type="button" data-vi-modal-open>${escapeHtml(readString(data, "buttonLabel", "Open info"))}</button><div class="vi-modal-sheet" hidden data-vi-modal-sheet><article><p>${escapeHtml(readString(data, "modalBody", "Additional details."))}</p><button type="button" data-vi-modal-close>Close</button></article></div></div>`;

    case "slider": {
      const first = items[0] ?? { title: "Before", image: "" };
      const second = items[1] ?? { title: "After", image: "" };
      return `<div class="vi-slider" data-vi-component="before-after"><div class="vi-slider-images"><img src="${escapeAttribute(safeUrl(first.image))}" alt="${escapeAttribute(first.title)}" /><img src="${escapeAttribute(safeUrl(second.image))}" alt="${escapeAttribute(second.title)}" data-vi-slider-after /></div><input type="range" min="0" max="100" value="50" data-vi-slider-range /></div>`;
    }

    case "lightbox":
      return `<div class="vi-gallery vi-lightbox" data-vi-component="lightbox">${items
        .map(
          (item) => `<button type="button" data-vi-lightbox-src="${escapeAttribute(safeUrl(item.image))}"><img src="${escapeAttribute(safeUrl(item.image))}" alt="${escapeAttribute(item.title)}" /><span>${escapeHtml(item.title)}</span></button>`,
        )
        .join("")}<div class="vi-lightbox-overlay" hidden data-vi-lightbox-overlay><button type="button" data-vi-lightbox-close>Close</button><img src="" alt="Expanded media" data-vi-lightbox-image /></div></div>`;

    case "hotspot":
      return `<div class="vi-hotspot" data-vi-component="hotspot"><img src="${escapeAttribute(safeUrl((items[0] ?? { image: "" }).image))}" alt="Hotspot map" /><div class="vi-hotspot-list">${items
        .map(
          (item, index) => `<button type="button" data-vi-hotspot="${index}">${escapeHtml(item.title)}</button>`,
        )
        .join("")}</div><p data-vi-hotspot-copy>${escapeHtml((items[0] ?? { body: "" }).body)}</p></div>`;

    default:
      return `<div class="vi-card-grid">${renderCardItems(items)}</div>`;
  }
}

function renderCardItems(items: ChunkItem[]) {
  return items
    .map(
      (item, index) => `<article class="${index === 0 ? "is-highlight" : ""}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p>${
        item.link ? `<a href="${escapeAttribute(safeUrl(item.link))}">Open</a>` : ""
      }</article>`,
    )
    .join("");
}

type ChunkItem = {
  title: string;
  body: string;
  link: string;
  image: string;
  tag: string;
  value: string;
  done: boolean;
};

const INLINE_ACCENT_STYLE_REPLACEMENTS: Array<[string, string]> = [
  ["var(--vi-accent, #2f6cf6)", "var(--vi-accent, #f26d3d)"],
  ["color:#2f6cf6", "color:var(--vi-accent, #f26d3d)"],
  ["rgba(47,108,246,.5)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 50%, transparent)"],
  ["rgba(47,108,246,.45)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 45%, transparent)"],
  ["rgba(47,108,246,.3)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 30%, transparent)"],
  ["rgba(47,108,246,.28)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 28%, transparent)"],
  ["rgba(47,108,246,.16)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 16%, transparent)"],
  ["rgba(47,108,246,.12)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 12%, transparent)"],
  ["rgba(47,108,246,.1)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 10%, transparent)"],
  ["rgba(47,108,246,.08)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 8%, transparent)"],
  ["rgba(47,108,246,.03)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 3%, transparent)"],
  ["rgba(47,108,246,.02)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 2%, transparent)"],
  ["rgba(242,109,61,.6)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 60%, transparent)"],
  ["rgba(242,109,61,.35)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 35%, transparent)"],
  ["rgba(242,109,61,.12)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 12%, transparent)"],
  ["rgba(242,109,61,.1)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 10%, transparent)"],
  ["rgba(242,109,61,.02)", "color-mix(in srgb, var(--vi-accent, #f26d3d) 2%, transparent)"],
  ["#14825d", "var(--vi-positive, #14825d)"],
  ["rgba(20,130,93,.28)", "color-mix(in srgb, var(--vi-positive, #14825d) 28%, transparent)"],
  ["rgba(20,130,93,.16)", "color-mix(in srgb, var(--vi-positive, #14825d) 16%, transparent)"],
  ["rgba(20,130,93,.08)", "color-mix(in srgb, var(--vi-positive, #14825d) 8%, transparent)"],
  ["rgba(20,130,93,.05)", "color-mix(in srgb, var(--vi-positive, #14825d) 5%, transparent)"],
  ["rgba(20,130,93,.02)", "color-mix(in srgb, var(--vi-positive, #14825d) 2%, transparent)"],
  ["#c24f3f", "var(--vi-negative, #c24f3f)"],
  ["rgba(194,79,63,.35)", "color-mix(in srgb, var(--vi-negative, #c24f3f) 35%, transparent)"],
  ["rgba(194,79,63,.16)", "color-mix(in srgb, var(--vi-negative, #c24f3f) 16%, transparent)"],
  ["rgba(194,79,63,.12)", "color-mix(in srgb, var(--vi-negative, #c24f3f) 12%, transparent)"],
  ["rgba(194,79,63,.03)", "color-mix(in srgb, var(--vi-negative, #c24f3f) 3%, transparent)"],
];

function normalizeVariantInlineAccentStyles(markup: string) {
  return markup.replace(/style="([^"]*)"/g, (_match, styleValue: string) => {
    const normalized = INLINE_ACCENT_STYLE_REPLACEMENTS.reduce(
      (accumulator, [from, to]) => accumulator.replaceAll(from, to),
      styleValue,
    );
    return `style="${normalized}"`;
  });
}

function injectJavaScriptSelectableMarkers(markup: string) {
  return markup.replace(
    /<(article|figure|blockquote|li|details)(\s|>)/g,
    (_match, tagName: string, suffix: string) => `<${tagName} data-vi-selectable-item="true"${suffix}`,
  );
}

function normalizeCarouselArrowColor(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "#1e88e5" || normalized === "#2f6cf6") {
    return "var(--vi-accent, #f26d3d)";
  }
  return value;
}

function readItems(data: ChunkData): ChunkItem[] {
  const candidate = data.items;
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return [
      {
        title: "Item",
        body: "Edit this content from the interaction panel.",
        link: "https://example.com",
        image: "https://picsum.photos/seed/vi-default/1000/700",
        tag: "Primary",
        value: "12",
        done: false,
      },
    ];
  }

  return candidate
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const source = entry as Record<string, unknown>;
      return {
        title: readString(source, "title", "Item"),
        body: readString(source, "body", ""),
        link: readString(source, "link", "https://example.com"),
        image: readString(source, "image", "https://picsum.photos/seed/vi-default/1000/700"),
        tag: readString(source, "tag", "Primary"),
        value: readString(source, "value", "12"),
        done: readBoolean(source, "done", readString(source, "tag", "Primary").toLowerCase() === "primary"),
      };
    })
    .filter((entry): entry is ChunkItem => entry !== null);
}

function readString(source: Record<string, unknown>, key: string, fallback: string): string {
  const raw = source[key];
  if (typeof raw === "string") {
    return raw;
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }

  return fallback;
}

function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const raw = source[key];
  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }

  if (typeof raw === "number") {
    return raw !== 0;
  }

  return fallback;
}

function readNumber(source: Record<string, unknown>, key: string, fallback: number, min?: number, max?: number): number {
  const raw = source[key];
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim().length > 0
        ? Number.parseFloat(raw)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampNumber(parsed, min, max);
}

function readOneOf<T extends string>(
  source: Record<string, unknown>,
  key: string,
  options: readonly T[],
  fallback: T,
): T {
  const value = String(source[key] ?? "").trim().toLowerCase();
  return options.find((option) => option === value) ?? fallback;
}

function readColor(source: Record<string, unknown>, key: string, fallback: string) {
  const value = readString(source, key, fallback);
  return sanitizeCssColor(value, fallback);
}

function sanitizeCssColor(value: string, fallback: string) {
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) {
    return normalized;
  }

  if (/^rgba?\(\s*[-\d.%\s,]+\)$/i.test(normalized)) {
    return normalized;
  }

  if (/^hsla?\(\s*[-\d.%\s,]+\)$/i.test(normalized)) {
    return normalized;
  }

  if (/^[a-z]{3,24}$/i.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function sanitizeIconLabel(value: string, fallback: string) {
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  const safe = normalized.replace(/[<>\n\r\t]/g, "").slice(0, 8);
  return safe || fallback;
}

function clampNumber(value: number, min?: number, max?: number) {
  let next = value;
  if (typeof min === "number") {
    next = Math.max(min, next);
  }
  if (typeof max === "number") {
    next = Math.min(max, next);
  }
  return next;
}

function readAccent(data: ChunkData) {
  const value = String(data.accent ?? "ember").toLowerCase();
  if (value === "tide" || value === "moss" || value === "ember" || value === "rose" || value === "gold" || value === "slate") {
    return value;
  }

  return "ember";
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "#";
  }

  if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
