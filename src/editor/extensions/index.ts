import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Superscript from "@tiptap/extension-superscript";
import { Table, TableView, updateColumns } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import { CalloutNode } from "./CalloutNode";
import { FontFamily } from "./FontFamily";
import { FontSize } from "./FontSize";
import { InteractiveChunkNode } from "./InteractiveChunkNode";
import { LetterSpacing } from "./LetterSpacing";
import { LineHeight } from "./LineHeight";
import { FontWeight } from "./FontWeight";

class StyledTableView extends TableView {
  update(node: any) {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    if (typeof node.attrs?.style === "string" && node.attrs.style.trim().length > 0) {
      this.table.style.cssText = node.attrs.style;
    } else {
      this.table.removeAttribute("style");
    }
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }
}

const StyledTable = Table.extend({
  renderHTML({ node, HTMLAttributes }): any {
    const rendered = this.parent?.({ node, HTMLAttributes }) ?? ["table", HTMLAttributes, ["tbody", 0]];
    if (!Array.isArray(rendered)) {
      return rendered;
    }

    const tableSpec =
      rendered[0] === "div" && Array.isArray(rendered[2]) && rendered[2][0] === "table" ? rendered[2] : rendered;
    if (!Array.isArray(tableSpec) || tableSpec[0] !== "table") {
      return rendered;
    }

    const tableAttrs =
      tableSpec[1] && typeof tableSpec[1] === "object" && !Array.isArray(tableSpec[1])
        ? { ...(tableSpec[1] as Record<string, unknown>) }
        : {};

    const styleParts: string[] = [];
    const existingStyle = typeof tableAttrs.style === "string" ? tableAttrs.style.trim() : "";
    if (existingStyle) {
      styleParts.push(existingStyle);
    }

    const borderColor = typeof node.attrs.borderColor === "string" ? node.attrs.borderColor.trim() : "";
    if (borderColor) {
      styleParts.push(`--table-grid-color: ${borderColor}`);
    }

    const legacyCellPadding = normalizeTableSpace(node.attrs.cellPaddingPx);
    const cellPaddingTop = normalizeTableSpace(node.attrs.cellPaddingTopPx) ?? legacyCellPadding;
    const cellPaddingRight = normalizeTableSpace(node.attrs.cellPaddingRightPx) ?? legacyCellPadding;
    const cellPaddingBottom = normalizeTableSpace(node.attrs.cellPaddingBottomPx) ?? legacyCellPadding;
    const cellPaddingLeft = normalizeTableSpace(node.attrs.cellPaddingLeftPx) ?? legacyCellPadding;
    if (cellPaddingTop !== null) {
      styleParts.push(`--table-cell-padding-top: ${cellPaddingTop}px`);
    }
    if (cellPaddingRight !== null) {
      styleParts.push(`--table-cell-padding-right: ${cellPaddingRight}px`);
    }
    if (cellPaddingBottom !== null) {
      styleParts.push(`--table-cell-padding-bottom: ${cellPaddingBottom}px`);
    }
    if (cellPaddingLeft !== null) {
      styleParts.push(`--table-cell-padding-left: ${cellPaddingLeft}px`);
    }

    const legacyMarginY = normalizeTableSpace(node.attrs.marginYPx);
    const marginTop = normalizeTableSpace(node.attrs.marginTopPx) ?? legacyMarginY;
    const marginRight = normalizeTableSpace(node.attrs.marginRightPx);
    const marginBottom = normalizeTableSpace(node.attrs.marginBottomPx) ?? legacyMarginY;
    const marginLeft = normalizeTableSpace(node.attrs.marginLeftPx);
    if (marginTop !== null) {
      styleParts.push(`--table-margin-top: ${marginTop}px`);
    }
    if (marginRight !== null) {
      styleParts.push(`--table-margin-right: ${marginRight}px`);
    }
    if (marginBottom !== null) {
      styleParts.push(`--table-margin-bottom: ${marginBottom}px`);
    }
    if (marginLeft !== null) {
      styleParts.push(`--table-margin-left: ${marginLeft}px`);
    }

    tableAttrs.style = styleParts.join("; ");
    tableSpec[1] = tableAttrs;
    return rendered;
  },

  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      style: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("style");
          return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
        },
        renderHTML: () => ({}),
      },
      borderColor: {
        default: null,
        parseHTML: (element) => {
          const variableValue = element.style.getPropertyValue("--table-grid-color").trim();
          if (variableValue) {
            return variableValue;
          }

          const borderValue = element.style.borderColor.trim();
          return borderValue || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.borderColor) {
            return {};
          }

          return {};
        },
      },
      cellPaddingPx: {
        default: null,
        parseHTML: (element) => {
          const rawValue = element.style.getPropertyValue("--table-cell-padding").trim();
          const numeric = Number.parseFloat(rawValue);
          if (!Number.isFinite(numeric)) {
            return null;
          }
          return Math.max(0, Math.round(numeric));
        },
        renderHTML: () => ({}),
      },
      marginYPx: {
        default: null,
        parseHTML: (element) => {
          const rawValue = element.style.getPropertyValue("--table-margin-y").trim();
          const numeric = Number.parseFloat(rawValue);
          if (!Number.isFinite(numeric)) {
            return null;
          }
          return Math.max(0, Math.round(numeric));
        },
        renderHTML: () => ({}),
      },
      cellPaddingTopPx: {
        default: null,
        parseHTML: (element) =>
          parseTableSpaceVariable(element, "--table-cell-padding-top", parseTableSpaceVariable(element, "--table-cell-padding")),
        renderHTML: () => ({}),
      },
      cellPaddingRightPx: {
        default: null,
        parseHTML: (element) =>
          parseTableSpaceVariable(element, "--table-cell-padding-right", parseTableSpaceVariable(element, "--table-cell-padding")),
        renderHTML: () => ({}),
      },
      cellPaddingBottomPx: {
        default: null,
        parseHTML: (element) =>
          parseTableSpaceVariable(element, "--table-cell-padding-bottom", parseTableSpaceVariable(element, "--table-cell-padding")),
        renderHTML: () => ({}),
      },
      cellPaddingLeftPx: {
        default: null,
        parseHTML: (element) =>
          parseTableSpaceVariable(element, "--table-cell-padding-left", parseTableSpaceVariable(element, "--table-cell-padding")),
        renderHTML: () => ({}),
      },
      marginTopPx: {
        default: null,
        parseHTML: (element) =>
          parseTableSpaceVariable(element, "--table-margin-top", parseTableSpaceVariable(element, "--table-margin-y")),
        renderHTML: () => ({}),
      },
      marginRightPx: {
        default: null,
        parseHTML: (element) => parseTableSpaceVariable(element, "--table-margin-right"),
        renderHTML: () => ({}),
      },
      marginBottomPx: {
        default: null,
        parseHTML: (element) =>
          parseTableSpaceVariable(element, "--table-margin-bottom", parseTableSpaceVariable(element, "--table-margin-y")),
        renderHTML: () => ({}),
      },
      marginLeftPx: {
        default: null,
        parseHTML: (element) => parseTableSpaceVariable(element, "--table-margin-left"),
        renderHTML: () => ({}),
      },
    };
  },
});

