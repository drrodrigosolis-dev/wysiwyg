import type {
  EnhancedRuntimeSupport,
  RawChunkSanitizeResult,
  RawChunkValidationIssue,
  RawChunkValidationReport,
  StrictAllowlistSupport,
} from "./types";

const BLOCKED_TAGS = new Set(["script", "iframe", "object", "embed", "applet", "frame", "frameset"]);

const STRICT_ALLOWED_TAGS = new Set([
  "a",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "button",
  "caption",
  "code",
  "details",
  "div",
  "em",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "input",
  "label",
  "li",
  "main",
  "mark",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "small",
  "span",
  "strong",
  "summary",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const GLOBAL_ALLOWED_ATTRIBUTES = new Set([
  "class",
  "id",
  "role",
  "title",
  "style",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-selected",
  "aria-expanded",
  "aria-hidden",
  "aria-controls",
  "hidden",
  "data-vi-template",
  "data-vi-runtime",
  "data-vi-engine",
  "data-vi-interaction-preset",
  "data-vi-gesture-mode",
  "data-vi-runtime-update-ms",
  "data-vi-defer-hydration",
  "data-vi-persist-state",
  "data-vi-announce-state",
  "data-vi-state-memory",
  "data-vi-status-verbosity",
  "data-vi-keyboard-shortcuts",
  "data-vi-navigation-wrap",
  "data-vi-hover-activation",
  "data-vi-auto-advance-ms",
  "data-vi-motion-profile",
  "data-vi-highlight-intensity",
  "data-vi-transition-ms",
  "data-vi-selection-behavior",
  "data-vi-details-mode",
  "data-vi-show-status",
  "data-vi-status-on-load",
  "data-vi-stagger-ms",
  "data-vi-layout",
  "data-vi-component",
  "data-vi-selectable-item",
  "data-vi-runtime-status",
  "data-vi-tab",
  "data-vi-panel",
  "data-vi-step",
  "data-vi-stepper-next",
  "data-vi-stepper-prev",
  "data-vi-dismiss",
  "data-vi-filter-key",
  "data-vi-filter-item",
  "data-vi-poll-option",
  "data-vi-poll-status",
  "data-vi-quiz-option",
  "data-vi-quiz-status",
  "data-vi-correct",
  "data-vi-deadline",
  "data-vi-copy-target",
  "data-vi-copy-source",
  "data-vi-copy-status",
  "data-vi-filter-status",
  "data-vi-share-input",
  "data-vi-share-copy",
  "data-vi-share-status",
  "data-vi-modal-open",
  "data-vi-modal-close",
  "data-vi-modal-sheet",
  "data-vi-lightbox-src",
  "data-vi-lightbox-close",
  "data-vi-lightbox-overlay",
  "data-vi-lightbox-image",
  "data-vi-slider-range",
  "data-vi-slider-after",
  "data-vi-counter-value",
  "data-vi-progress-fill",
  "data-vi-hotspot",
  "data-vi-hotspot-copy",
  "data-vi-footnote",
  "data-vi-footnote-popover",
  "data-vi-footnote-target",
  "data-vi-sort-asc",
  "data-vi-sort-desc",
  "data-vi-sort-value",
  "data-vi-carousel-track",
  "data-vi-carousel-prev",
  "data-vi-carousel-next",
  "data-interactive-chunk",
  "data-template-id",
  "data-mode",
  "data-data-json",
  "data-raw-html",
  "data-version",
  "data-restriction",
]);

const TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading", "decoding"]),
  input: new Set(["type", "value", "name", "placeholder", "checked", "disabled", "min", "max", "step"]),
  textarea: new Set(["name", "placeholder", "rows", "cols", "disabled"]),
  button: new Set(["type", "name", "value", "disabled"]),
  form: new Set(["action", "method"]),
  table: new Set(["summary"]),
};

const URL_ATTRIBUTES = new Set(["href", "src", "action"]);

export function validateRawChunkHtml(html: string): RawChunkValidationReport {
  if (typeof document === "undefined") {
    return {
      strictAllowlist: "degrades",
      enhancedRuntime: "optional",
      issues: [
        {
          level: "warning",
          code: "no-dom",
          message: "Could not validate in this runtime because DOMParser is unavailable.",
        },
      ],
    };
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html || "", "text/html");
  const issues: RawChunkValidationIssue[] = [];
  let sawDegradePattern = false;
  let runtime: EnhancedRuntimeSupport = "none";

  const elements = Array.from(parsed.body.querySelectorAll("*"));

  elements.forEach((element) => {
    const tag = element.tagName.toLowerCase();

    if (BLOCKED_TAGS.has(tag)) {
      issues.push({
        level: "error",
        code: "blocked-tag",
        message: `Blocked tag <${tag}> is not allowed.`,
      });
      return;
    }

    if (!STRICT_ALLOWED_TAGS.has(tag)) {
      sawDegradePattern = true;
      issues.push({
        level: "warning",
        code: "non-allowlisted-tag",
        message: `Tag <${tag}> is outside the strict allowlist and may be removed.`,
      });
    }

    const runtimeMarker = String(element.getAttribute("data-vi-runtime") ?? "").toLowerCase();
    const componentMarker = String(element.getAttribute("data-vi-component") ?? "").toLowerCase();

    if (runtimeMarker === "required") {
      runtime = "required";
    } else if (runtime !== "required" && (runtimeMarker === "optional" || componentMarker.length > 0)) {
      runtime = "optional";
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) {
        issues.push({
          level: "error",
          code: "inline-handler",
          message: `Inline event handler "${name}" is not allowed.`,
        });
        return;
      }

      if (!isAttributeAllowed(tag, name)) {
        sawDegradePattern = true;
        issues.push({
          level: "warning",
          code: "non-allowlisted-attr",
          message: `Attribute "${name}" on <${tag}> is outside the strict allowlist.`,
        });
        return;
      }

      if (URL_ATTRIBUTES.has(name) && !isSafeUrl(value)) {
        issues.push({
          level: "error",
          code: "unsafe-url",
          message: `Unsafe URL detected in ${name}.`,
        });
        return;
      }

      if (name === "style" && hasUnsafeStyle(value)) {
        issues.push({
          level: "error",
          code: "unsafe-style",
          message: "Unsafe CSS expression detected in style attribute.",
        });
      }
    });
  });

  const hasErrors = issues.some((issue) => issue.level === "error");
  const strictAllowlist: StrictAllowlistSupport = hasErrors ? "blocked" : sawDegradePattern ? "degrades" : "works";

  return {
    strictAllowlist,
    enhancedRuntime: runtime,
    issues,
  };
}

