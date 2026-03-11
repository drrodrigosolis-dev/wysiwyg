import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (tone?: "note" | "warning" | "success") => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "note",
      },
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-background-color"),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { tone, backgroundColor, ...domAttributes } = HTMLAttributes;
    const normalizedBackgroundColor = String(backgroundColor ?? "").trim();

    return [
      "div",
      mergeAttributes(domAttributes, {
        "data-callout": "true",
        "data-tone": tone ?? "note",
        ...(normalizedBackgroundColor ? { "data-background-color": normalizedBackgroundColor } : {}),
        ...(normalizedBackgroundColor
          ? {
              style: `--callout-bg: ${normalizedBackgroundColor}; --callout-border: ${buildCalloutBorderColor(normalizedBackgroundColor)};`,
            }
          : {}),
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (tone = "note") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

function buildCalloutBorderColor(backgroundColor: string) {
  const parsed = parseColor(backgroundColor);
  if (!parsed) {
    return backgroundColor;
  }

  const alpha = Math.max(0.24, Math.min(0.82, parsed.a + 0.16));
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha.toFixed(2)})`;
}

function parseColor(value: string) {
  const rgbaMatch = value.match(/^rgba?\((.+)\)$/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map((part) => part.trim());
    if (parts.length >= 3) {
      return {
        r: clampChannel(Number(parts[0])),
        g: clampChannel(Number(parts[1])),
        b: clampChannel(Number(parts[2])),
        a: clampAlpha(Number(parts[3] ?? 1)),
      };
    }
  }

  const normalized = value.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(normalized.length) || /[^0-9a-f]/i.test(normalized)) {
    return null;
  }

  const expanded =
    normalized.length === 3 || normalized.length === 4
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
    a: expanded.length === 8 ? clampAlpha(Number.parseInt(expanded.slice(6, 8), 16) / 255) : 1,
  };
}

function clampChannel(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}
