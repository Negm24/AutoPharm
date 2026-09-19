import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/youss/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);

const workspace = "D:/Projects/AutoPharm";
const markdownPath = path.join(
  workspace,
  "docs/diagrams/v_backend_architecture_1.0.md"
);
const outputDirectory = path.join(workspace, "docs/diagrams/rendered");
const markdown = fs.readFileSync(markdownPath, "utf8");
const diagrams = [...markdown.matchAll(/```mermaid\s*([\s\S]*?)```/g)].map(
  (match) => match[1].replace(/%% portable-canonical-v2:[^\r\n]+/g, "").trim()
);

if (diagrams.length !== 2) {
  throw new Error(`Expected 2 Mermaid diagrams, found ${diagrams.length}`);
}

fs.mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath:
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: 2200, height: 1600 },
  deviceScaleFactor: 2,
});
page.on("console", (message) => console.log(`browser: ${message.text()}`));
page.on("pageerror", (error) => console.error(`browser error: ${error.message}`));

for (const [index, source] of diagrams.entries()) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body { margin: 0; background: #ffffff; }
          body {
            padding: 48px;
            font-family: Aptos, "Segoe UI", Arial, sans-serif;
          }
          .frame {
            display: inline-block;
            min-width: 1200px;
            padding: 34px;
            border: 1px solid #d7dde7;
            border-radius: 18px;
            background: #ffffff;
          }
          .mermaid { display: inline-block; }
          svg { max-width: none !important; height: auto; }
        </style>
      </head>
      <body>
        <main class="frame">
          <pre class="mermaid"></pre>
        </main>
      </body>
    </html>
  `);

  await page.locator(".mermaid").evaluate((element, diagramSource) => {
    element.textContent = diagramSource;
  }, source);
  await page.addScriptTag({
    url: "https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js",
  });
  const renderResult = await page.evaluate(async () => {
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        flowchart: { curve: "basis", htmlLabels: true, useMaxWidth: false },
      });
      await window.mermaid.run({ querySelector: ".mermaid" });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error?.message ?? String(error),
        stack: error?.stack ?? "",
      };
    }
  });
  if (!renderResult.ok) {
    throw new Error(JSON.stringify(renderResult));
  }
  await page.locator(".mermaid svg").waitFor({ state: "visible" });

  const filename =
    index === 0
      ? "backend-repository-growth.png"
      : "domain-app-dependency-direction.png";
  await page.locator(".frame").screenshot({
    path: path.join(outputDirectory, filename),
    animations: "disabled",
  });
}

await browser.close();
