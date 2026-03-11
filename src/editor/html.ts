import { getSchema, type Extensions, type JSONContent } from "@tiptap/core";
import { DOMSerializer, Node } from "@tiptap/pm/model";

import { hydrateInteractiveChunksInHtml } from "./chunks/render";

export function generateExportableHtml(doc: JSONContent, extensions: Extensions): string {
  const schema = getSchema(extensions);
  const contentNode = Node.fromJSON(schema, doc);
  const temporaryDocument = document.implementation.createHTMLDocument();
  const container = temporaryDocument.createElement("div");

  DOMSerializer.fromSchema(schema).serializeFragment(contentNode.content, { document: temporaryDocument }, container);

  return hydrateInteractiveChunksInHtml(container.innerHTML);
}
