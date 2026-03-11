import type { JSONContent } from "@tiptap/core";

import {
  INTERACTIVE_CHUNK_VERSION,
  RAW_CHUNK_TEMPLATE_ID,
  createRawChunkAttrs,
  getChunkTemplate,
  parseChunkDataJson,
  renderTemplateById,
} from "./registry";
import { sanitizeRawChunkHtml } from "./validator";
import type {
  ChunkCompatibility,
  ChunkMode,
  ChunkRestriction,
  InteractiveChunkAttrs,
  RawChunkValidationReport,
} from "./types";

export type RenderedChunk = {
  html: string;
  templateLabel: string;
  compatibility: ChunkCompatibility;
  report: RawChunkValidationReport | null;
};

const ENCODED_EMPTY_OBJECT = encodeChunkAttributeValue("{}");

export function encodeChunkAttributeValue(value: string) {
  return encodeURIComponent(value);
}

export function decodeChunkAttributeValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeInteractiveChunkAttrs(attrs: Partial<InteractiveChunkAttrs>): InteractiveChunkAttrs {
  const mode = attrs.mode === "raw" ? "raw" : "structured";
  const restriction = attrs.restriction === "enhanced" ? "enhanced" : "strict";

  return {
    templateId: String(attrs.templateId ?? RAW_CHUNK_TEMPLATE_ID),
    mode,
    dataJson: String(attrs.dataJson ?? "{}"),
    rawHtml: String(attrs.rawHtml ?? ""),
    version: Number.isFinite(Number(attrs.version)) ? Number(attrs.version) : INTERACTIVE_CHUNK_VERSION,
    restriction,
  };
}

export function toDomChunkAttributes(attrs: InteractiveChunkAttrs) {
  return {
    "data-interactive-chunk": "true",
    "data-template-id": attrs.templateId,
    "data-mode": attrs.mode,
    "data-data-json": encodeChunkAttributeValue(attrs.dataJson || "{}"),
    "data-raw-html": encodeChunkAttributeValue(attrs.rawHtml || ""),
    "data-version": String(attrs.version),
    "data-restriction": attrs.restriction,
  };
}

export function fromDomChunkAttributes(element: Element): InteractiveChunkAttrs {
  const modeValue = String(element.getAttribute("data-mode") ?? "structured");
  const restrictionValue = String(element.getAttribute("data-restriction") ?? "strict");

  return normalizeInteractiveChunkAttrs({
    templateId: String(element.getAttribute("data-template-id") ?? RAW_CHUNK_TEMPLATE_ID),
    mode: modeValue === "raw" ? "raw" : "structured",
    dataJson: decodeChunkAttributeValue(element.getAttribute("data-data-json")) || "{}",
    rawHtml: decodeChunkAttributeValue(element.getAttribute("data-raw-html")) || "",
    version: Number(element.getAttribute("data-version") ?? INTERACTIVE_CHUNK_VERSION),
    restriction: restrictionValue === "enhanced" ? "enhanced" : "strict",
  });
}

export function renderInteractiveChunk(attrs: Partial<InteractiveChunkAttrs>): RenderedChunk {
  const normalized = normalizeInteractiveChunkAttrs(attrs);

  if (normalized.mode === "raw") {
    const sanitized = sanitizeRawChunkHtml(normalized.rawHtml);
    const compatibility: ChunkCompatibility = {
      strictAllowlist: sanitized.report.strictAllowlist,
      enhancedRuntime: sanitized.report.enhancedRuntime,
    };

    const issueMarkup =
      sanitized.report.issues.length > 0
        ? `<ul class="vi-raw-issues">${sanitized.report.issues
            .slice(0, 8)
            .map((issue) => `<li class="${issue.level}">${escapeHtml(issue.message)}</li>`)
            .join("")}</ul>`
        : "";

    const content = sanitized.html.trim().length > 0 ? sanitized.html : "<p>Raw HTML block is empty.</p>";
    const html = `<div class="vi-raw-output" data-vi-runtime="${sanitized.report.enhancedRuntime}">${content}${issueMarkup}</div>`;

    return {
      html,
      templateLabel: "Raw HTML Block",
      compatibility,
      report: sanitized.report,
    };
  }

  const template = getChunkTemplate(normalized.templateId);
  if (!template || template.id === RAW_CHUNK_TEMPLATE_ID) {
    return {
      html: "<p>Missing interactive chunk template.</p>",
      templateLabel: "Unknown template",
      compatibility: { strictAllowlist: "degrades", enhancedRuntime: "optional" },
      report: null,
    };
  }

  const data = parseChunkDataJson(normalized.dataJson, template.defaultData);
  const html = renderTemplateById(template.id, data);

  return {
    html,
    templateLabel: template.label,
    compatibility: template.compatibility,
    report: null,
  };
}

