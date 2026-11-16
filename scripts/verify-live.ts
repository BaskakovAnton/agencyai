import { chromium } from "@playwright/test";

/** Проверка опубликованного демо на GitHub Pages: ждём пересборку и проверяем оба экрана. */
const base = process.env.LIVE_BASE ?? "https://baskakovanton.github.io/agencyai/demo/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const problems: string[] = [];

/** Ждём, пока Pages пересоберётся и отдаст новый бандл: опрашиваем с обходом кэша. */
const waitFor = async (hash: string, selector: string, timeoutMs = 240_000): Promise<boolean> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await page.goto(base + "?v=" + Date.now() + hash, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(selector, { timeout: 10_000 });
      return true;
    } catch {
      await page.waitForTimeout(8000);
    }
  }
  return false;
};

const ready = await waitFor("#timeline", "svg[data-graph]");
if (!ready) problems.push("Git-граф не появился на Pages за отведённое время");

if (ready) {
  const allDots = await page.locator("[data-commit]").count();
  await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
  await page.waitForTimeout(400);
  const days = await page.locator("[data-commit]").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.day ?? ""),
  );
  const afterDots = days.length;
  if (afterDots === 0 || afterDots >= allDots) problems.push("перемотка на 2 января не скрыла будущие события: " + afterDots + " из " + allDots);
  if (!days.every((day) => day <= "2026-01-02")) problems.push("в графе остались события после 2 января");
  const stats = (await page.locator("[data-stats]").innerText()).trim();
  if (!stats.includes("2 января 2026")) problems.push("подпись даты не переключилась: " + stats);

  await page.locator('[data-view="gantt"]').click();
  if ((await page.locator("[data-gantt]").count()) === 0) problems.push("fallback-Гант не отрисовался");

  await page.goto(base + "?v=" + Date.now() + "#chat/З-015?at=2026-01-02");
  await page.waitForSelector("[data-phone]");
  const role = ((await page.locator("[data-role-badge]").textContent()) ?? "").trim();
  if (role !== "Депутат-диспетчер") problems.push("на 2 января роль не депутат-диспетчер: " + role);
  const messages = await page.locator("[data-msg]").count();
  if (messages !== 2) problems.push("на 2 января сообщений не 2: " + messages);
  if ((await page.locator("[data-phone] input, [data-phone] textarea").count()) !== 0) {
    problems.push("в чате есть поле ввода — по ТЗ это плеер переписки");
  }
  const text = (await page.locator("[data-messages]").innerText()).trim();
  if (!text.includes("Назначаю подрядчика")) problems.push("нет реплики диспетчера на 2 января");
  if (text.includes("Принято, выезжаю")) problems.push("на 2 января видна будущая реплика подрядчика");
}

await browser.close();
console.log(problems.length === 0 ? "LIVE OK: " + base : "LIVE ПРОБЛЕМЫ: " + problems.join("; "));
