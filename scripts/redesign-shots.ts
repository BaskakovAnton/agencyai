import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const out = process.argv[2] ?? "docs/screenshots/redesign-baseline";
const app = "http://127.0.0.1:4321/";
const refs = "file:///C:/Users/Pavel/Desktop/agencyai/docs/redesign-reference/";
/** Контрольные размеры из docs/redesign-validation-guide.md (четыре, zoom 100 %). */
const vps = [
  { name: "1440", width: 1440, height: 1000 },
  { name: "1024", width: 1024, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
] as const;
const appPages = [
  { name: "dashboard", hash: "#dashboard" },
  { name: "incidents", hash: "#incidents" },
  { name: "incident", hash: "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02" },
  { name: "timeline-git", hash: "#timeline?at=2026-01-02&view=git" },
  { name: "timeline-gantt", hash: "#timeline?at=2026-01-02&view=gantt" },
  { name: "chat", hash: "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02" },
  { name: "model", hash: "#model" },
];
const refPages = ["index", "overview", "incidents", "incident-detail", "timeline-git", "timeline-gantt", "chat", "model"];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const shots: string[] = [];
for (const vp of vps) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  for (const p of appPages) {
    await page.goto(app + p.hash, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const file = out + "/app-" + p.name + "-" + vp.name + ".png";
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file);
  }
  await page.close();
}
const withRefs = process.argv.includes("refs");
const refViewports = [{ name: "1440", width: 1440, height: 1000 }, { name: "390", width: 390, height: 844 }] as const;
for (const vp of withRefs ? refViewports : []) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  for (const name of refPages) {
    await page.goto(refs + name + ".html", { waitUntil: "load" });
    await page.waitForTimeout(400);
    const file = out + "/ref-" + name + "-" + vp.name + ".png";
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file);
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ shots: shots.length }, null, 2));