export type HtmlTokenKind =
  | "tag-punct"
  | "tag-name"
  | "attr-name"
  | "attr-equals"
  | "attr-value"
  | "text"
  | "comment";

export type HtmlToken = {
  kind: HtmlTokenKind;
  value: string;
};

export type HtmlCodeLine = {
  indent: number;
  tokens: HtmlToken[];
  blank?: boolean;
};

export type HtmlCodeLayoutMode = "paragraphs" | "oneline";

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const CHUNK_TAGS = new Set([
  "article",
  "aside",
  "blockquote",
  "div",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

export function formatHtmlForCodeView(source: string, mode: HtmlCodeLayoutMode = "paragraphs"): HtmlCodeLine[] {
  if (typeof document === "undefined") {
    return buildFallbackLines(source, mode);
  }

  const container = document.createElement("div");
  container.innerHTML = source;
  const nodes = Array.from(container.childNodes).filter(isMeaningfulNode);

  if (nodes.length === 0) {
    return [];
  }

  if (mode === "oneline") {
    return buildOneLine(nodes);
  }

  const lines: HtmlCodeLine[] = [];

  nodes.forEach((node, index) => {
    serializeNode(node, 0, lines);

    const next = nodes[index + 1];
    if (next && shouldBreakBetween(node, next)) {
      lines.push({ indent: 0, tokens: [], blank: true });
    }
  });

  return trimBlankLines(lines);
}

function buildOneLine(nodes: ChildNode[]) {
  const tokens: HtmlToken[] = [];
  nodes.forEach((node) => serializeNodeInline(node, tokens));
  const normalizedTokens = normalizeInlineTokens(tokens);

  if (normalizedTokens.length === 0) {
    return [];
  }

  return [
    {
      indent: 0,
      tokens: normalizedTokens,
    },
  ];
}

function serializeNode(node: ChildNode, depth: number, lines: HtmlCodeLine[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const textValue = normalizeText(node.textContent ?? "");
    if (!textValue) {
      return;
    }

    lines.push({
      indent: depth,
      tokens: [{ kind: "text", value: textValue }],
    });
    return;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    lines.push({
      indent: depth,
      tokens: [{ kind: "comment", value: `<!-- ${normalizeText(node.textContent ?? "")} -->` }],
    });
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).filter(isMeaningfulNode);

  lines.push({
    indent: depth,
    tokens: buildOpeningTagTokens(element),
  });

  if (VOID_TAGS.has(tagName)) {
    return;
  }

  children.forEach((child, index) => {
    serializeNode(child, depth + 1, lines);

    const next = children[index + 1];
    if (next && shouldBreakBetween(child, next)) {
      lines.push({ indent: 0, tokens: [], blank: true });
    }
  });

  lines.push({
    indent: depth,
    tokens: buildClosingTagTokens(tagName),
  });
}

function serializeNodeInline(node: ChildNode, tokens: HtmlToken[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const textValue = normalizeInlineText(node.textContent ?? "");
    if (!textValue) {
      return;
    }

    tokens.push({ kind: "text", value: textValue });
    return;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    const comment = normalizeText(node.textContent ?? "");
    tokens.push({ kind: "comment", value: `<!-- ${comment} -->` });
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  tokens.push(...buildOpeningTagTokens(element));

  if (VOID_TAGS.has(tagName)) {
    return;
  }

  const children = Array.from(element.childNodes).filter(isMeaningfulNode);
  children.forEach((child) => serializeNodeInline(child, tokens));

  tokens.push(...buildClosingTagTokens(tagName));
}

function buildOpeningTagTokens(element: Element): HtmlToken[] {
  const tagName = element.tagName.toLowerCase();
  const tokens: HtmlToken[] = [
    { kind: "tag-punct", value: "<" },
    { kind: "tag-name", value: tagName },
  ];

  Array.from(element.attributes).forEach((attribute) => {
    tokens.push({ kind: "text", value: " " });
    tokens.push({ kind: "attr-name", value: attribute.name });

    if (attribute.value !== "") {
      tokens.push({ kind: "attr-equals", value: "=" });
      tokens.push({ kind: "attr-value", value: `"${attribute.value}"` });
    }
  });

  tokens.push({ kind: "tag-punct", value: ">" });
  return tokens;
}

function buildClosingTagTokens(tagName: string): HtmlToken[] {
  return [
    { kind: "tag-punct", value: "</" },
    { kind: "tag-name", value: tagName },
    { kind: "tag-punct", value: ">" },
  ];
}

function shouldBreakBetween(left: ChildNode, right: ChildNode) {
  return isChunkNode(left) && isChunkNode(right);
}

function isChunkNode(node: ChildNode) {
  return node.nodeType === Node.ELEMENT_NODE && CHUNK_TAGS.has((node as Element).tagName.toLowerCase());
}

function isMeaningfulNode(node: ChildNode) {
  if (node.nodeType !== Node.TEXT_NODE) {
    return true;
  }

  return normalizeText(node.textContent ?? "") !== "";
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ");
}

function normalizeInlineTokens(tokens: HtmlToken[]) {
  const compacted: HtmlToken[] = [];

  tokens.forEach((token) => {
    if (token.kind === "text") {
      if (!token.value) {
        return;
      }

      const previous = compacted[compacted.length - 1];
      if (previous?.kind === "text") {
        previous.value += token.value;
      } else {
        compacted.push({ ...token });
      }
      return;
    }

    compacted.push({ ...token });
  });

  const first = compacted[0];
  if (first?.kind === "text") {
    first.value = first.value.replace(/^\s+/, "");
  }

  const last = compacted[compacted.length - 1];
  if (last?.kind === "text") {
    last.value = last.value.replace(/\s+$/, "");
  }

  return compacted.filter((token) => token.kind !== "text" || token.value.length > 0);
}

function trimBlankLines(lines: HtmlCodeLine[]) {
  const compacted: HtmlCodeLine[] = [];

  lines.forEach((line) => {
    if (line.blank && compacted[compacted.length - 1]?.blank) {
      return;
    }
    compacted.push(line);
  });

  while (compacted[0]?.blank) {
    compacted.shift();
  }

  while (compacted[compacted.length - 1]?.blank) {
    compacted.pop();
  }

  return compacted;
}

function buildFallbackLines(source: string, mode: HtmlCodeLayoutMode): HtmlCodeLine[] {
  if (mode === "oneline") {
    const value = source.replace(/\s+/g, " ").trim();
    if (!value) {
      return [];
    }

    return [
      {
        indent: 0,
        tokens: [{ kind: "text", value }],
      },
    ];
  }

  const lines = source.split(/\r?\n/);
  return lines.map((line) => ({
    indent: 0,
    tokens: [{ kind: "text", value: line }],
  }));
}
