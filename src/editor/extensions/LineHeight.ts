import { Extension } from "@tiptap/core";

type LineHeightOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",

  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const lineHeight = element.style.lineHeight?.trim();
              return lineHeight ? lineHeight : null;
            },
            renderHTML: (attributes) => {
              const lineHeight = String(attributes.lineHeight ?? "").trim();
              if (!lineHeight) {
                return {};
              }

              return {
                style: `line-height: ${lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          this.options.types.reduce<boolean>(
            (applied, type) => commands.updateAttributes(type, { lineHeight }) || applied,
            false,
          ),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.reduce<boolean>(
            (applied, type) => commands.resetAttributes(type, "lineHeight") || applied,
            false,
          ),
    };
  },
});
