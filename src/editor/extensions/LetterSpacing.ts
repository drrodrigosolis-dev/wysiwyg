import { Extension } from "@tiptap/core";

type LetterSpacingOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    letterSpacing: {
      setLetterSpacing: (letterSpacing: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
  }
}

export const LetterSpacing = Extension.create<LetterSpacingOptions>({
  name: "letterSpacing",

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
          letterSpacing: {
            default: null,
            parseHTML: (element) => {
              const letterSpacing = element.style.letterSpacing?.trim();
              return letterSpacing ? letterSpacing : null;
            },
            renderHTML: (attributes) => {
              const letterSpacing = String(attributes.letterSpacing ?? "").trim();
              if (!letterSpacing) {
                return {};
              }

              return {
                style: `letter-spacing: ${letterSpacing}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing) =>
        ({ chain }) =>
          chain().setMark("textStyle", { letterSpacing }).run(),
      unsetLetterSpacing:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { letterSpacing: null }).removeEmptyTextStyle().run(),
    };
  },
});
