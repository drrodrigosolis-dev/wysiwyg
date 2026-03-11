import { describe, expect, it, vi } from "vitest";

import { hydrateInteractiveChunkRuntime } from "./runtime";

function buildChunkShell(inner: string, attrs: Record<string, string>) {
  const mergedAttrs: Record<string, string> = {
    "data-vi-persist-state": "false",
    "data-vi-state-memory": "none",
    ...attrs,
  };
  const attributeString = Object.entries(mergedAttrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  return `<section class="vi-chunk" ${attributeString}>${inner}</section>`;
}

describe("interactive chunk runtime", () => {
  it("applies single-select behavior to JavaScript chunk candidates", () => {
    document.body.innerHTML = buildChunkShell(
      `<div class="vi-card-grid">
        <article data-vi-selectable-item="true">Alpha</article>
        <article data-vi-selectable-item="true">Beta</article>
      </div>`,
      {
        "data-vi-template": "metric-cards-row-js",
        "data-vi-engine": "javascript",
        "data-vi-runtime": "required",
        "data-vi-selection-behavior": "single",
        "data-vi-show-status": "false",
      },
    );

    hydrateInteractiveChunkRuntime(document.body);
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-vi-selectable-item="true"]'));
    expect(cards).toHaveLength(2);

    cards[0]?.click();
    expect(cards[0]?.classList.contains("vi-runtime-selected")).toBe(true);
    expect(cards[1]?.classList.contains("vi-runtime-selected")).toBe(false);

    cards[1]?.click();
    expect(cards[0]?.classList.contains("vi-runtime-selected")).toBe(false);
    expect(cards[1]?.classList.contains("vi-runtime-selected")).toBe(true);
  });

  it("respects non-wrapping navigation for generic selectable candidates", () => {
    document.body.innerHTML = buildChunkShell(
      `<div class="vi-card-grid">
        <article data-vi-selectable-item="true">Alpha</article>
        <article data-vi-selectable-item="true">Beta</article>
      </div>`,
      {
        "data-vi-template": "metric-cards-row-js",
        "data-vi-engine": "javascript",
        "data-vi-runtime": "required",
        "data-vi-selection-behavior": "single",
        "data-vi-navigation-wrap": "false",
      },
    );

    hydrateInteractiveChunkRuntime(document.body);
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-vi-selectable-item="true"]'));
    expect(cards).toHaveLength(2);

    cards[0]?.focus();
    cards[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(document.activeElement).toBe(cards[0]);
  });

  it("enables hover activation when configured", () => {
    document.body.innerHTML = buildChunkShell(
      `<div class="vi-card-grid">
        <article data-vi-selectable-item="true">Alpha</article>
        <article data-vi-selectable-item="true">Beta</article>
      </div>`,
      {
        "data-vi-template": "metric-cards-row-js",
        "data-vi-engine": "javascript",
        "data-vi-runtime": "required",
        "data-vi-selection-behavior": "single",
        "data-vi-hover-activation": "true",
      },
    );

    hydrateInteractiveChunkRuntime(document.body);
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-vi-selectable-item="true"]'));
    expect(cards).toHaveLength(2);

    cards[1]?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(cards[1]?.classList.contains("vi-runtime-selected")).toBe(true);
  });

  it("does not apply selectable runtime to Pure HTML chunks", () => {
    document.body.innerHTML = buildChunkShell(
      `<div class="vi-card-grid">
        <article data-vi-selectable-item="true">Alpha</article>
      </div>`,
      {
        "data-vi-template": "metric-cards-row",
        "data-vi-engine": "html",
        "data-vi-runtime": "none",
        "data-vi-selection-behavior": "single",
      },
    );

    hydrateInteractiveChunkRuntime(document.body);
    const card = document.querySelector<HTMLElement>('[data-vi-selectable-item="true"]');
    expect(card).not.toBeNull();
    card?.click();
    expect(card?.classList.contains("vi-runtime-selected")).toBe(false);
  });

  it("enforces single-open details mode for JavaScript chunks", () => {
    document.body.innerHTML = buildChunkShell(
      `<div class="vi-faq">
        <details><summary>One</summary><p>A</p></details>
        <details><summary>Two</summary><p>B</p></details>
      </div>`,
      {
        "data-vi-template": "faq-accordion-details-js",
        "data-vi-engine": "javascript",
        "data-vi-runtime": "required",
        "data-vi-details-mode": "single",
        "data-vi-show-status": "false",
      },
    );

    hydrateInteractiveChunkRuntime(document.body);
    const details = Array.from(document.querySelectorAll<HTMLDetailsElement>("details"));
    expect(details).toHaveLength(2);

    details[0]!.open = true;
    details[0]!.dispatchEvent(new Event("toggle"));
    details[1]!.open = true;
    details[1]!.dispatchEvent(new Event("toggle"));

    expect(details[0]!.open).toBe(false);
    expect(details[1]!.open).toBe(true);
  });

  it("adds JavaScript form feedback on submit", () => {
    document.body.innerHTML = buildChunkShell(
      `<form class="vi-form" action="#" method="post">
        <label>Email<input type="email" name="email" value="user@example.com" /></label>
        <button type="submit">Send</button>
      </form>`,
      {
        "data-vi-template": "contact-form-lite-js",
        "data-vi-engine": "javascript",
        "data-vi-runtime": "required",
        "data-vi-show-status": "true",
        "data-vi-status-verbosity": "balanced",
      },
    );

    hydrateInteractiveChunkRuntime(document.body);
    const form = document.querySelector<HTMLFormElement>("form.vi-form");
    expect(form).not.toBeNull();
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const status = document.querySelector<HTMLElement>("[data-vi-runtime-status]");
    expect(status?.textContent).toContain("Form captured");
  });

  it("copies inline snippets when no global id target is provided", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });

    document.body.innerHTML = buildChunkShell(
      `<div class="vi-copy" data-vi-component="copy">
        <pre><code data-vi-copy-source>npm run dev</code></pre>
        <button type="button" data-vi-copy-target="inline">Copy</button>
        <small data-vi-copy-status>Ready to copy.</small>
      </div>`,
      {
        "data-vi-template": "copyable-reference-list-js",
        "data-vi-engine": "javascript",
        "data-vi-runtime": "required",
      },
    );

    hydrateInteractiveChunkRuntime(document.body);
    const button = document.querySelector<HTMLButtonElement>("[data-vi-copy-target]");
    expect(button).not.toBeNull();
    button?.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("npm run dev");
  });
});
