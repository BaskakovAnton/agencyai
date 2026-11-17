import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

/** Снимок эталона DarkStore для приёмки: локальный файл, две ширины. */
const src = process.argv[2] ?? "C:/Users/Pavel/Downloads/index.html";
const outDir = "docs/screenshots/acceptance";
const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });
for (const [name, width, height] of [["1440", 1440, 1000], ["390", 390, 844]] as const) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto("file:///" + src, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: outDir + "/ref-darkstore-" + name + ".png", fullPage: true });
  await page.close();
}
await browser.close();
console.log("ref captured");
