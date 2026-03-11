import { describe, expect, it } from "vitest";

import {
  getChunkTemplate,
  getChunkTemplateConcepts,
  getStructuredChunkTemplates,
  resolveChunkTemplateId,
} from "./registry";

describe("interactive chunk registry", () => {
  it("contains 64 HTML templates and 64 JavaScript templates", () => {
    const htmlTemplates = getStructuredChunkTemplates("html");
    const jsTemplates = getStructuredChunkTemplates("javascript");
    const allTemplates = getStructuredChunkTemplates("all");

    expect(htmlTemplates).toHaveLength(64);
    expect(jsTemplates).toHaveLength(64);
    expect(allTemplates).toHaveLength(128);

    expect(new Set(htmlTemplates.map((template) => template.id)).size).toBe(64);
    expect(new Set(jsTemplates.map((template) => template.id)).size).toBe(64);
  });

  it("ships 8 templates per category in both HTML and JavaScript catalogs", () => {
    const htmlTemplates = getStructuredChunkTemplates("html");
    const jsTemplates = getStructuredChunkTemplates("javascript");

    const htmlCounts = htmlTemplates.reduce<Record<string, number>>((accumulator, template) => {
      accumulator[template.category] = (accumulator[template.category] ?? 0) + 1;
      return accumulator;
    }, {});

    const jsCounts = jsTemplates.reduce<Record<string, number>>((accumulator, template) => {
      accumulator[template.category] = (accumulator[template.category] ?? 0) + 1;
      return accumulator;
    }, {});

    Object.values(htmlCounts).forEach((count) => expect(count).toBe(8));
    Object.values(jsCounts).forEach((count) => expect(count).toBe(8));
  });

  it("provides concept mappings with HTML and JavaScript variants", () => {
    const concepts = getChunkTemplateConcepts();
    expect(concepts).toHaveLength(64);
    expect(new Set(concepts.map((concept) => concept.id)).size).toBe(64);

    concepts.forEach((concept) => {
      expect(concept.templateIds.html).toBeTruthy();
      expect(concept.templateIds.javascript).toBeTruthy();

      const htmlTemplateId = resolveChunkTemplateId(concept.id, "html");
      const jsTemplateId = resolveChunkTemplateId(concept.id, "javascript");
      expect(htmlTemplateId).toBeTruthy();
      expect(jsTemplateId).toBeTruthy();

      const htmlTemplate = getChunkTemplate(htmlTemplateId ?? "");
      const jsTemplate = getChunkTemplate(jsTemplateId ?? "");
      expect(htmlTemplate?.engine).toBe("html");
      expect(jsTemplate?.engine).toBe("javascript");
      expect(htmlTemplate?.conceptId).toBe(concept.id);
      expect(jsTemplate?.conceptId).toBe(concept.id);
    });
  });

  it("marks JavaScript templates as runtime-required and HTML strict templates as strict-safe", () => {
    const htmlTemplates = getStructuredChunkTemplates("html");
    const jsTemplates = getStructuredChunkTemplates("javascript");

    jsTemplates.forEach((template) => {
      expect(template.compatibility.enhancedRuntime).toBe("required");
      expect(template.restriction).toBe("enhanced");
    });

    htmlTemplates.forEach((template) => {
      if (template.restriction === "strict") {
        expect(template.compatibility.enhancedRuntime).toBe("none");
      }
      expect(template.compatibility.strictAllowlist).toBe("works");
    });
  });

  it("exposes personalization controls across JavaScript templates", () => {
    const jsTemplates = getStructuredChunkTemplates("javascript");
    const requiredFieldKeys = [
      "persistInteractionState",
      "announceInteractionState",
      "stateMemory",
      "statusVerbosity",
      "keyboardShortcuts",
      "navigationWrap",
      "hoverActivation",
      "autoAdvanceMs",
      "motionProfile",
      "highlightIntensity",
      "selectionBehavior",
      "detailsDisclosureMode",
      "showInteractionStatus",
      "statusOnLoad",
      "staggerRevealMs",
    ];

    jsTemplates.forEach((template) => {
      const fieldKeys = new Set(template.fields.map((field) => field.key));
      requiredFieldKeys.forEach((key) => {
        expect(fieldKeys.has(key)).toBe(true);
      });
      expect(String(template.defaultData.stateMemory ?? "")).not.toBe("");
      expect(String(template.defaultData.statusVerbosity ?? "")).not.toBe("");
    });
  });

  it("renders non-empty HTML from default data in both catalogs", () => {
    const templates = getStructuredChunkTemplates("all");

    templates.forEach((template) => {
      const html = template.render(template.defaultData);
      expect(html.trim().length).toBeGreaterThan(0);
      expect(html).toContain(`data-vi-template="${template.id}"`);
      expect(html).toContain(`data-vi-contract="${template.id}"`);
    });
  });

  it("keeps checklist contextual defaults in HTML and JavaScript variants", () => {
    const htmlChecklist = getChunkTemplate("checklist-progress");
    const jsChecklist = getChunkTemplate("checklist-progress-js");

    expect(htmlChecklist).toBeDefined();
    expect(jsChecklist).toBeDefined();
    if (!htmlChecklist || !jsChecklist) {
      return;
    }

    expect(String(htmlChecklist.defaultData.summary)).toMatch(/check/i);
    expect(String(jsChecklist.defaultData.summary)).toMatch(/check/i);

    const htmlRepeater = htmlChecklist.fields.find((field) => field.type === "repeater");
    const jsRepeater = jsChecklist.fields.find((field) => field.type === "repeater");
    expect(htmlRepeater).toBeDefined();
    expect(jsRepeater).toBeDefined();

    if (!htmlRepeater || htmlRepeater.type !== "repeater" || !jsRepeater || jsRepeater.type !== "repeater") {
      return;
    }

    const htmlHasCompletedToggle = htmlRepeater.itemFields.some((field) => field.type === "toggle" && field.key === "done");
    const jsHasCompletedToggle = jsRepeater.itemFields.some((field) => field.type === "toggle" && field.key === "done");

    expect(htmlHasCompletedToggle).toBe(true);
    expect(jsHasCompletedToggle).toBe(true);
  });
});
