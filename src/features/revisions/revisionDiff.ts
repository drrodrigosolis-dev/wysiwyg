import type { JSONContent } from "@tiptap/core";
import { diffArrays, diffWords } from "diff";

import { getChunkTemplate } from "../../editor/chunks/registry";

import type { RevisionDiffBlock } from "../../lib/types";

type FlatBlock = {
  type: string;
  text: string;
};

export function flattenBlocks(content: JSONContent): FlatBlock[] {
  return (content.content ?? [])
    .map((node) => ({
      type: node.type ?? "unknown",
      text: normalizeWhitespace(renderNodeText(node)),
    }))
    .filter((block) => block.text.length > 0 || block.type === "horizontalRule");
}

export function buildRevisionDiff(current: JSONContent, snapshot: JSONContent): RevisionDiffBlock[] {
  const before = flattenBlocks(snapshot);
  const after = flattenBlocks(current);
  const beforeKeys = before.map((block) => fingerprint(block));
  const afterKeys = after.map((block) => fingerprint(block));
  const chunks = diffArrays(beforeKeys, afterKeys);

  const diff: RevisionDiffBlock[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    if (!chunk.added && !chunk.removed) {
      chunk.value.forEach(() => {
        const block = before[beforeIndex];
        diff.push({ kind: "equal", type: block.type, text: block.text });
        beforeIndex += 1;
        afterIndex += 1;
      });
      continue;
    }

    if (chunk.removed && chunks[index + 1]?.added) {
      const removedCount = chunk.value.length;
      const addedChunk = chunks[index + 1];
      const addedCount = addedChunk.value.length;
      const pairCount = Math.min(removedCount, addedCount);

      for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        const previousBlock = before[beforeIndex];
        const nextBlock = after[afterIndex];

        if (previousBlock.type === nextBlock.type) {
          diff.push({
            kind: "change",
            type: nextBlock.type,
            before: previousBlock.text,
            after: nextBlock.text,
            segments: diffWords(previousBlock.text, nextBlock.text),
          });
        } else {
          diff.push({ kind: "delete", type: previousBlock.type, text: previousBlock.text });
          diff.push({ kind: "insert", type: nextBlock.type, text: nextBlock.text });
        }

        beforeIndex += 1;
        afterIndex += 1;
      }

      for (let pairIndex = pairCount; pairIndex < removedCount; pairIndex += 1) {
        const block = before[beforeIndex];
        diff.push({ kind: "delete", type: block.type, text: block.text });
        beforeIndex += 1;
      }

      for (let pairIndex = pairCount; pairIndex < addedCount; pairIndex += 1) {
        const block = after[afterIndex];
        diff.push({ kind: "insert", type: block.type, text: block.text });
        afterIndex += 1;
      }

      index += 1;
      continue;
    }

    if (chunk.removed) {
      chunk.value.forEach(() => {
        const block = before[beforeIndex];
        diff.push({ kind: "delete", type: block.type, text: block.text });
        beforeIndex += 1;
      });
      continue;
    }

    if (chunk.added) {
      chunk.value.forEach(() => {
        const block = after[afterIndex];
        diff.push({ kind: "insert", type: block.type, text: block.text });
        afterIndex += 1;
      });
    }
  }

  return diff;
}

function fingerprint(block: FlatBlock): string {
  return `${block.type}:${block.text}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function renderNodeText(node: JSONContent | undefined): string {
  if (!node) {
    return "";
  }

  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  if (node.type === "taskItem") {
    const marker = node.attrs?.checked ? "[x] " : "[ ] ";
    return marker + (node.content ?? []).map(renderNodeText).join(" ");
  }

  if (node.type === "tableRow") {
    return (node.content ?? []).map(renderNodeText).join(" | ");
  }

  if (node.type === "table") {
    return (node.content ?? []).map(renderNodeText).join("\n");
  }

  if (node.type === "callout") {
    return `${String(node.attrs?.tone ?? "note").toUpperCase()}: ${(node.content ?? []).map(renderNodeText).join(" ")}`;
  }

  if (node.type === "interactiveChunk") {
    const templateId = String(node.attrs?.templateId ?? "");
    const mode = String(node.attrs?.mode ?? "structured");
    const template = getChunkTemplate(templateId);
    const label = template?.label ?? (templateId || "interactive chunk");
    return `${mode === "raw" ? "RAW" : "CHUNK"}: ${label}`;
  }

  return (node.content ?? []).map(renderNodeText).join(" ");
}
