import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export type SearchMatch = {
  from: number;
  to: number;
  excerpt: string;
};

export type SearchMatchOptions = {
  caseSensitive?: boolean;
  wholeWord?: boolean;
};

const WORD_CHAR_PATTERN = /[A-Za-z0-9_]/;

export function findMatches(doc: ProseMirrorNode, query: string, options: SearchMatchOptions = {}): SearchMatch[] {
  const trimmedQuery = query.trim();
  const needle = options.caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase();
  if (!needle) {
    return [];
  }

  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) {
      return;
    }

    const text = node.text ?? "";
    const haystack = options.caseSensitive ? text : text.toLowerCase();
    let index = haystack.indexOf(needle);

    while (index !== -1) {
      if (options.wholeWord && !isWholeWordMatch(text, index, needle.length)) {
        index = haystack.indexOf(needle, index + 1);
        continue;
      }

      matches.push({
        from: pos + index,
        to: pos + index + needle.length,
        excerpt: text.slice(Math.max(0, index - 18), Math.min(text.length, index + needle.length + 18)),
      });

      index = haystack.indexOf(needle, index + needle.length);
    }
  });

  return matches;
}

function isWholeWordMatch(text: string, start: number, length: number): boolean {
  const before = start > 0 ? text[start - 1] : "";
  const after = start + length < text.length ? text[start + length] : "";
  const beforeIsWord = before ? WORD_CHAR_PATTERN.test(before) : false;
  const afterIsWord = after ? WORD_CHAR_PATTERN.test(after) : false;
  return !beforeIsWord && !afterIsWord;
}

export function selectMatch(editor: Editor, match: SearchMatch): void {
  editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).run();
}

export function replaceCurrentMatch(editor: Editor, match: SearchMatch, replacement: string): void {
  const transaction = editor.state.tr.insertText(replacement, match.from, match.to);
  editor.view.dispatch(transaction);
}

export function replaceAllMatches(editor: Editor, matches: SearchMatch[], replacement: string): number {
  if (matches.length === 0) {
    return 0;
  }

  const transaction = editor.state.tr;
  [...matches]
    .sort((left, right) => right.from - left.from)
    .forEach((match) => {
      transaction.insertText(replacement, match.from, match.to);
    });

  editor.view.dispatch(transaction);
  return matches.length;
}
