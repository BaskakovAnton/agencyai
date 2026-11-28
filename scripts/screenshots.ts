import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Снимает экраны демо в docs/screenshots. */
const root = fileURLToPath(new URL("../demo/", import.meta.url));
const port = 4411;
const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = Bun.serve({
  port,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const relative = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    const file = Bun.file(join(root, relative));
    if (!(await file.exists())) return new Response("не найдено: " + relative, { status: 404 });
    const ext = relative.slice(relative.lastIndexOf("."));
    return new Response(file, { headers: { "content-type": TYPES[ext] ?? "application/octet-stream" } });
  },
});

const outDir = "docs/screenshots";
await mkdir(outDir, { recursive: true });
const base = "http://127.0.0.1:" + port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const shot = async (hash: string, name: string, wait: string): Promise<void> => {
  await page.goto(base + "/" + hash);
  await page.waitForSelector(wait);
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(outDir, name), fullPage: true });
  console.log("снято:", name);
};

await shot("#timeline?at=2026-01-02&view=gantt", "timeline-gantt.png", "[data-gantt]");
await shot("#chat/З-015?at=2026-01-02", "chat-2-january.png", "[data-phone]");
await shot("#chat/З-015?at=2026-01-05", "chat-5-january.png", "[data-phone]");
await shot("#model", "model.png", '[data-action="select"]');

await browser.close();
server.stop(true);
