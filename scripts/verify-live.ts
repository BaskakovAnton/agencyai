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

// Новый бандл узнаём по шкале времени: старый граф тоже есть, поэтому ждём именно новый маркер.
const ready = await waitFor("#timeline", "[data-ruler]");
if (!ready) problems.push("новый бандл (шкала времени) не появился на Pages за отведённое время");

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

  if ((await page.locator("[data-ruler]").count()) === 0) problems.push("нет шкалы времени над графом");
  if ((await page.locator("[data-ruler-hour]").count()) !== 24) problems.push("на шкале не 24 часа");
  if ((await page.locator("[data-legends]").count()) === 0) problems.push("нет легенд SLA и развилок");
  if ((await page.locator("[data-legend-sla]").count()) !== 4) problems.push("в легенде SLA не 4 фазы");
  if ((await page.locator("[data-scroll-hint]").count()) === 0) problems.push("нет подсказки про прокрутку");
  if ((await page.locator('[data-action="clear"]').count()) !== 1) problems.push("нет всегда видимого сброса фильтра");
  if ((await page.locator("[data-density-switch]").count()) === 0) problems.push("нет переключателя плотности");

  const day5 = page.locator('[data-ruler-day="2026-01-05"]');
  if ((await day5.count()) === 0) problems.push("на шкале нет дня 5 января");
  else {
    await day5.first().click();
    await page.waitForTimeout(300);
    if (!decodeURIComponent(page.url()).includes("at=2026-01-05")) problems.push("перемотка дня не обновила адрес: " + page.url());
  }

  const commit = page.locator('[data-commit][data-incident="З-015"][data-node="U6"]');
  if ((await commit.count()) > 0) {
    await commit.click();
    await page.waitForTimeout(400);
  } else {
    problems.push("на графе нет коммита З-015/U6");
  }
  if ((await page.locator("[data-node-card]").count()) === 0) problems.push("клик по коммиту не открыл карточку узла");
  else {
    const card = (await page.locator("[data-node-card]").innerText()).trim();
    if (!card.includes("ответственный")) problems.push("в карточке узла нет ответственного: " + card.slice(0, 120));
    if (!card.includes("Депутат-диспетчер")) problems.push("в карточке узла нет роли депутата-диспетчера");
    if (!card.includes("SLA")) problems.push("в карточке узла нет SLA");
  }

  const ganttBtn = page.locator('[data-view="gantt"]');
  if ((await ganttBtn.count()) > 0) {
    await ganttBtn.click();
    if ((await page.locator("[data-gantt]").count()) === 0) problems.push("fallback-Гант не отрисовался");
  } else {
    problems.push("нет переключателя на Гант");
  }

  await page.goto(base + "?v=" + Date.now() + "#chat/З-015?at=2026-01-02");
  await page.waitForSelector("[data-phone]");
  const role = ((await page.locator("[data-role-badge]").textContent()) ?? "").trim();
  if (role !== "Депутат-диспетчер") problems.push("на 2 января роль не депутат-диспетчер: " + role);
  const messages = await page.locator("[data-msg]").count();
  if (messages !== 3) problems.push("на 2 января сообщений не 3: " + messages);
  if ((await page.locator("[data-phone] input, [data-phone] textarea").count()) !== 0) {
    problems.push("в чате есть поле ввода — по ТЗ это плеер переписки");
  }
  const text = (await page.locator("[data-messages]").innerText()).trim();
  if (!text.includes("Назначаю подрядчика")) problems.push("нет реплики диспетчера на 2 января");
  if (!text.includes("Заявка передана в работу диспетчеру")) problems.push("нет системного сообщения о передаче");
  if (text.includes("Принято, выезжаю")) problems.push("на 2 января видна будущая реплика подрядчика");
  if ((await page.locator("[data-readonly]").count()) === 0) problems.push("в чате нет плашки «только чтение»");

  await page.goto(base + "?v=" + Date.now() + "#dashboard?at=2026-01-02");
  await page.waitForSelector("[data-dashboard]");
  if ((await page.locator("[data-kpi]").count()) !== 4) problems.push("на обзоре не 4 KPI");
  const total = Number(((await page.locator('[data-kpi="active"] .kpi-value').innerText()) ?? "0").trim());
  if (!(total > 0)) problems.push("на обзоре нет заявок в срезе");

  await page.goto(base + "?v=" + Date.now() + "#incidents");
  await page.waitForSelector("[data-incidents-table]");
  const rows = await page.locator("[data-incident-row]").count();
  if (rows !== 30) problems.push("в реестре обращений не 30 строк: " + rows);

  await page.goto(base + "?v=" + Date.now() + "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
  await page.waitForSelector("[data-incident-detail]");
  if ((await page.locator("[data-history-row]").count()) === 0) problems.push("в карточке обращения нет истории");

  await page.goto(base + "?v=" + Date.now() + "#model");
  await page.waitForSelector('[data-action="select"]');
  await page.locator('[data-action="select"]').first().click();
  await page.waitForTimeout(200);
  if ((await page.locator("[data-role-row]").count()) !== 7) problems.push("в матрице прав не 7 ролей");
  if ((await page.locator("[data-group]").count()) !== 6) problems.push("в легенде не 6 групп узлов");
}

await browser.close();
console.log(problems.length === 0 ? "LIVE OK: " + base : "LIVE ПРОБЛЕМЫ: " + problems.join("; "));