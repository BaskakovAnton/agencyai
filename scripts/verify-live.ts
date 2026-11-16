import { chromium } from "@playwright/test";

/** Проверка опубликованного демо на GitHub Pages: ждём пересборку и проверяем оба модуля. */
const base = process.env.LIVE_BASE ?? "https://baskakovanton.github.io/agencyai/demo/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const problems: string[] = [];

/** Ждём, пока Pages пересоберётся и отдаст новый бандл: опрашиваем с обходом кэша. */
const waitFor = async (selector: string, timeoutMs = 240_000): Promise<boolean> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await page.goto(base + "#dashboard?v=" + Date.now(), { waitUntil: "domcontentloaded" });
      await page.waitForSelector(selector, { timeout: 10_000 });
      return true;
    } catch {
      await page.waitForTimeout(8000);
    }
  }
  return false;
};

// ждём, пока на Pages появится новый бандл с дашбордом
const ready = await waitFor(".legend");
if (!ready) problems.push("дашборд не появился на Pages за отведённое время");

if (ready) {
  await page.goto(base + "#dashboard");
  await page.waitForSelector("canvas#chart");
  const cells = await page.locator("[data-strip] .node-cell").count();
  if (cells !== 30) problems.push("на дашборде не 30 узлов: " + cells);
  await page.locator('[data-node="U1"]').hover();
  const tip = (await page.locator("#tt").textContent()) ?? "";
  if (!tip.includes("Узел U1")) problems.push("тултип не сработал: " + tip);

  await page.goto(base + "#chat");
  await page.waitForSelector('[data-role-badge]');
  const role = (await page.locator("[data-role-badge]").textContent()) ?? "";
  if (role.trim() !== "Житель") problems.push("чат стартует не с роли Жителя: " + role);
  await page.locator('[data-action="next"]').click();
  await page.locator('[data-action="next"]').click();
  const badge = (await page.locator("[data-role-badge]").textContent()) ?? "";
  if (!badge.includes("Подрядчик")) problems.push("на U7 роль не Подрядчик: " + badge);
  if ((await page.locator('[data-card="sla"]').count()) === 0) problems.push("нет SLA-карточки на U7");
}

await browser.close();
console.log(problems.length === 0 ? "LIVE OK: " + base : "LIVE ПРОБЛЕМЫ: " + problems.join("; "));
