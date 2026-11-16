import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Снимает два экрана демо (и экран модели) в docs/screenshots. */
const root = fileURLToPath(new URL("../demo/", import.meta.url));
const port = 4399;

const server = Bun.serve({
  port,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const relative = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    const file = Bun.file(join(root, relative));
    if (await file.exists()) return new Response(file);
    return new Response("not found", { status: 404 });
  },
});

const outDir = "docs/screenshots";
await mkdir(outDir, { recursive: true });
const base = "http://127.0.0.1:" + port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

await page.goto(base + "/#dashboard");
await page.waitForSelector("canvas#chart");
await page.locator('.node-cell[data-node="U7"]').hover();
await page.waitForTimeout(300);
await page.screenshot({ path: join(outDir, "dashboard.png"), fullPage: true });

await page.goto(base + "/#chat");
await page.waitForSelector('[data-pane="chat"]');
await page.locator('[data-action="next"]').click();
await page.locator('[data-action="next"]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: join(outDir, "chat.png"), fullPage: true });

await page.goto(base + "/#");
await page.waitForSelector('[data-pane="list"], .incidents');
await page.screenshot({ path: join(outDir, "model.png"), fullPage: true });

await browser.close();
server.stop(true);
console.log("screenshots: dashboard.png, chat.png, model.png");
