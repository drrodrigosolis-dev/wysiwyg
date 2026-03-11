import type { JSONContent } from "@tiptap/core";

import { parseChunkDataJson, RAW_CHUNK_TEMPLATE_ID } from "./chunks/registry";
import { renderInteractiveChunk } from "./chunks/render";

export function toMarkdown(content: JSONContent): string {
  const markdown = serializeNode(content).trim();
  return markdown.replace(/\n{3,}/g, "\n\n");
}

function serializeNode(node: JSONContent | undefined, depth = 0): string {
  if (!node) {
    return "";
  }

  if (node.type === "doc") {
    return (node.content ?? []).map((child) => serializeNode(child, depth)).join("");
  }

  if (node.type === "paragraph") {
    return `${serializeInline(node).trim()}\n\n`;
  }

  if (node.type === "heading") {
    const level = Math.min(6, Number(node.attrs?.level ?? 1));
    return `${"#".repeat(level)} ${serializeInline(node).trim()}\n\n`;
  }

  if (node.type === "blockquote") {
    return serializeInline(node)
      .split("\n")
      .map((line) => `> ${line.trim()}`)
      .join("\n")
      .concat("\n\n");
  }

  if (node.type === "callout") {
    const tone = String(node.attrs?.tone ?? "note").toUpperCase();
    return serializeNodeList(node.content ?? [], depth)
      .trim()
      .split("\n")
      .map((line, index) => (index === 0 ? `> [!${tone}] ${line.trim()}` : `> ${line.trim()}`))
      .join("\n")
      .concat("\n\n");
  }

  if (node.type === "bulletList") {
    return (node.content ?? []).map((child) => serializeListItem(child, depth, "-")).join("") + "\n";
  }

  if (node.type === "orderedList") {
    return (node.content ?? []).map((child, index) => serializeListItem(child, depth, `${index + 1}.`)).join("") + "\n";
  }

  if (node.type === "taskList") {
    return (node.content ?? [])
      .map((child) => serializeTaskItem(child, depth))
      .join("")
      .concat("\n");
  }

  if (node.type === "codeBlock") {
    return `\`\`\`\n${serializeInline(node).trim()}\n\`\`\`\n\n`;
  }

  if (node.type === "horizontalRule") {
    return "---\n\n";
  }

  if (node.type === "interactiveChunk") {
    const mode = String(node.attrs?.mode ?? "structured");
    const templateId = String(node.attrs?.templateId ?? RAW_CHUNK_TEMPLATE_ID);
    const dataJson = String(node.attrs?.dataJson ?? "{}");
    const rawHtml = String(node.attrs?.rawHtml ?? "");
    const restriction = String(node.attrs?.restriction ?? "strict");
    const rendered = renderInteractiveChunk({
      mode: mode === "raw" ? "raw" : "structured",
      templateId,
      dataJson: JSON.stringify(parseChunkDataJson(dataJson, {})),
      rawHtml,
      restriction: restriction === "enhanced" ? "enhanced" : "strict",
      version: Number(node.attrs?.version ?? 1),
    });

    return `${rendered.html}\n\n`;
  }

  if (node.type === "table") {
    return serializeTable(node);
  }

  if (node.type === "hardBreak") {
    return "  \n";
  }

  return serializeNodeList(node.content ?? [], depth);
}

function serializeNodeList(nodes: JSONContent[], depth: number): string {
  return nodes.map((child) => serializeNode(child, depth)).join("");
}

function serializeInline(node: JSONContent): string {
  return (node.content ?? []).map((child) => serializeInlineNode(child)).join("");
}

function serializeInlineNode(node: JSONContent): string {
  if (node.type === "text") {
    return applyMarks(node.text ?? "", node.marks);
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  return (node.content ?? []).map((child) => serializeInlineNode(child)).join("");
}

function applyMarks(value: string, marks: JSONContent["marks"]): string {
  return (marks ?? []).reduce((output, mark) => {
    switch (mark.type) {
      case "bold":
        return `**${output}**`;
      case "italic":
        return `*${output}*`;
      case "underline":
        return `<u>${output}</u>`;
      case "strike":
        return `~~${output}~~`;
      case "highlight":
        return `==${output}==`;
      case "link":
        return `[${output}](${String(mark.attrs?.href ?? "")})`;
      case "superscript":
        return `[^${output}]`;
      default:
        return output;
    }
  }, value);
}

function serializeListItem(node: JSONContent, depth: number, marker: string): string {
  const text = (node.content ?? []).map((child) => serializeNode(child, depth + 1)).join("").trim();
  return `${"  ".repeat(depth)}${marker} ${text}\n`;
}

function serializeTaskItem(node: JSONContent, depth: number): string {
  const checked = node.attrs?.checked ? "x" : " ";
  const text = (node.content ?? []).map((child) => serializeNode(child, depth + 1)).join("").trim();
  return `${"  ".repeat(depth)}- [${checked}] ${text}\n`;
}

function serializeTable(node: JSONContent): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) => serializeInline(cell).replace(/\|/g, "\\|").trim()),
  );

  if (rows.length === 0) {
    return "";
  }

  const header = rows[0];
  const separator = header.map(() => "---");
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...rows.slice(1).map((row) => `| ${row.join(" | ")} |`),
  ];

  return `${lines.join("\n")}\n\n`;
}
