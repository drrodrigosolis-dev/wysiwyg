import { describe, expect, it } from "vitest";

import { createRawChunkAttrs, createStructuredChunkAttrs } from "./registry";
import { hydrateInteractiveChunksInHtml, renderInteractiveChunk, toDomChunkAttributes } from "./render";

describe("interactive chunk render pipeline", () => {
  it("hydrates chunk placeholders into rendered output", () => {
    const attrs = createStructuredChunkAttrs("tabs-panel");
    const domAttrs = toDomChunkAttributes(attrs);
    const source = `<div ${Object.entries(domAttrs)
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ")}></div>`;

    const html = hydrateInteractiveChunksInHtml(source);

    expect(html).toContain('data-interactive-chunk-rendered="true"');
    expect(html).toContain('data-vi-template="tabs-panel"');
    expect(html).toContain('data-vi-runtime="required"');
  });

  it("renders raw chunk issues list when sanitization finds violations", () => {
    const rawAttrs = createRawChunkAttrs('<p onclick="alert(1)">ok</p>');
    const rendered = renderInteractiveChunk(rawAttrs);

    expect(rendered.report).not.toBeNull();
    expect(rendered.html).toContain("vi-raw-output");
    expect(rendered.html).toContain("vi-raw-issues");
  });

  it("applies advanced carousel tuning controls in structured output", () => {
    const attrs = createStructuredChunkAttrs("scroll-carousel", {
      carouselFadeBlur: 7,
      carouselFadeColor: "#111111",
      carouselShowArrows: true,
      carouselPrevIcon: "⟵",
      carouselNextIcon: "⟶",
      carouselScrollStep: 510,
      surfacePadding: 20,
      headerAlign: "center",
    });

    const rendered = renderInteractiveChunk(attrs);

    expect(rendered.html).toContain('data-vi-component="scroll-carousel"');
    expect(rendered.html).toContain('data-vi-scroll-step="510"');
    expect(rendered.html).toContain("backdrop-filter:blur(7px)");
    expect(rendered.html).toContain("⟵");
    expect(rendered.html).toContain("⟶");
    expect(rendered.html).toContain("--vi-container-padding:20px");
    expect(rendered.html).toContain("--vi-header-align:center");
  });
});