export function hydrateInteractiveChunksInHtml(source: string) {
  if (typeof document === "undefined" || source.trim().length === 0) {
    return source;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(source, "text/html");
  const nodes = Array.from(parsed.body.querySelectorAll('div[data-interactive-chunk="true"]'));

  nodes.forEach((node) => {
    const attrs = fromDomChunkAttributes(node);
    const rendered = renderInteractiveChunk(attrs);

    node.setAttribute("data-template-id", attrs.templateId);
    node.setAttribute("data-mode", attrs.mode);
    node.setAttribute("data-data-json", encodeChunkAttributeValue(attrs.dataJson || "{}") || ENCODED_EMPTY_OBJECT);
    node.setAttribute("data-raw-html", encodeChunkAttributeValue(attrs.rawHtml || ""));
    node.setAttribute("data-version", String(attrs.version));
    node.setAttribute("data-restriction", attrs.restriction);
    node.setAttribute("data-interactive-chunk", "true");
    node.innerHTML = `<div data-interactive-chunk-rendered="true">${rendered.html}</div>`;
  });

  return parsed.body.innerHTML;
}

export function contentHasEnhancedInteractiveChunks(content: JSONContent) {
  return walk(content, (node) => {
    if (node.type !== "interactiveChunk") {
      return false;
    }

    const mode = String(node.attrs?.mode ?? "structured");
    if (mode === "raw") {
      const report = sanitizeRawChunkHtml(String(node.attrs?.rawHtml ?? "")).report;
      return report.enhancedRuntime === "required";
    }

    const templateId = String(node.attrs?.templateId ?? "");
    const template = getChunkTemplate(templateId);
    return template?.compatibility.enhancedRuntime === "required";
  });
}

export function contentHasInteractiveChunks(content: JSONContent) {
  return walk(content, (node) => node.type === "interactiveChunk");
}

export function getInteractiveChunkCompatibilityBadgeText(compatibility: ChunkCompatibility) {
  return `Strict: ${compatibility.strictAllowlist} • Runtime: ${compatibility.enhancedRuntime}`;
}

export function getInteractiveChunkExportStyles() {
  return `
      div[data-interactive-chunk="true"] { margin: 1.2rem 0; }
      [data-interactive-chunk-rendered="true"] { display: block; }
      .vi-chunk { border: 1px solid var(--vi-container-border-color, rgba(0,0,0,0.12)); border-radius: var(--vi-container-radius, 16px); padding: var(--vi-container-padding, 0.9rem) !important; background: var(--vi-container-bg, rgba(255,255,255,0.74)); color: var(--vi-chunk-text, inherit); width: var(--vi-container-width, 100%); max-width: var(--vi-container-max-width, 100%); margin-left: var(--vi-container-margin-left, 0); margin-right: var(--vi-container-margin-right, auto); backdrop-filter: blur(var(--vi-container-blur, 0px)); box-shadow: var(--vi-container-shadow, none); --vi-accent-soft: color-mix(in srgb, var(--vi-accent, #f26d3d) 12%, white); --vi-accent-soft-strong: color-mix(in srgb, var(--vi-accent, #f26d3d) 20%, white); --vi-accent-border: color-mix(in srgb, var(--vi-accent, #f26d3d) 34%, transparent); --vi-accent-border-strong: color-mix(in srgb, var(--vi-accent, #f26d3d) 46%, transparent); --vi-positive: color-mix(in srgb, var(--vi-accent, #f26d3d) 34%, #14825d); --vi-positive-soft: color-mix(in srgb, var(--vi-positive, #14825d) 18%, white); --vi-negative: color-mix(in srgb, var(--vi-accent, #f26d3d) 30%, #c24f3f); --vi-negative-soft: color-mix(in srgb, var(--vi-negative, #c24f3f) 16%, white); --vi-warning: color-mix(in srgb, var(--vi-accent, #f26d3d) 58%, #8c6a2e); --vi-runtime-selected-bg: var(--vi-accent-soft); --vi-runtime-selected-border: var(--vi-accent-border-strong); --vi-runtime-selected-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      .vi-chunk[data-vi-highlight-intensity="subtle"] { --vi-runtime-selected-bg: color-mix(in srgb, var(--vi-accent, #f26d3d) 8%, white); --vi-runtime-selected-border: color-mix(in srgb, var(--vi-accent, #f26d3d) 28%, transparent); --vi-runtime-selected-shadow: 0 4px 12px rgba(0,0,0,0.06); }
      .vi-chunk[data-vi-highlight-intensity="strong"] { --vi-runtime-selected-bg: color-mix(in srgb, var(--vi-accent, #f26d3d) 24%, white); --vi-runtime-selected-border: color-mix(in srgb, var(--vi-accent, #f26d3d) 58%, transparent); --vi-runtime-selected-shadow: 0 12px 24px rgba(0,0,0,0.14); }
      .vi-chunk + .vi-chunk { margin-top: 1rem; }
      .vi-chunk-head h3 { margin: 0; font-size: 1.05rem; line-height: 1.3; color: var(--vi-heading-color, inherit); text-align: var(--vi-header-align, left); }
      .vi-chunk-head p { margin: 0.4rem 0 0.7rem; opacity: 0.86; font-size: 0.95rem; color: var(--vi-summary-color, inherit); text-align: var(--vi-header-align, left); }
      .vi-tone-ember { --vi-accent: #f26d3d; }
      .vi-tone-tide { --vi-accent: #2f6cf6; }
      .vi-tone-moss { --vi-accent: #14825d; }
      .vi-tone-rose { --vi-accent: #c94975; }
      .vi-tone-gold { --vi-accent: #ce9123; }
      .vi-tone-slate { --vi-accent: #485e7e; }
      .vi-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--vi-item-gap, 0.65rem); }
      .vi-gallery figure { margin: 0; overflow: hidden; border-radius: var(--vi-media-radius, 12px); border: 1px solid rgba(0,0,0,0.08); }
      .vi-gallery img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
      .vi-gallery figcaption { display: grid; gap: 0.15rem; padding: 0.55rem; font-size: 0.86rem; }
      .vi-hero { position: relative; display: block; border-radius: var(--vi-media-radius, 14px); overflow: hidden; border: 1px solid rgba(0,0,0,0.1); text-decoration: none; color: inherit; }
      .vi-hero img { width: 100%; display: block; aspect-ratio: 16 / 8; object-fit: cover; }
      .vi-hero-copy { position: absolute; left: 0.8rem; bottom: 0.7rem; right: 0.8rem; background: rgba(0,0,0,0.58); color: #fff; padding: 0.6rem 0.7rem; border-radius: var(--vi-media-radius, 10px); display: grid; }
      .vi-timeline { margin: 0; padding: 0 0 0 1.1rem; display: grid; gap: var(--vi-item-gap, 0.55rem); }
      .vi-timeline li { list-style: none; border-left: 2px solid rgba(0,0,0,0.14); padding: 0.15rem 0.75rem; }
      .vi-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--vi-item-gap, 0.6rem); }
      .vi-card-grid article { border: 1px solid rgba(0,0,0,0.1); border-radius: var(--vi-media-radius, 12px); padding: 0.6rem; background: rgba(255,255,255,0.86); }
      .vi-card-grid article.is-highlight { border-color: var(--vi-accent-border-strong); background: var(--vi-accent-soft); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
      [data-vi-selectable-item="true"] { transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, transform 220ms ease, opacity 220ms ease; }
      [data-vi-selectable-item="true"].vi-runtime-selected { border-color: var(--vi-runtime-selected-border) !important; background: var(--vi-runtime-selected-bg) !important; box-shadow: var(--vi-runtime-selected-shadow); }
      [data-vi-selectable-item="true"]:focus-visible { outline: 2px solid color-mix(in srgb, var(--vi-accent, #f26d3d) 46%, transparent); outline-offset: 2px; }
      [data-vi-runtime-status] { display: block; margin-top: 0.45rem; font-size: 0.82rem; opacity: 0.8; }
      .vi-divider { border-radius: 12px; border: 1px dashed rgba(0,0,0,0.22); text-align: center; padding: 0.8rem; font-weight: 600; }
      .vi-quote-strip { display: grid; gap: var(--vi-item-gap, 0.6rem); }
      .vi-quote-strip blockquote { margin: 0; border-left: 3px solid var(--vi-accent, #f26d3d); padding: 0.35rem 0.7rem; background: rgba(255,255,255,0.72); }
      .vi-metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--vi-item-gap, 0.55rem); }
      .vi-metric-grid article { border: 1px solid rgba(0,0,0,0.1); border-radius: var(--vi-media-radius, 10px); padding: 0.55rem; background: rgba(255,255,255,0.86); }
      .vi-metric-grid strong { font-size: 1.2rem; color: var(--vi-accent, #f26d3d); display: block; }
      .vi-split-grid { display: grid; gap: var(--vi-item-gap, 0.65rem); grid-template-columns: repeat(2, minmax(0,1fr)); }
      .vi-split-grid article { border: 1px solid rgba(0,0,0,0.1); border-radius: var(--vi-media-radius, 12px); padding: 0.7rem; }
      .vi-pro { background: var(--vi-positive-soft); border-color: color-mix(in srgb, var(--vi-positive, #14825d) 30%, transparent); }
      .vi-con { background: var(--vi-negative-soft); border-color: color-mix(in srgb, var(--vi-negative, #c24f3f) 30%, transparent); }
      .vi-compare { width: 100%; border-collapse: collapse; }
      .vi-compare th, .vi-compare td { border: 1px solid rgba(0,0,0,0.12); padding: 0.45rem; font-size: 0.9rem; }
      .vi-checklist { list-style: none; display: grid; gap: 0.45rem; margin: 0; padding: 0; }
      .vi-checklist li { display: flex; align-items: center; gap: 0.5rem; }
      .vi-weather-cards { display: grid; gap: var(--vi-item-gap, 0.55rem); grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .vi-weather-cards article { border: 1px solid rgba(0,0,0,0.1); border-radius: var(--vi-media-radius, 12px); padding: 0.6rem; }
      .vi-cta { display: grid; gap: 0.2rem; border-radius: 12px; border: 1px solid var(--vi-accent-border); background: var(--vi-accent-soft-strong); padding: 0.7rem 0.8rem; text-decoration: none; color: inherit; }
      .vi-link-grid { display: grid; gap: var(--vi-item-gap, 0.55rem); grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .vi-link-grid a { display: grid; gap: 0.2rem; border-radius: var(--vi-media-radius, 12px); border: 1px solid rgba(0,0,0,0.12); padding: 0.6rem; text-decoration: none; color: inherit; }
      .vi-bio { display: grid; grid-template-columns: 84px minmax(0,1fr); gap: var(--vi-item-gap, 0.65rem); align-items: start; }
      .vi-bio img { width: 84px; height: 84px; object-fit: cover; border-radius: var(--vi-media-radius, 12px); border: 1px solid rgba(0,0,0,0.12); }
      .vi-faq { display: grid; gap: var(--vi-item-gap, 0.5rem); }
      .vi-faq details { border: 1px solid rgba(0,0,0,0.12); border-radius: var(--vi-media-radius, 10px); padding: 0.45rem 0.6rem; background: rgba(255,255,255,0.86); }
      .vi-anchor-nav { display: flex; flex-wrap: wrap; gap: var(--vi-item-gap, 0.45rem); }
      .vi-anchor-nav a { border-radius: var(--vi-control-radius, 999px); border: 1px solid rgba(0,0,0,0.13); padding: 0.3rem 0.58rem; text-decoration: none; color: inherit; background: var(--vi-control-bg, rgba(255,255,255,0.92)); }
      .vi-anchor-nav a.vi-runtime-selected { border-color: var(--vi-runtime-selected-border); background: var(--vi-runtime-selected-bg); box-shadow: var(--vi-runtime-selected-shadow); }
      .vi-tabs-list { display: flex; gap: var(--vi-item-gap, 0.35rem); flex-wrap: wrap; }
      .vi-tabs-list button, .vi-stepper-actions button, .vi-filter-controls button, .vi-copy button, .vi-share button, .vi-modal button, .vi-countdown button, .vi-dismissible button, .vi-poll button, .vi-quiz button, [data-vi-carousel-prev], [data-vi-carousel-next] { border: 1px solid var(--vi-accent-border, color-mix(in srgb, var(--vi-accent, #f26d3d) 34%, transparent)); border-radius: var(--vi-control-radius, 999px) !important; background: var(--vi-control-bg, rgba(255,255,255,0.92)) !important; color: var(--vi-control-color, inherit) !important; padding: 0.3rem 0.58rem; }
      .vi-tabs-list button[aria-selected="true"] { background: var(--vi-runtime-selected-bg); border-color: var(--vi-runtime-selected-border); box-shadow: var(--vi-runtime-selected-shadow); }
      .vi-countdown button { border-color: var(--vi-accent-border-strong); background: var(--vi-accent-soft-strong) !important; font-weight: 600; }
      .vi-stepper-actions { margin-top: 0.45rem; display: flex; gap: var(--vi-item-gap, 0.4rem); }
      .vi-sticky-progress { display: grid; gap: 0.45rem; }
      .vi-progress-track { height: 0.65rem; border-radius: 999px; background: rgba(0,0,0,0.1); overflow: hidden; }
      .vi-progress-track span { display: block; height: 100%; background: var(--vi-accent, #f26d3d); }
      .vi-dismissible { display: flex; justify-content: space-between; align-items: center; gap: var(--vi-item-gap, 0.5rem); border: 1px solid rgba(0,0,0,0.12); border-radius: var(--vi-media-radius, 12px); padding: 0.5rem 0.7rem; }
      .vi-choice-grid { display: grid; gap: var(--vi-item-gap, 0.6rem); grid-template-columns: repeat(2, minmax(0,1fr)); }
      .vi-choice-grid article { border: 1px solid rgba(0,0,0,0.12); border-radius: var(--vi-media-radius, 12px); padding: 0.6rem; }
      .vi-poll, .vi-quiz, .vi-filter, .vi-copy, .vi-share, .vi-modal, .vi-countdown, .vi-hotspot { display: grid; gap: var(--vi-item-gap, 0.45rem); }
      .vi-poll .is-selected { background: var(--vi-runtime-selected-bg); border-color: var(--vi-runtime-selected-border); box-shadow: var(--vi-runtime-selected-shadow); }
      .vi-filter-controls .is-selected { background: var(--vi-runtime-selected-bg); border-color: var(--vi-runtime-selected-border); box-shadow: var(--vi-runtime-selected-shadow); }
      .vi-quiz .is-correct { background: var(--vi-positive-soft); border-color: color-mix(in srgb, var(--vi-positive, #14825d) 30%, transparent); }
      .vi-quiz .is-wrong { background: var(--vi-negative-soft); border-color: color-mix(in srgb, var(--vi-negative, #c24f3f) 30%, transparent); }
      .vi-filter-controls { display: flex; flex-wrap: wrap; gap: var(--vi-item-gap, 0.35rem); }
      .vi-form { display: grid; gap: var(--vi-item-gap, 0.45rem); }
      .vi-form input, .vi-form textarea, .vi-share input { width: 100%; border: 1px solid rgba(0,0,0,0.14); border-radius: var(--vi-media-radius, 10px); padding: 0.45rem 0.55rem; }
      .vi-form-inline { grid-template-columns: minmax(0,1fr) auto; align-items: end; }
      .vi-reference-list { margin: 0; padding-left: 1.1rem; display: grid; gap: 0.3rem; }
      .vi-reference-list li { display: flex; align-items: center; justify-content: space-between; gap: 0.55rem; }
      .vi-deadline { border: 1px solid color-mix(in srgb, var(--vi-negative, #c24f3f) 30%, transparent); border-radius: 12px; background: var(--vi-negative-soft); padding: 0.6rem; }
      .vi-slider-images { position: relative; overflow: hidden; border-radius: var(--vi-media-radius, 12px); border: 1px solid rgba(0,0,0,0.12); }
      .vi-slider-images img { display: block; width: 100%; height: auto; }
      .vi-slider-images [data-vi-slider-after] { position: absolute; inset: 0; }
      .vi-lightbox button { border: 0; background: transparent; padding: 0; text-align: left; }
      .vi-lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.78); display: grid; place-items: center; z-index: 9999; }
      .vi-lightbox-overlay img { max-width: min(92vw, 960px); max-height: 76vh; border-radius: 14px; }
      .vi-lightbox-overlay button { position: absolute; top: 1rem; right: 1rem; }
      .vi-hotspot-list { display: flex; gap: 0.35rem; flex-wrap: wrap; }
      .vi-hotspot img { width: 100%; border-radius: var(--vi-media-radius, 12px); border: 1px solid rgba(0,0,0,0.12); }
      [data-vi-carousel-prev][disabled], [data-vi-carousel-next][disabled] { opacity: 0.45; cursor: default; }
      .vi-raw-output { border: 1px dashed rgba(0,0,0,0.2); border-radius: 12px; padding: 0.7rem; }
      .vi-raw-issues { margin: 0.6rem 0 0; padding-left: 1rem; }
      .vi-raw-issues li.error { color: var(--vi-negative, #c24f3f); }
      .vi-raw-issues li.warning { color: var(--vi-warning, #8c6a2e); }
      @media (max-width: 720px) {
        .vi-choice-grid, .vi-split-grid, .vi-form-inline, .vi-bio { grid-template-columns: 1fr; }
      }
  `;
}

function walk(node: JSONContent | undefined, predicate: (node: JSONContent) => boolean): boolean {
  if (!node) {
    return false;
  }

  if (predicate(node)) {
    return true;
  }

  return (node.content ?? []).some((child) => walk(child, predicate));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