export function sanitizeRawChunkHtml(html: string): RawChunkSanitizeResult {
  const originalReport = validateRawChunkHtml(html);

  if (typeof document === "undefined") {
    return {
      html,
      report: originalReport,
    };
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html || "", "text/html");
  const cleanDocument = document.implementation.createHTMLDocument("");
  const root = cleanDocument.createElement("div");

  Array.from(parsed.body.childNodes).forEach((node) => {
    const cleaned = sanitizeNode(node, cleanDocument);
    if (cleaned) {
      root.append(cleaned);
    }
  });

  return {
    html: root.innerHTML,
    report: originalReport,
  };
}

function sanitizeNode(node: Node, targetDocument: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return targetDocument.createTextNode(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return null;
  }

  const tag = node.tagName.toLowerCase();
  if (BLOCKED_TAGS.has(tag)) {
    return null;
  }

  if (!STRICT_ALLOWED_TAGS.has(tag)) {
    const fragment = targetDocument.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      const cleanedChild = sanitizeNode(child, targetDocument);
      if (cleanedChild) {
        fragment.append(cleanedChild);
      }
    });
    return fragment;
  }

  const element = targetDocument.createElement(tag);
  Array.from(node.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;

    if (name.startsWith("on")) {
      return;
    }

    if (!isAttributeAllowed(tag, name)) {
      return;
    }

    if (URL_ATTRIBUTES.has(name) && !isSafeUrl(value)) {
      return;
    }

    if (name === "style") {
      const safeStyle = sanitizeStyle(value);
      if (!safeStyle) {
        return;
      }
      element.setAttribute(name, safeStyle);
      return;
    }

    element.setAttribute(name, value);
  });

  Array.from(node.childNodes).forEach((child) => {
    const cleaned = sanitizeNode(child, targetDocument);
    if (cleaned) {
      element.append(cleaned);
    }
  });

  return element;
}

function isAttributeAllowed(tag: string, attribute: string) {
  if (GLOBAL_ALLOWED_ATTRIBUTES.has(attribute)) {
    return true;
  }

  return TAG_ALLOWED_ATTRIBUTES[tag]?.has(attribute) ?? false;
}

function isSafeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith("#")) {
    return true;
  }

  return /^(https?:|mailto:|tel:)/i.test(trimmed);
}

function hasUnsafeStyle(value: string) {
  return /(expression\s*\(|javascript:|behavior\s*:|@import|url\s*\(\s*['"]?javascript:)/i.test(value);
}

function sanitizeStyle(value: string) {
  if (hasUnsafeStyle(value)) {
    return "";
  }

  return value
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => rule.replace(/\s+/g, " "))
    .join("; ");
}
