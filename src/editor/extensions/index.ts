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
    Table.configure({
      resizable: true,
      allowTableNodeSelection: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Superscript,
    CalloutNode,
    InteractiveChunkNode,
  ];
}
