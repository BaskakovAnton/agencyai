import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } });
await page.goto("https://aitunnel.ru/models", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(7000);
const targets = ["Claude Opus 5.5", "Claude Sonnet 5.5", "Gemini 4 Argon", "DeepSeek V4 Flash Vision Exp", "GLM 4.6v"];
const seen = new Set<string>();
for (let i = 0; i < 30; i++) {
  const hits = await page.evaluate((targets: string[]) => {
    const out: { t: string }[] = [];
    for (const el of Array.from(document.querySelectorAll("div,li,article,a"))) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t.length < 20 || t.length > 500) continue;
      if (targets.some((x) => t.includes(x)) && /₽/.test(t)) out.push({ t });
    }
    return out;
  }, targets);
  for (const h of hits) seen.add(h.t);
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(800);
}
await browser.close();
for (const t of seen) console.log("* " + t + "\n");
