const allowedTags = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "HR",
  "I",
  "LI",
  "MARK",
  "OL",
  "P",
  "PRE",
  "S",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);

const allowedAttributes = new Set([
  "href",
  "data-callout",
  "data-tone",
  "data-background-color",
  "data-interactive-chunk",
  "data-template-id",
  "data-mode",
  "data-data-json",
  "data-raw-html",
  "data-version",
  "data-restriction",
]);

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
  if (!allowedTags.has(tagName)) {
    return cleanChildren(node, document);
  }

  if (
    tagName === "DIV" &&
    node.getAttribute("data-callout") !== "true" &&
    node.getAttribute("data-interactive-chunk") !== "true"
  ) {
    return cleanChildren(node, document);
  }

  const element = document.createElement(tagName.toLowerCase());
  Array.from(node.attributes).forEach((attribute) => {
    if (!allowedAttributes.has(attribute.name)) {
      return;
    }

    element.setAttribute(attribute.name, attribute.value);
  });
  element.append(...cleanChildren(node, document));
  return [element];
}
