import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import { describe, expect, it } from "vitest";

import { buildEditorExtensions } from "./extensions";
import { generateExportableHtml } from "./html";

const editorExtensions = buildEditorExtensions();

describe("generateExportableHtml", () => {
  it("returns a fragment without XHTML namespace noise", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: "center" },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          attrs: { textAlign: "right" },
          content: [
            {
              type: "text",
              text: "Tinted",
              marks: [{ type: "textStyle", attrs: { color: "rgb(12, 34, 56)" } }],
            },
          ],
        },
        {
          type: "callout",
          attrs: { tone: "note", backgroundColor: "rgba(10, 20, 30, 0.2)" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Callout" }],
            },
          ],
        },
        {
          type: "interactiveChunk",
          attrs: {
            templateId: "scroll-carousel",
            mode: "structured",
            dataJson: JSON.stringify({
              title: "Carousel",
              summary: "Gallery summary",
              accent: "ember",
              items: [
                {
                  title: "Image A",
                  body: "A detail",
                  image: "https://example.com/a.jpg",
                  link: "https://example.com/a",
                  tag: "Primary",
                  value: "12",
                },
              ],
            }),
            rawHtml: "",
            version: 1,
            restriction: "strict",
          },
        },
      ],
    };

    const rawHtml = generateHTML(content, editorExtensions);
    const exportableHtml = generateExportableHtml(content, editorExtensions);

    expect(rawHtml).toContain("http://www.w3.org/1999/xhtml");
    expect(exportableHtml).not.toContain("http://www.w3.org/1999/xhtml");
    expect(exportableHtml).toMatch(/<h1[^>]*text-align:\s*center;?[^>]*>Title<\/h1>/);
    expect(exportableHtml).toMatch(/<span[^>]*color:\s*rgb\(12,\s*34,\s*56\);?[^>]*>Tinted<\/span>/);
    expect(exportableHtml).toContain('data-callout="true"');
    expect(exportableHtml).toContain("--callout-bg: rgba(10, 20, 30, 0.2)");
    expect(exportableHtml).toContain('data-interactive-chunk="true"');
    expect(exportableHtml).toContain("data-interactive-chunk-rendered=\"true\"");
    expect(exportableHtml).toContain("vi-template-scroll-carousel");
  });
});
