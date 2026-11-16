import { expect, test } from "@playwright/test";

test.describe("Хронология: Git-граф и перемотка времени", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#timeline");
    await expect(page.locator("h1.brand")).toContainText("Хронология заявок");
  });

  test("вместо таблицы когорт — Git-граф с колонками узлов и коммитами", async ({ page }) => {
    await expect(page.locator("svg[data-graph]")).toBeVisible();
    await expect(page.locator(".col-label")).toHaveCount(30);
    await expect(page.locator("[data-commit]").first()).toBeVisible();
    await expect(page.locator("text=Шкала времени и когорты")).toHaveCount(0);
    await expect(page.locator("text=Дашборд когорт")).toHaveCount(0);
  });

  test("сценарий «2 января»: ползунок скрывает будущие события", async ({ page }) => {
    const allDots = await page.locator("[data-commit]").count();
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await expect(page.locator("[data-day-label]")).toHaveText("2 января 2026");
    await expect(page.locator("[data-stats]")).toContainText("заявок на дату");

    const days = await page.locator("[data-commit]").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.day ?? ""),
    );
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((day) => day <= "2026-01-02")).toBe(true);
    const afterDots = await page.locator("[data-commit]").count();
    expect(afterDots).toBeLessThan(allDots);

    const count = Number(((await page.locator("[data-stats]").innerText()).match(/заявок на дату: (\d+)/) ?? [])[1]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(30);
  });

  test("ползунок двигается мышью и перерисовывает граф", async ({ page }) => {
    const slider = page.locator("[data-slider]");
    await slider.fill("0");
    await expect(page.locator("[data-day-label]")).toHaveText("20 декабря 2025");
    const firstDayDots = await page.locator("[data-commit]").count();
    await slider.fill("19");
    const laterDots = await page.locator("[data-commit]").count();
    expect(laterDots).toBeGreaterThan(firstDayDots);
  });

  test("fallback: диаграмма Ганта на тех же данных", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await page.locator('[data-view="gantt"]').click();
    await expect(page.locator("[data-gantt]")).toBeVisible();
    await expect(page.locator("[data-row]").first()).toBeVisible();
    await expect(page.locator('[data-bar][data-node="U1"]').first()).toBeVisible();
    const rows = await page.locator("[data-row]").count();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThan(30);
    await expect(page.locator('[data-row="З-015"]')).toContainText("Разбита дверь подъезда");
  });

  test("клик по коммиту открывает карточку узла с ролью, временем и SLA", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await page.locator('[data-commit][data-incident="З-015"][data-node="U6"]').click();
    const card = page.locator("[data-node-card]");
    await expect(card).toBeVisible();
    await expect(card).toContainText("З-015");
    await expect(card).toContainText("U6");
    await expect(card).toContainText("ответственный");
    await expect(card).toContainText("Депутат-диспетчер");
    await expect(card).toContainText("время в узле");
    await expect(card).toContainText("SLA");
    await card.locator('[data-card-action="chat"]').click();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/З-015?at=2026-01-02");
    await expect(page.locator("[data-phone]")).toContainText("З-015");
    await expect(page.locator("[data-chat-date]")).toContainText("2 января 2026");
  });

  test("Enter по коммиту открывает карточку, Esc закрывает и возвращает фокус", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    const commit = page.locator('[data-commit][data-incident="З-015"][data-node="U6"]');
    await commit.focus();
    await page.keyboard.press("Enter");
    const card = page.locator("[data-node-card]");
    await expect(card).toBeVisible();
    await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.hasAttribute("data-node-card") ?? false)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-node-card]")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-node") ?? "")).toBe("U6");
  });

  test("перемотка дня пишет дату в адрес, смена вида — параметр view", async ({ page }) => {
    await page.locator('[data-ruler-day="2026-01-05"]').click();
    await expect(page.locator("[data-day-label]")).toHaveText("5 января 2026");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("at=2026-01-05");
    await page.locator('[data-view="gantt"]').click();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("view=gantt");
  });

  test("сброс фильтра появляется после выбора заявки", async ({ page }) => {
    await page.locator("[data-incident-filter]").first().click();
    const clear = page.locator('[data-action="clear"]');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page.locator("[data-incident-filter].on")).toHaveCount(0);
  });

  test("канвас, ползунок и строки Ганта доступны с клавиатуры", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await expect(page.locator("[data-canvas]")).toHaveAttribute("tabindex", "0");
    await expect(page.locator("[data-canvas]")).toHaveAttribute("role", "region");
    await expect(page.locator("[data-slider]")).toHaveAttribute("aria-valuetext", "2 января 2026");
    await page.locator('[data-view="gantt"]').click();
    const row = page.locator("[data-row]").first();
    const id = await row.getAttribute("data-row");
    await row.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/" + (id as string));
  });

  test("над графом есть шкала времени и легенды SLA и развилок", async ({ page }) => {
    await expect(page.locator("[data-ruler]")).toBeVisible();
    await expect(page.locator("[data-ruler-hour]")).toHaveCount(24);
    await expect(page.locator("[data-ruler-marker]")).toHaveCount(1);
    await expect(page.locator("[data-legends]")).toBeVisible();
    await expect(page.locator("[data-legend-sla]")).toHaveCount(4);
    await expect(page.locator('[data-legend-graph="fork"]')).toContainText("развилка");
    await expect(page.locator('[data-legend-graph="merge"]')).toContainText("слияние");
    await page.locator('[data-ruler-day="2026-01-02"]').click();
    await expect(page.locator("[data-day-label]")).toHaveText("2 января 2026");
  });

  test("на широком экране чат стоит рядом с графом и синхронен по дате", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    const inline = page.locator("[data-inline-chat]");
    await expect(inline).toHaveCount(1); // панель не должна дублироваться при перерисовке
    await expect(inline).toBeVisible();
    await expect(inline).toContainText("З-015");
    await expect(inline.locator("[data-msg]")).toHaveCount(3);
    await expect(inline).toContainText("Назначаю подрядчика");
    await expect(inline).not.toContainText("Принято, выезжаю");
  });

  test("тултип рассказывает про коммит: заявка, узел, дата и роль", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await page.locator('[data-commit][data-incident="З-015"][data-node="U6"]').hover();
    const tip = page.locator("[data-tt]");
    await expect(tip).toHaveClass(/on/);
    await expect(tip).toContainText("З-015");
    await expect(tip).toContainText("U6");
    await expect(tip).toContainText("Назначаю подрядчика");
  });
});
