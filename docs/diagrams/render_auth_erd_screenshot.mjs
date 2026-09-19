import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/youss/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);

const workspace = "D:/Projects/AutoPharm";
const markdown = fs.readFileSync(
  path.join(workspace, "docs/diagrams/v_auth_1.1.md"),
  "utf8"
);
const match = markdown.match(/```mermaid\s*([\s\S]*?)```/);
if (!match) throw new Error("Authentication Mermaid diagram not found");
const source = match[1]
  .replace(/%% portable-canonical-v2:[^\r\n]+/g, "")
  .trim()
  .replace(/^erDiagram/, "erDiagram\n  direction LR");

const outputDirectory = path.join(workspace, "docs/diagrams/rendered");
fs.mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: 1800, height: 1400 },
  deviceScaleFactor: 2,
});

await page.setContent(`
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        html, body { margin: 0; background: #ffffff; }
        body { padding: 48px; font-family: Aptos, "Segoe UI", Arial, sans-serif; }
        .frame {
          display: inline-block;
          padding: 34px;
          border: 1px solid #d7dde7;
          border-radius: 18px;
          background: #ffffff;
        }
        .mermaid { display: inline-block; }
        svg { max-width: none !important; height: auto; }
      </style>
    </head>
    <body><main class="frame"><pre class="mermaid"></pre></main></body>
  </html>
`);
await page.locator(".mermaid").evaluate((element, diagramSource) => {
  element.textContent = diagramSource;
}, source);
await page.addScriptTag({
  url: "https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js",
});
await page.evaluate(async () => {
  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    er: { useMaxWidth: false },
  });
  await window.mermaid.run({ querySelector: ".mermaid" });
});
await page.locator(".mermaid svg").waitFor({ state: "visible" });
await page.locator(".frame").screenshot({
  path: path.join(outputDirectory, "auth-erd-v1.1.png"),
  animations: "disabled",
});
await browser.close();
