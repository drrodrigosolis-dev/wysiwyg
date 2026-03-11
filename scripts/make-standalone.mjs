import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { build } from "esbuild";

const distDir = path.resolve("dist");
const templatePath = path.resolve("index.html");
const outputPath = path.join(distDir, "index.html");

const templateHtml = await readFile(templatePath, "utf8");

const result = await build({
  entryPoints: [path.resolve("src/main.tsx")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
  write: false,
  outdir: path.resolve(".standalone-build"),
});

const scriptOutput = result.outputFiles.find((file) => file.path.endsWith(".js"));
const styleOutput = result.outputFiles.find((file) => file.path.endsWith(".css"));

if (!scriptOutput || !styleOutput) {
  throw new Error("Could not build standalone assets.");
}

const standaloneHtml = templateHtml.replace(
  /<script[^>]*src="\/src\/main\.tsx"[^>]*><\/script>/,
  () => `<style>\n${styleOutput.text}\n</style>\n    <script>\n${escapeInlineScript(scriptOutput.text)}\n</script>`,
);

await writeFile(outputPath, standaloneHtml, "utf8");

function escapeInlineScript(value) {
  return value.replaceAll("</script>", "<\\/script>").replaceAll("<!--", "<\\!--");
}
