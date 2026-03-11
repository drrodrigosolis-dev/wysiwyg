import type { JSONContent } from "@tiptap/core";

export function moveSection(content: JSONContent, fromIndex: number, toIndex: number): JSONContent {
  const nodes = [...(content.content ?? [])];

  if (!nodes[fromIndex] || !nodes[toIndex] || fromIndex === toIndex) {
    return content;
  }

  if (!isHeading(nodes[fromIndex]) || !isHeading(nodes[toIndex])) {
    return content;
  }

  const [sectionStart, sectionEnd] = getSectionRange(nodes, fromIndex);
  if (toIndex >= sectionStart && toIndex < sectionEnd) {
    return content;
  }

  const section = nodes.slice(sectionStart, sectionEnd);
  const remaining = nodes.slice(0, sectionStart).concat(nodes.slice(sectionEnd));
  let nextTargetIndex = toIndex;

  if (toIndex > sectionStart) {
    nextTargetIndex -= section.length;
  }

  remaining.splice(nextTargetIndex, 0, ...section);
  return { ...content, content: remaining };
}

export function moveTopLevelBlock(content: JSONContent, fromIndex: number, toIndex: number): JSONContent {
  const nodes = [...(content.content ?? [])];
  const moved = nodes[fromIndex];

  if (!moved || !nodes[toIndex] || fromIndex === toIndex) {
    return content;
  }

  nodes.splice(fromIndex, 1);
  nodes.splice(toIndex, 0, moved);
  return { ...content, content: nodes };
}

export function duplicateTopLevelBlock(content: JSONContent, index: number): JSONContent {
  const nodes = [...(content.content ?? [])];
  const node = nodes[index];

  if (!node) {
    return content;
  }

  nodes.splice(index + 1, 0, JSON.parse(JSON.stringify(node)) as JSONContent);
  return { ...content, content: nodes };
}

export function removeTopLevelBlock(content: JSONContent, index: number): JSONContent {
  const nodes = [...(content.content ?? [])];

  if (!nodes[index]) {
    return content;
  }

  nodes.splice(index, 1);
  return { ...content, content: nodes };
}

export function getSectionRange(nodes: JSONContent[], startIndex: number): [number, number] {
  const startNode = nodes[startIndex];
  if (!startNode || !isHeading(startNode)) {
    return [startIndex, startIndex + 1];
  }

  const level = Number(startNode.attrs?.level ?? 1);
  for (let index = startIndex + 1; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (isHeading(node) && Number(node.attrs?.level ?? 1) <= level) {
      return [startIndex, index];
    }
  }

  return [startIndex, nodes.length];
}

function isHeading(node: JSONContent | undefined): boolean {
  return node?.type === "heading";
}
