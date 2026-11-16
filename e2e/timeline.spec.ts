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

  test("клик по точке графа открывает чат именно этой заявки на выбранную дату", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await page.locator('[data-commit][data-incident="З-015"]').first().click();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/З-015?at=2026-01-02");
    await expect(page.locator("[data-phone]")).toContainText("З-015");
    await expect(page.locator("[data-chat-date]")).toContainText("2 января 2026");
  });

  test("на широком экране чат стоит рядом с графом и синхронен по дате", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    const inline = page.locator("[data-inline-chat]");
    await expect(inline).toHaveCount(1); // панель не должна дублироваться при перерисовке
    await expect(inline).toBeVisible();
    await expect(inline).toContainText("З-015");
    await expect(inline.locator("[data-msg]")).toHaveCount(2);
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