function parseTableSpaceVariable(element: HTMLElement, variableName: string, fallback: number | null = null) {
  const rawValue = element.style.getPropertyValue(variableName).trim();
  const numeric = Number.parseFloat(rawValue);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.round(numeric));
}

function normalizeTableSpace(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(0, Math.round(numeric));
}

const StyledTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      backgroundColor: {
        default: null,
        parseHTML: (element) => {
          const value = element.style.backgroundColor.trim();
          return value || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }

          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      borderColor: {
        default: null,
        parseHTML: (element) => {
          const value = element.style.borderColor.trim();
          return value || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.borderColor) {
            return {};
          }

          return {
            style: `border-color: ${attributes.borderColor}`,
          };
        },
      },
    };
  },
});

const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      backgroundColor: {
        default: null,
        parseHTML: (element) => {
          const value = element.style.backgroundColor.trim();
          return value || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }

          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      borderColor: {
        default: null,
        parseHTML: (element) => {
          const value = element.style.borderColor.trim();
          return value || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.borderColor) {
            return {};
          }

          return {
            style: `border-color: ${attributes.borderColor}`,
          };
        },
      },
    };
  },
});

export function buildEditorExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      bulletList: {
        keepMarks: true,
      },
      orderedList: {
        keepMarks: true,
      },
    }),
    TextStyle,
    FontFamily,
    FontSize,
    FontWeight,
    LetterSpacing,
    Color,
    Underline,
    Highlight.configure({
      multicolor: true,
    }),
    Link.configure({
      autolink: true,
      openOnClick: false,
      defaultProtocol: "https",
    }),
    Placeholder.configure({
      placeholder: ({ node }) => (node.type.name === "heading" ? "Give the section a title." : "Write the sentence that matters."),
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    LineHeight,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    StyledTable.configure({
      resizable: true,
      allowTableNodeSelection: false,
      lastColumnResizable: true,
      View: StyledTableView,
    }),
    TableRow,
    StyledTableHeader,
    StyledTableCell,
    Superscript,
    CalloutNode,
    InteractiveChunkNode,
  ];
}
