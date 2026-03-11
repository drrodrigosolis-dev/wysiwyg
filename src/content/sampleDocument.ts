import type { EditorDocument } from "../lib/types";

const now = new Date().toISOString();

export const sampleDocument: EditorDocument = {
  id: "local-default",
  title: "The best editor gives writing room to breathe",
  wordGoal: 900,
  characterGoal: 5400,
  accent: "ember",
  focusMode: false,
  typewriterMode: false,
  updatedAt: now,
  content: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, textAlign: null },
        content: [{ type: "text", text: "The editor should feel like gravity and velvet" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Great writing tools do two jobs at once: they disappear while you are drafting, and they step forward with exactly the right move when you need structure.",
          },
        ],
      },
      {
        type: "callout",
        attrs: { tone: "note" },
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "North star." },
              {
                type: "text",
                text: " The interface should make strong writing feel inevitable, not ornamental.",
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2, textAlign: null },
        content: [{ type: "text", text: "What makes this page different" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "You get a typographic canvas that feels editorial, a command deck that rewards momentum, and a live outline so large drafts never become a maze.",
          },
        ],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Use the toolbar for direct formatting." }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Open the command palette with Cmd/Ctrl+K." }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Create a checkpoint before risky edits." }] }],
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "The best WYSIWYG editor is not busy. It is lucid, confident, and fast enough that language stays in the foreground.",
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2, textAlign: null },
        content: [{ type: "text", text: "Take it for a spin" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Replace this sample text, switch the accent palette, drag sections in the outline, and compare revisions as the draft evolves.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3, textAlign: null },
        content: [{ type: "text", text: "Footnotes" }],
      },
      {
        type: "orderedList",
        attrs: { start: 1 },
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Velvet Ink favors visible craft over maximal chrome.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
