import { describe, expect, it } from "vitest";

import { sanitizePastedHtml } from "./sanitize";

describe("sanitizePastedHtml", () => {
  it("preserves inline and table formatting attributes used by the editor", () => {
    const html = `
      <div>
        <p style="text-align: center;"><span style="color: rgb(12, 34, 56); font-size: 18px;">Tinted</span></p>
        <table style="--table-grid-color: rgba(1,2,3,0.4); --table-cell-padding-top: 12px;" data-cell-wrap-mode="wrap">
          <colgroup>
            <col style="width: 40%;" />
          </colgroup>
          <tbody>
            <tr>
              <td style="background-color: rgba(1,2,3,0.12);" colspan="2">Cell</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const sanitized = sanitizePastedHtml(html);

    expect(sanitized).toContain("text-align: center");
    expect(sanitized).toContain("color: rgb(12, 34, 56)");
    expect(sanitized).toContain("--table-grid-color: rgba(1,2,3,0.4)");
    expect(sanitized).toContain('data-cell-wrap-mode="wrap"');
    expect(sanitized).toContain("background-color: rgba(1,2,3,0.12)");
    expect(sanitized).toContain('colspan="2"');
  });

  it("removes blocked tags, event handlers, and unsafe urls", () => {
    const html = `
      <div onclick="alert('xss')">
        <script>alert("xss")</script>
        <a href="javascript:alert(1)" style="background-image:url(javascript:alert(1)); color: red;">Click</a>
        <img src="data:text/html;base64,PHNjcmlwdD4=" />
      </div>
    `;

    const sanitized = sanitizePastedHtml(html);

    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("data:text/html");
    expect(sanitized).toContain("color: red");
  });
});
