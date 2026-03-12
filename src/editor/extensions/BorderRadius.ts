import { Extension } from "@tiptap/core";

type BorderRadiusOptions = {
  types: string[];
};

export const BorderRadius = Extension.create<BorderRadiusOptions>({
  name: "borderRadius",

  addOptions() {
    return {
      types: [
        "paragraph",
        "heading",
        "blockquote",
        "codeBlock",
        "bulletList",
        "orderedList",
        "taskList",
        "table",
        "tableCell",
        "tableHeader",
        "callout",
        "interactiveChunk",
      ],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          borderRadiusPx: {
            default: null,
            parseHTML: (element) => parseBorderRadius(element.style.borderRadius),
            renderHTML: (attributes) => {
              const borderRadiusPx = normalizeBorderRadius(attributes.borderRadiusPx);
              if (borderRadiusPx === null) {
                return {};
              }

              return {
                style: `border-radius: ${borderRadiusPx}px`,
              };
            },
          },
        },
      },
    ];
  },
});

function parseBorderRadius(value: string) {
  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.round(parsed));
}

function normalizeBorderRadius(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.round(parsed));
}
