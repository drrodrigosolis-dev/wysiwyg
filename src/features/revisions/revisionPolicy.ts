import type { JSONContent } from "@tiptap/core";

import type { EditorDocument, RevisionReason, RevisionSnapshot } from "../../lib/types";

export const SNAPSHOT_LIMIT = 50;

export function createSnapshot(document: EditorDocument, reason: RevisionReason): RevisionSnapshot {
  return {
    id: createId(),
    documentId: document.id,
    createdAt: new Date().toISOString(),
    reason,
    content: cloneJson(document.content),
  };
}

export function createStructureSignature(content: JSONContent): string {
  return (content.content ?? []).map((node) => getNodeSignature(node)).join("|");
}

export function pruneSnapshots(snapshots: RevisionSnapshot[], limit = SNAPSHOT_LIMIT): RevisionSnapshot[] {
  return [...snapshots]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

function getNodeSignature(node: JSONContent): string {
  const attrs = node.attrs
    ? Object.entries(node.attrs)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}:${String(value)}`)
        .join(",")
    : "";

  return `${node.type ?? "unknown"}(${attrs})`;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
