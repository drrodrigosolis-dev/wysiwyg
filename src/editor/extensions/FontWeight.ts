import { Extension } from "@tiptap/core";

type FontWeightOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontWeight: {
      setFontWeight: (fontWeight: string) => ReturnType;
      unsetFontWeight: () => ReturnType;
    };
  }
}

export const FontWeight = Extension.create<FontWeightOptions>({
  name: "fontWeight",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element) => {
              const fontWeight = element.style.fontWeight?.trim();
              return fontWeight ? fontWeight : null;
            },
            renderHTML: (attributes) => {
              const fontWeight = String(attributes.fontWeight ?? "").trim();
              if (!fontWeight) {
                return {};
              }

              return {
                style: `font-weight: ${fontWeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontWeight:
        (fontWeight) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontWeight }).run(),
      unsetFontWeight:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontWeight: null }).removeEmptyTextStyle().run(),
    };
  },
});
