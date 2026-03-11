import type { JSONContent } from "@tiptap/core";

import type { StatsSnapshot } from "./types";

export function computeStats(content: JSONContent): StatsSnapshot {
  const text = collectText(content).replace(/\s+/g, " ").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const charactersWithSpaces = text.length;
  const charactersWithoutSpaces = text.replace(/\s/g, "").length;
  const paragraphs = countNodes(content, new Set(["paragraph", "blockquote", "callout", "interactiveChunk"]));
  const headings = countNodes(content, new Set(["heading"]));
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const averageWordsPerSentence = words / Math.max(sentences.length, 1);

  let cadenceLabel: StatsSnapshot["cadenceLabel"] = "Quiet";
  if (words > 0) {
    cadenceLabel = "Balanced";
    if (averageWordsPerSentence < 10) {
      cadenceLabel = "Swift";
    } else if (averageWordsPerSentence > 22) {
      cadenceLabel = "Lush";
    }
  }

  return {
    words,
    charactersWithSpaces,
    charactersWithoutSpaces,
    paragraphs,
    headings,
    readMinutes: Math.max(1, Math.ceil(words / 220)),
    cadenceLabel,
    cadenceRatio: Math.min(100, Math.max(words > 0 ? 12 : 0, (averageWordsPerSentence / 26) * 100)),
  };
}

export function collectText(node: JSONContent | undefined): string {
  if (!node) {
    return "";
  }

  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  return (node.content ?? []).map(collectText).join(node.type === "paragraph" ? " " : " ");
}

function countNodes(node: JSONContent | undefined, types: Set<string>): number {
  if (!node) {
    return 0;
  }

  const ownCount = node.type && types.has(node.type) ? 1 : 0;
  return ownCount + (node.content ?? []).reduce((sum, child) => sum + countNodes(child, types), 0);
}
