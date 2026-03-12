import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
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

const StyledTable = Table.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
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

          return {
            style: `--table-grid-color: ${attributes.borderColor}`,
          };
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
        renderHTML: (attributes) => {
          const numeric = Number(attributes.cellPaddingPx);
          if (!Number.isFinite(numeric)) {
            return {};
          }
          return {
            style: `--table-cell-padding: ${Math.max(0, Math.round(numeric))}px`,
          };
        },
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
        renderHTML: (attributes) => {
          const numeric = Number(attributes.marginYPx);
          if (!Number.isFinite(numeric)) {
            return {};
          }
          return {
            style: `--table-margin-y: ${Math.max(0, Math.round(numeric))}px`,
          };
        },
      },
    };
  },
});

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
    }),
    TableRow,
    StyledTableHeader,
    StyledTableCell,
    Superscript,
    CalloutNode,
    InteractiveChunkNode,
  ];
}
