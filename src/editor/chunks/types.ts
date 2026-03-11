export type ChunkRestriction = "strict" | "enhanced";
export type ChunkMode = "structured" | "raw";
export type ChunkTemplateEngine = "html" | "javascript";

export type StrictAllowlistSupport = "works" | "degrades" | "blocked";
export type EnhancedRuntimeSupport = "none" | "optional" | "required";

export type ChunkCategory =
  | "Visual Storytelling"
  | "Narrative Flow"
  | "Data & Comparison"
  | "Field & Location"
  | "Conversion & Credibility"
  | "Disclosure & Navigation"
  | "Selection & Choice"
  | "Utility Microtools";

export type ChunkTextField = {
  type: "text";
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
};

export type ChunkTextareaField = {
  type: "textarea";
  key: string;
  label: string;
  placeholder?: string;
  rows?: number;
  helpText?: string;
};

export type ChunkUrlField = {
  type: "url";
  key: string;
  label: string;
  placeholder?: string;
  helpText?: string;
};

export type ChunkToggleField = {
  type: "toggle";
  key: string;
  label: string;
  helpText?: string;
};

export type ChunkSelectField = {
  type: "select";
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  helpText?: string;
};

export type ChunkNumberField = {
  type: "number";
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
  helpText?: string;
};

export type ChunkColorField = {
  type: "color";
  key: string;
  label: string;
  placeholder?: string;
  helpText?: string;
};

export type ChunkIconField = {
  type: "icon";
  key: string;
  label: string;
  placeholder?: string;
  presets?: string[];
  helpText?: string;
};

export type ChunkRepeaterItemField =
  | ChunkTextField
  | ChunkTextareaField
  | ChunkUrlField
  | ChunkToggleField
  | ChunkSelectField
  | ChunkNumberField
  | ChunkColorField
  | ChunkIconField;

export type ChunkRepeaterField = {
  type: "repeater";
  key: string;
  label: string;
  minItems?: number;
  maxItems?: number;
  itemLabel: string;
  itemFields: ChunkRepeaterItemField[];
  helpText?: string;
};

export type ChunkField =
  | ChunkTextField
  | ChunkTextareaField
  | ChunkUrlField
  | ChunkToggleField
  | ChunkSelectField
  | ChunkNumberField
  | ChunkColorField
  | ChunkIconField
  | ChunkRepeaterField;

export type ChunkCompatibility = {
  strictAllowlist: StrictAllowlistSupport;
  enhancedRuntime: EnhancedRuntimeSupport;
};

export type ChunkDidacticCopy = {
  whenToUse: string;
  whyHtml: string;
  whyJavaScript: string;
  constraints: string;
};

export type ChunkData = Record<string, unknown>;

export type ChunkTemplate = {
  id: string;
  engine: ChunkTemplateEngine;
  conceptId: string;
  variantLabel: "HTML" | "JavaScript";
  layoutContract: string;
  label: string;
  description: string;
  category: ChunkCategory;
  restriction: ChunkRestriction;
  capabilityTags: string[];
  didactic: ChunkDidacticCopy;
  fields: ChunkField[];
  defaultData: ChunkData;
  compatibility: ChunkCompatibility;
  keywords: string[];
  render: (data: ChunkData) => string;
};

export type ChunkTemplateConcept = {
  id: string;
  label: string;
  category: ChunkCategory;
  tags: string[];
  didactic: ChunkDidacticCopy;
  templateIds: Partial<Record<ChunkTemplateEngine, string>>;
  defaultEngine: ChunkTemplateEngine;
};

export type InteractiveChunkAttrs = {
  templateId: string;
  mode: ChunkMode;
  dataJson: string;
  rawHtml: string;
  version: number;
  restriction: ChunkRestriction;
};

export type RawChunkValidationIssue = {
  level: "warning" | "error";
  code: string;
  message: string;
};

export type RawChunkValidationReport = {
  strictAllowlist: StrictAllowlistSupport;
  enhancedRuntime: EnhancedRuntimeSupport;
  issues: RawChunkValidationIssue[];
};

export type RawChunkSanitizeResult = {
  html: string;
  report: RawChunkValidationReport;
};
