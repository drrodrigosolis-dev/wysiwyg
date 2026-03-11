import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sampleDocument } from "../content/sampleDocument";
import { INTERACTIVE_CHUNK_TEMPLATES } from "../editor/chunks/registry";
import { App } from "./App";

vi.mock("../features/persistence/editorStorage", () => {
  return {
    getWorkspaceStorage: vi.fn(async () => ({
      usingIndexedDb: false,
      loadDocument: async () => JSON.parse(JSON.stringify(sampleDocument)),
      saveDocument: async () => {},
      listSnapshots: async () => [],
      saveSnapshot: async () => [],
    })),
  };
});

describe("App interactive chunks integration", () => {
  beforeEach(() => {
    const rect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    };

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.getClientRects = vi.fn(() => [rect]) as any;
    window.HTMLElement.prototype.getBoundingClientRect = vi.fn(() => rect) as any;
    (window.Text.prototype as any).getClientRects = vi.fn(() => [rect]);
    (window.Text.prototype as any).getBoundingClientRect = vi.fn(() => rect);
    (window.Range.prototype as any).getClientRects = vi.fn(() => [rect]);
    (window.Range.prototype as any).getBoundingClientRect = vi.fn(() => rect);
    (document as any).elementFromPoint = vi.fn(() => document.body);
  });

  afterEach(() => {
    cleanup();
  });

  it("inserts an interactive chunk from slash commands", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const editor = await waitForEditor(container);

    editor.focus();
    await user.keyboard("{Enter}/");

    const slashOption = await screen.findByRole("button", { name: /Scroll Carousel/i });
    await user.click(slashOption);

    await waitFor(() => {
      const title = container.querySelector(".vi-chunk-shell-title");
      expect(title).not.toBeNull();
      expect(title?.textContent).toMatch(/Scroll Carousel/i);
    });
  });

  it("inserts all 64 chunks from the toolbar and renders unique contracts", async () => {
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);
    const templateIds = INTERACTIVE_CHUNK_TEMPLATES.map((template) => template.id);

    const chunkSelect = root.getAllByLabelText("Chunk")[0];
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];

    templateIds.forEach((templateId) => {
      fireEvent.change(chunkSelect, { target: { value: templateId } });
      fireEvent.click(addChunkButton);
    });

    await waitFor(() => {
      const nodes = container.querySelectorAll('div[data-interactive-chunk="true"]');
      expect(nodes.length).toBe(templateIds.length);
    });

    const nodes = Array.from(container.querySelectorAll<HTMLElement>('div[data-interactive-chunk="true"]'));
    const foundTemplateIds = new Set(nodes.map((node) => String(node.getAttribute("data-template-id") ?? "")));

    expect(foundTemplateIds.size).toBe(templateIds.length);
    templateIds.forEach((templateId) => {
      expect(foundTemplateIds.has(templateId)).toBe(true);
    });

    nodes.forEach((node) => {
      const templateId = String(node.getAttribute("data-template-id") ?? "");
      const preview = node.querySelector<HTMLElement>("[data-vi-preview-shell]");
      expect(preview).not.toBeNull();
      expect(preview?.innerHTML).toContain(`data-vi-template="${templateId}"`);
      expect(preview?.innerHTML).toContain(`data-vi-contract="${templateId}"`);
    });
  }, 120000);

  it("switches between HTML and JavaScript chunk variants with explicit filters", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);

    const chunkTypeSelect = root.getAllByLabelText("Chunk type")[0] as HTMLSelectElement;
    const chunkSelect = root.getAllByLabelText("Chunk")[0] as HTMLSelectElement;
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];
    const rawButton = root.getAllByRole("button", { name: "Raw HTML [Advanced]" })[0] as HTMLButtonElement;

    await user.selectOptions(chunkTypeSelect, "javascript");
    expect(chunkTypeSelect.value).toBe("javascript");
    expect(rawButton.disabled).toBe(true);

    await user.selectOptions(chunkSelect, "scroll-carousel");
    await user.click(addChunkButton);

    await waitFor(() => {
      const jsNode = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="scroll-carousel-js"]');
      expect(jsNode).not.toBeNull();
    });

    await user.selectOptions(chunkTypeSelect, "html");
    expect(rawButton.disabled).toBe(false);
    await user.click(addChunkButton);

    await waitFor(() => {
      const htmlNodes = container.querySelectorAll<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="scroll-carousel"]');
      expect(htmlNodes.length).toBeGreaterThan(0);
    });
  });

  it("loads the exact selected concept template instead of falling back to another chunk", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);

    const chunkTypeSelect = root.getAllByLabelText("Chunk type")[0] as HTMLSelectElement;
    const chunkSelect = root.getAllByLabelText("Chunk")[0] as HTMLSelectElement;
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];

    await user.selectOptions(chunkTypeSelect, "html");
    await user.selectOptions(chunkSelect, "snap-gallery-strip");
    await user.click(addChunkButton);

    const snapNode = await waitFor(() => {
      const node = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="snap-gallery-strip"]');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });

    const preview = snapNode.querySelector<HTMLElement>("[data-vi-preview-shell]");
    expect(preview?.innerHTML ?? "").toContain('data-vi-component="snap-gallery"');
    expect(preview?.innerHTML ?? "").not.toContain('data-vi-component="scroll-carousel"');
  });

  it("hydrates JavaScript tabs interactions in the editor preview", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);

    const chunkTypeSelect = root.getAllByLabelText("Chunk type")[0] as HTMLSelectElement;
    const chunkSelect = root.getAllByLabelText("Chunk")[0] as HTMLSelectElement;
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];

    await user.selectOptions(chunkTypeSelect, "javascript");
    await user.selectOptions(chunkSelect, "tabs-panel");
    await user.click(addChunkButton);

    const jsNode = await waitFor(() => {
      const node = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="tabs-panel-js"]');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });

    const tabButtons = jsNode.querySelectorAll<HTMLElement>("[data-vi-tab]");
    expect(tabButtons.length).toBeGreaterThan(1);
    expect(tabButtons[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabButtons[1]?.getAttribute("aria-selected")).toBe("false");

    await user.click(tabButtons[1] as HTMLElement);

    await waitFor(() => {
      expect(tabButtons[0]?.getAttribute("aria-selected")).toBe("false");
      expect(tabButtons[1]?.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("hydrates JavaScript tabs interactions in chunk builder preview", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);

    const chunkTypeSelect = root.getAllByLabelText("Chunk type")[0] as HTMLSelectElement;
    const chunkSelect = root.getAllByLabelText("Chunk")[0] as HTMLSelectElement;
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];

    await user.selectOptions(chunkTypeSelect, "javascript");
    await user.selectOptions(chunkSelect, "tabs-panel");
    await user.click(addChunkButton);

    await waitFor(() => {
      const node = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="tabs-panel-js"]');
      expect(node).not.toBeNull();
    });

    await user.click(root.getByRole("button", { name: "Chunk builder" }));
    const builder = await findChunkBuilderShell(container);
    const preview = builder.querySelector<HTMLElement>(".chunk-builder-preview");
    expect(preview).not.toBeNull();

    const tabButtons = preview?.querySelectorAll<HTMLElement>("[data-vi-tab]") ?? [];
    expect(tabButtons.length).toBeGreaterThan(1);
    const getSelectedIndex = () =>
      Array.from(tabButtons).findIndex((button) => button.getAttribute("aria-selected") === "true");
    await waitFor(() => {
      expect(Array.from(tabButtons).filter((button) => button.getAttribute("aria-selected") === "true")).toHaveLength(1);
      expect(getSelectedIndex()).toBeGreaterThanOrEqual(0);
    });

    await user.click(tabButtons[1] as HTMLElement);

    await waitFor(() => {
      expect(tabButtons[1]?.getAttribute("aria-selected")).toBe("true");
      expect(Array.from(tabButtons).filter((button) => button.getAttribute("aria-selected") === "true")).toHaveLength(1);
    });
  });

  it("supports sorting and footnote popovers in chunk builder preview", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);

    const chunkTypeSelect = root.getAllByLabelText("Chunk type")[0] as HTMLSelectElement;
    const chunkSelect = root.getAllByLabelText("Chunk")[0] as HTMLSelectElement;
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];

    await user.selectOptions(chunkTypeSelect, "javascript");
    await user.selectOptions(chunkSelect, "sort-toggle-grid");
    await user.click(addChunkButton);
    await waitFor(() => {
      const node = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="sort-toggle-grid-js"]');
      expect(node).not.toBeNull();
    });

    await user.click(root.getByRole("button", { name: "Chunk builder" }));
    const builder = await findChunkBuilderShell(container);
    let preview = builder.querySelector<HTMLElement>(".chunk-builder-preview");
    expect(preview).not.toBeNull();

    await waitFor(() => {
      const sortContainer = preview?.querySelector<HTMLElement>('[data-vi-component="sort"]');
      expect(sortContainer?.dataset.viPreviewBound).toBe("true");
    });

    const descendingButton = preview?.querySelector<HTMLElement>("[data-vi-sort-desc]");
    const ascendingButton = preview?.querySelector<HTMLElement>("[data-vi-sort-asc]");
    expect(descendingButton).not.toBeNull();
    expect(ascendingButton).not.toBeNull();

    await user.click(descendingButton as HTMLElement);
    await waitFor(() => {
      const values = Array.from(preview?.querySelectorAll<HTMLElement>("[data-vi-sort-value]") ?? []).map((node) =>
        Number(node.getAttribute("data-vi-sort-value")),
      );
      expect(values.length).toBeGreaterThan(1);
      expect(values[0]).toBeGreaterThanOrEqual(values[values.length - 1] ?? 0);
    });

    await user.click(ascendingButton as HTMLElement);
    await waitFor(() => {
      const values = Array.from(preview?.querySelectorAll<HTMLElement>("[data-vi-sort-value]") ?? []).map((node) =>
        Number(node.getAttribute("data-vi-sort-value")),
      );
      expect(values[0]).toBeLessThanOrEqual(values[values.length - 1] ?? Number.MAX_SAFE_INTEGER);
    });

    const conceptSelect = await within(builder).findByLabelText("Concept");
    await user.selectOptions(conceptSelect as HTMLSelectElement, "footnote-popovers");

    await waitFor(() => {
      preview = builder.querySelector<HTMLElement>(".chunk-builder-preview");
      const footnoteButton = preview?.querySelector<HTMLElement>('[data-vi-component="footnote"]');
      expect(footnoteButton).not.toBeNull();
    });

    const footnoteButton = preview?.querySelector<HTMLElement>('[data-vi-component="footnote"]');
    const footnoteId = footnoteButton?.getAttribute("data-vi-footnote") ?? "";
    const footnotePopover = footnoteId
      ? preview?.querySelector<HTMLElement>(`[data-vi-footnote-popover="${footnoteId}"]`)
      : null;
    expect(footnotePopover).not.toBeNull();
    expect(footnotePopover?.hidden).toBe(true);

    await user.click(footnoteButton as HTMLElement);
    await waitFor(() => {
      expect(footnotePopover?.hidden).toBe(false);
      expect(footnoteButton?.getAttribute("aria-expanded")).toBe("true");
    });

    await user.click(document.body);
    await waitFor(() => {
      expect(footnotePopover?.hidden).toBe(true);
      expect(footnoteButton?.getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("surfaces advanced JavaScript personalization controls for snap gallery chunks", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);

    const chunkTypeSelect = root.getAllByLabelText("Chunk type")[0] as HTMLSelectElement;
    const chunkSelect = root.getAllByLabelText("Chunk")[0] as HTMLSelectElement;
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];

    await user.selectOptions(chunkTypeSelect, "javascript");
    await user.selectOptions(chunkSelect, "snap-gallery-strip");
    await user.click(addChunkButton);

    await waitFor(() => {
      const node = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="snap-gallery-strip-js"]');
      expect(node).not.toBeNull();
    });

    const insertedChunk = container.querySelector<HTMLElement>(
      'div[data-interactive-chunk="true"][data-template-id="snap-gallery-strip-js"]',
    );
    expect(insertedChunk).not.toBeNull();
    const insertedPreview = insertedChunk?.querySelector<HTMLElement>("[data-vi-preview-shell]");
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-selection-behavior="single"');
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-details-mode="single"');
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-show-status="true"');
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-navigation-wrap="true"');
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-hover-activation="false"');
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-highlight-intensity="balanced"');
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-status-on-load="true"');
    expect(insertedPreview?.innerHTML ?? "").toContain('data-vi-stagger-ms="40"');
    await user.click(insertedChunk as HTMLElement);

    await user.click(root.getByRole("button", { name: "Chunk builder" }));
    const builder = await findChunkBuilderShell(container);
    expect(within(builder).getAllByText("JavaScript").length).toBeGreaterThan(0);

    const conceptSelect = await within(builder).findByLabelText("Concept");
    await user.selectOptions(conceptSelect as HTMLSelectElement, "snap-gallery-strip");
    const variantSelect = await within(builder).findByLabelText("Variant");
    await user.selectOptions(variantSelect as HTMLSelectElement, "javascript");
    expect((variantSelect as HTMLSelectElement).value).toBe("javascript");
    const builderPreview = builder.querySelector<HTMLElement>(".chunk-builder-preview");
    await waitFor(() => {
      expect(builderPreview?.innerHTML ?? "").toContain('data-vi-component="snap-gallery"');
      expect(builderPreview?.innerHTML ?? "").not.toContain('data-vi-component="scroll-carousel"');
    });
  });

  it("supports dedicated chunk-builder editing across all 64 chunk contracts", async () => {
    const { container } = render(<App />);
    const editor = await waitForEditor(container);
    const root = within(container);
    const templateIds = INTERACTIVE_CHUNK_TEMPLATES.map((template) => template.id);

    for (let index = 0; index < templateIds.length; index += 1) {
      const templateId = templateIds[index];
      const chunkSelect = root.getAllByLabelText("Chunk")[0];
      const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];
      fireEvent.focus(editor);
      fireEvent.change(chunkSelect, { target: { value: templateId } });
      fireEvent.click(addChunkButton);

      await waitFor(() => {
        const node = container.querySelector<HTMLElement>(`div[data-interactive-chunk="true"][data-template-id="${templateId}"]`);
        expect(node).not.toBeNull();
      });

      const node = container.querySelector<HTMLElement>(`div[data-interactive-chunk="true"][data-template-id="${templateId}"]`);
      if (!node) {
        throw new Error(`Missing inserted chunk node for ${templateId}`);
      }

      fireEvent.click(root.getByRole("button", { name: "Chunk builder" }));

      const builder = await findChunkBuilderShell(container);
      const conceptInput = await within(builder).findByLabelText("Concept");
      expect((conceptInput as HTMLSelectElement).value).toBe(templateId);
      const chunkFieldControls = builder.querySelectorAll(
        ".chunk-field-stack .chunk-control, .chunk-field-stack .chunk-toggle, .chunk-field-stack .chunk-repeater",
      );
      expect(chunkFieldControls.length).toBeGreaterThan(0);

      fireEvent.click(within(builder).getByRole("button", { name: "Back to editor" }));
      await waitFor(() => {
        expect(container.querySelector(".chunk-builder-shell")).toBeNull();
      });
    }
  }, 180000);

  it("uses contextual checklist controls and updates checklist progress in preview", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitForEditor(container);
    const root = within(container);

    const chunkSelect = root.getAllByLabelText("Chunk")[0];
    const addChunkButton = root.getAllByRole("button", { name: "Add chunk" })[0];
    await user.selectOptions(chunkSelect as HTMLSelectElement, "checklist-progress");
    expect((chunkSelect as HTMLSelectElement).value).toBe("checklist-progress");
    await user.click(addChunkButton);

    await waitFor(() => {
      const node = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="checklist-progress"]');
      expect(node).not.toBeNull();
    });

    const node = container.querySelector<HTMLElement>('div[data-interactive-chunk="true"][data-template-id="checklist-progress"]');
    if (!node) {
      throw new Error("Checklist chunk node not found");
    }

    fireEvent.click(root.getByRole("button", { name: "Chunk builder" }));

    const builder = await findChunkBuilderShell(container);
    const conceptInput = await within(builder).findByLabelText("Concept");
    await waitFor(() => {
      expect((conceptInput as HTMLSelectElement).value).toBe("checklist-progress");
    });
    const completedToggle = builder.querySelector('.chunk-repeater-item .chunk-toggle input[type="checkbox"]');
    expect(completedToggle).not.toBeNull();
    expect(within(builder).queryByLabelText("Image URL")).toBeNull();

    fireEvent.click(within(builder).getByRole("button", { name: "Back to editor" }));
    await waitFor(() => {
      expect(container.querySelector(".chunk-builder-shell")).toBeNull();
    });

    const progressValue = await waitFor(() => {
      const element = node.querySelector<HTMLElement>("[data-vi-progress-value]");
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });

    const startingText = progressValue.textContent ?? "";
    const checkbox = node.querySelector<HTMLInputElement>('input[type="checkbox"][data-vi-check-item]');
    expect(checkbox).not.toBeNull();
    (checkbox as HTMLInputElement).checked = !(checkbox as HTMLInputElement).checked;
    fireEvent.change(checkbox as HTMLInputElement);

    await waitFor(() => {
      const nextText = progressValue.textContent ?? "";
      expect(nextText).not.toBe(startingText);
      expect(nextText).toMatch(/% complete/);
    });
  });
});

async function waitForEditor(container: HTMLElement) {
  await screen.findByDisplayValue("The best editor gives writing room to breathe");

  return await waitFor(() => {
    const editor = container.querySelector(".velvet-prosemirror") as HTMLElement | null;
    expect(editor).not.toBeNull();
    return editor as HTMLElement;
  });
}

async function findChunkBuilderShell(container: HTMLElement) {
  return await waitFor(() => {
    const shell = container.querySelector(".chunk-builder-shell");
    expect(shell).not.toBeNull();
    return shell as HTMLElement;
  });
}
