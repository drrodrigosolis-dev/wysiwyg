import { mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

import { getChunkTemplate } from "../chunks/registry";
import {
  decodeChunkAttributeValue,
  normalizeInteractiveChunkAttrs,
  toDomChunkAttributes,
} from "../chunks/render";
import type { ChunkMode, ChunkRestriction, InteractiveChunkAttrs } from "../chunks/types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    interactiveChunk: {
      insertInteractiveChunk: (attrs: Partial<InteractiveChunkAttrs>) => ReturnType;
      updateInteractiveChunk: (attrs: Partial<InteractiveChunkAttrs>) => ReturnType;
    };
  }
}

export const InteractiveChunkNode = Node.create({
  name: "interactiveChunk",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      templateId: {
        default: "raw-html-block",
        parseHTML: (element: Element) => element.getAttribute("data-template-id") ?? "raw-html-block",
      },
      mode: {
        default: "structured",
        parseHTML: (element: Element) => {
          const mode = String(element.getAttribute("data-mode") ?? "structured");
          return mode === "raw" ? "raw" : "structured";
        },
      },
      dataJson: {
        default: "{}",
        parseHTML: (element: Element) => decodeChunkAttributeValue(element.getAttribute("data-data-json")) || "{}",
      },
      rawHtml: {
        default: "",
        parseHTML: (element: Element) => decodeChunkAttributeValue(element.getAttribute("data-raw-html")) || "",
      },
      version: {
        default: 1,
        parseHTML: (element: Element) => Number(element.getAttribute("data-version") ?? "1"),
      },
      restriction: {
        default: "strict",
        parseHTML: (element: Element) => {
          const restriction = String(element.getAttribute("data-restriction") ?? "strict");
          return restriction === "enhanced" ? "enhanced" : "strict";
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-interactive-chunk="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = normalizeInteractiveChunkAttrs({
      templateId: String(HTMLAttributes.templateId ?? "raw-html-block"),
      mode: (String(HTMLAttributes.mode ?? "structured") as ChunkMode) ?? "structured",
      dataJson: String(HTMLAttributes.dataJson ?? "{}"),
      rawHtml: String(HTMLAttributes.rawHtml ?? ""),
      version: Number(HTMLAttributes.version ?? 1),
      restriction: (String(HTMLAttributes.restriction ?? "strict") as ChunkRestriction) ?? "strict",
    });

    const template = getChunkTemplate(attrs.templateId);
    const label = template?.label ?? "Raw HTML Block";
    const engineLabel = template?.engine === "javascript" ? "JavaScript" : "Pure HTML";
    const compatibility = template
      ? `Strict ${template.compatibility.strictAllowlist} • Runtime ${template.compatibility.enhancedRuntime}`
      : "Strict unknown • Runtime optional";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        ...toDomChunkAttributes(attrs),
        contenteditable: "false",
      }),
      [
        "div",
        { class: "vi-chunk-shell" },
        [
          "div",
          { class: "vi-chunk-shell-head" },
          [
            "div",
            { class: "vi-chunk-shell-copy" },
            ["strong", { class: "vi-chunk-shell-title" }, label],
            ["small", { class: "vi-chunk-shell-meta" }, `${attrs.mode === "raw" ? "Raw HTML" : "Structured"} • ${engineLabel} • ${compatibility}`],
          ],
          [
            "div",
            { class: "vi-chunk-shell-actions" },
            ["button", { type: "button", "data-vi-editor-action": "edit", tabindex: "-1" }, "Edit"],
            ["button", { type: "button", "data-vi-editor-action": "toggle-mode", tabindex: "-1" }, attrs.mode === "raw" ? "Structured" : "Raw"],
            ["button", { type: "button", "data-vi-editor-action": "add-item", tabindex: "-1" }, "Add item"],
          ],
        ],
        ["div", { class: "vi-chunk-shell-preview", "data-vi-preview-shell": "true" }],
      ],
    ];
  },

  addCommands() {
    return {
      insertInteractiveChunk:
        (attrs) =>
        ({ state, dispatch }) => {
          const normalized = normalizeInteractiveChunkAttrs(attrs);
          const chunkType = state.schema.nodes[this.name];
          if (!chunkType) {
            return false;
          }

          const node = chunkType.create(normalized);
          const { from, to } = state.selection;
          const tr = state.tr.replaceRangeWith(from, to, node);
          const afterInsertion = Math.min(from + node.nodeSize, tr.doc.content.size);
          const nextSelection = TextSelection.near(tr.doc.resolve(afterInsertion), -1);
          tr.setSelection(nextSelection);
          dispatch?.(tr);
          return true;
        },
      updateInteractiveChunk:
        (attrs) =>
        ({ editor, tr, state, dispatch }) => {
          const normalized = normalizeInteractiveChunkAttrs({ ...editor.getAttributes(this.name), ...attrs });
          if (state.selection instanceof NodeSelection && state.selection.node.type.name === this.name) {
            tr.setNodeMarkup(state.selection.from, undefined, normalized);
            dispatch?.(tr);
            return true;
          }

          const topIndex = state.selection.$anchor.index(0);

          const positions = [topIndex, topIndex - 1, topIndex + 1].filter(
            (index) => index >= 0 && index < state.doc.childCount,
          );
          for (const candidateIndex of positions) {
            const candidateNode = state.doc.child(candidateIndex);
            if (candidateNode?.type.name !== this.name) {
              continue;
            }

            let position = 0;
            for (let index = 0; index < candidateIndex; index += 1) {
              position += state.doc.child(index).nodeSize;
            }

            tr.setNodeMarkup(position, undefined, normalized);
            dispatch?.(tr);
            return true;
          }

          let nearestIndex: number | null = null;
          let nearestDistance = Number.POSITIVE_INFINITY;
          for (let index = 0; index < state.doc.childCount; index += 1) {
            if (state.doc.child(index)?.type.name !== this.name) {
              continue;
            }
            const distance = Math.abs(index - topIndex);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = index;
            }
          }

          if (nearestIndex != null) {
            let position = 0;
            for (let index = 0; index < nearestIndex; index += 1) {
              position += state.doc.child(index).nodeSize;
            }

            tr.setNodeMarkup(position, undefined, normalized);
            dispatch?.(tr);
            return true;
          }

          return false;
        },
    };
  },
});
