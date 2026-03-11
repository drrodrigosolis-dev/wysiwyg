import { describe, expect, it } from "vitest";

import { sanitizeRawChunkHtml, validateRawChunkHtml } from "./validator";

describe("raw chunk validator", () => {
  it("accepts strict-safe markup", () => {
    const report = validateRawChunkHtml('<section><h3>Title</h3><p>Body</p><a href="https://example.com">Link</a></section>');

    expect(report.strictAllowlist).toBe("works");
    expect(report.enhancedRuntime).toBe("none");
    expect(report.issues).toHaveLength(0);
  });

  it("blocks scripts and inline handlers", () => {
    const report = validateRawChunkHtml('<div onclick="alert(1)">X</div><script>alert(1)</script>');

    expect(report.strictAllowlist).toBe("blocked");
    expect(report.issues.some((issue) => issue.code === "inline-handler")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "blocked-tag")).toBe(true);
  });

  it("sanitizes unsafe URL and style patterns", () => {
    const sanitized = sanitizeRawChunkHtml('<a href="javascript:alert(1)" style="background-image:url(javascript:alert(1))">bad</a>');

    expect(sanitized.html).not.toContain("javascript:");
    expect(sanitized.report.strictAllowlist).toBe("blocked");
  });

  it("detects enhanced runtime marker", () => {
    const report = validateRawChunkHtml('<div data-vi-runtime="required"><p>Needs runtime</p></div>');

    expect(report.enhancedRuntime).toBe("required");
  });
});
