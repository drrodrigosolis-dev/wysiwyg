import type { JSONContent } from "@tiptap/core";

export type AccentName = "ember" | "tide" | "moss" | "rose" | "gold" | "slate";

export type EditorDocument = {
  id: "local-default";
  title: string;
  content: JSONContent;
  wordGoal: number;
  characterGoal: number;
  accent: AccentName;
  focusMode: boolean;
  typewriterMode: boolean;
  updatedAt: string;
};

export type RevisionReason = "autosave" | "manual-checkpoint" | "restore";

export type RevisionSnapshot = {
  id: string;
  documentId: "local-default";
  createdAt: string;
  reason: RevisionReason;
  content: JSONContent;
};

export type CommandAction = {
  id: string;
  label: string;
  group: "format" | "insert" | "navigate" | "revision";
  shortcut?: string;
};

export type OutlineItem = {
  key: string;
  pos: number;
  level: number;
  text: string;
  topLevelIndex: number;
};

export type StatsSnapshot = {
  words: number;
  charactersWithSpaces: number;
  charactersWithoutSpaces: number;
  paragraphs: number;
  headings: number;
  readMinutes: number;
  cadenceLabel: "Quiet" | "Swift" | "Balanced" | "Lush";
  cadenceRatio: number;
};

export type RevisionDiffBlock =
  | {
      kind: "equal";
      type: string;
      text: string;
    }
  | {
      kind: "insert" | "delete";
      type: string;
      text: string;
    }
  | {
      kind: "change";
      type: string;
      before: string;
      after: string;
      segments: Array<{ value: string; added?: boolean; removed?: boolean }>;
    };
