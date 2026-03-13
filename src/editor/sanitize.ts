const allowedTags = new Set([
  "A",
  "ARTICLE",
  "ASIDE",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CAPTION",
  "CODE",
  "COL",
  "COLGROUP",
  "DIV",
  "EM",
  "FIGCAPTION",
  "FIGURE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HR",
  "I",
  "IMG",
  "LI",
  "MARK",
  "OL",
  "P",
  "PRE",
  "S",
  "SECTION",
  "SMALL",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);

const blockedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "META", "LINK", "BASE", "FORM"]);

const allowedAttributes = new Set([
  "alt",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "caption",
  "class",
  "colspan",
  "dir",
  "height",
  "href",
  "id",
  "lang",
  "rel",
  "role",
  "rowspan",
  "scope",
  "src",
  "start",
  "style",
  "target",
  "title",
  "type",
  "width",
]);

const blockedStylePatterns = ["expression(", "javascript:", "vbscript:", "behavior(", "@import"];

export function sanitizePastedHtml(html: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const sanitizedRoot = cleanChildren(document.body, document);
  const container = document.createElement("div");
  container.append(...sanitizedRoot);
  return container.innerHTML;
}

function cleanChildren(parent: HTMLElement, document: Document): Node[] {
  return Array.from(parent.childNodes).flatMap((node) => cleanNode(node, document));
}

function cleanNode(node: Node, document: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [document.createTextNode(node.textContent ?? "")];
  }

  if (!(node instanceof HTMLElement)) {
    return [];
  }

  const tagName = node.tagName.toUpperCase();
  if (blockedTags.has(tagName)) {
    return [];
  }

  if (!allowedTags.has(tagName)) {
    return cleanChildren(node, document);
  }

  const element = document.createElement(tagName.toLowerCase());
  Array.from(node.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    if (!isAllowedAttribute(attributeName)) {
      return;
    }

    if (attributeName === "style") {
      const sanitizedStyle = sanitizeStyle(attribute.value);
      if (sanitizedStyle) {
        element.setAttribute(attribute.name, sanitizedStyle);
      }
      return;
    }

    if (attributeName === "href" || attributeName === "src") {
      const sanitizedUrl = sanitizeUrl(attribute.value);
      if (sanitizedUrl) {
        element.setAttribute(attribute.name, sanitizedUrl);
      }
      return;
    }

    element.setAttribute(attribute.name, attribute.value);
  });
  element.append(...cleanChildren(node, document));
  return [element];
}

function isAllowedAttribute(attributeName: string): boolean {
  if (attributeName.startsWith("on")) {
    return false;
  }

  return allowedAttributes.has(attributeName) || attributeName.startsWith("data-") || attributeName.startsWith("aria-");
}

function sanitizeStyle(style: string): string {
  if (!style.trim()) {
    return "";
  }

  const safeDeclarations = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .flatMap((declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex <= 0) {
        return [];
      }

      const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
      const value = declaration.slice(separatorIndex + 1).trim();
      const normalizedValue = value.toLowerCase();
      if (blockedStylePatterns.some((pattern) => normalizedValue.includes(pattern))) {
        return [];
      }

      return [`${property}: ${value}`];
    });

  return safeDeclarations.join("; ");
}

function sanitizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();
  if (normalized.startsWith("javascript:") || normalized.startsWith("vbscript:")) {
    return null;
  }

  if (normalized.startsWith("data:") && !normalized.startsWith("data:image/")) {
    return null;
  }

  return trimmed;
}
