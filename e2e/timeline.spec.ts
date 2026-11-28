import { expect, test } from "@playwright/test";

test.describe("Хронология: диаграмма Ганта и перемотка времени", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#timeline");
    await expect(page.locator(".page-title")).toContainText("Хронология");
  });

  test("на экране диаграмма Ганта со строками заявок", async ({ page }) => {
    await expect(page.locator("[data-gantt]")).toBeVisible();
    await expect(page.locator("[data-row]").first()).toBeVisible();
    await expect(page.locator("[data-bar]").first()).toBeVisible();
    await expect(page.locator("text=Шкала времени и когорты")).toHaveCount(0);
    await expect(page.locator("text=Дашборд когорт")).toHaveCount(0);
  });

  test("сценарий «2 января»: срез показывает только прошедшие дни", async ({ page }) => {
    await page.locator("[data-slider]").fill("19");
    const allRows = await page.locator("[data-row]").count();
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await expect(page.locator("[data-day-label]")).toHaveText("2 января 2026");
    await expect(page.locator("[data-stats]")).toContainText("заявок на дату");
    const rows = await page.locator("[data-row]").count();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThan(allRows);
    const count = Number(((await page.locator("[data-stats]").innerText()).match(/заявок на дату: (\d+)/) ?? [])[1]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(30);
  });

  test("ползунок двигается мышью и перерисовывает диаграмму", async ({ page }) => {
    const slider = page.locator("[data-slider]");
    await slider.fill("0");
    await expect(page.locator("[data-day-label]")).toHaveText("20 декабря 2025");
    const firstDayRows = await page.locator("[data-row]").count();
    await slider.fill("19");
    const laterRows = await page.locator("[data-row]").count();
    expect(laterRows).toBeGreaterThan(firstDayRows);
  });

  test("строки диаграммы несут заявку, узлы и подписи", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await expect(page.locator("[data-gantt]")).toBeVisible();
    const rows = await page.locator("[data-row]").count();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThan(30);
    await expect(page.locator('[data-row="З-015"]')).toContainText("Разбита дверь подъезда");
    await expect(page.locator('[data-bar][data-node="U1"]').first()).toBeVisible();
  });

  test("клик по строке открывает переписку заявки на эту дату", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await page.locator('[data-row="З-015"]').click();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/З-015?at=2026-01-02");
    await expect(page.locator("[data-phone]")).toContainText("З-015");
    await expect(page.locator("[data-chat-date]")).toContainText("2 января 2026");
  });

  test("Enter по строке открывает переписку, фокус остаётся на строке", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    const row = page.locator('[data-row="З-015"]');
    await row.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/З-015");
  });

  test("перемотка дня пишет дату в адрес, вид остаётся диаграммой", async ({ page }) => {
    await page.locator('[data-ruler-day="2026-01-05"]').click();
    await expect(page.locator("[data-day-label]")).toHaveText("5 января 2026");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("at=2026-01-05");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("view=gantt");
  });

  test("сброс фильтра появляется после выбора заявки", async ({ page }) => {
    await page.locator("[data-incident-filter]").first().click();
    const clear = page.locator('[data-action="clear"]');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page.locator("[data-incident-filter].on")).toHaveCount(0);
  });

  test("канвас, ползунок и строки диаграммы доступны с клавиатуры", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    await expect(page.locator("[data-canvas]")).toHaveAttribute("tabindex", "0");
    await expect(page.locator("[data-canvas]")).toHaveAttribute("role", "region");
    await expect(page.locator("[data-slider]")).toHaveAttribute("aria-valuetext", "2 января 2026");
    const row = page.locator("[data-row]").first();
    const id = await row.getAttribute("data-row");
    await row.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/" + (id as string));
  });

  test("над диаграммой есть шкала времени и легенды SLA", async ({ page }) => {
    await expect(page.locator("[data-ruler]")).toBeVisible();
    await expect(page.locator("[data-ruler-hour]")).toHaveCount(24);
    await expect(page.locator("[data-ruler-marker]")).toHaveCount(1);
    await expect(page.locator("[data-legends]")).toBeVisible();
    await expect(page.locator("[data-legend-sla]")).toHaveCount(4);
    await expect(page.locator("[data-legend-counts]")).toContainText("заявок");
    await page.locator('[data-ruler-day="2026-01-02"]').click();
    await expect(page.locator("[data-day-label]")).toHaveText("2 января 2026");
  });

  test("на широком экране чат стоит рядом с диаграммой и синхронен по дате", async ({ page }) => {
    await page.locator('[data-action="jump"][data-day="2026-01-02"]').click();
    const inline = page.locator("[data-inline-chat]");
    await expect(inline).toHaveCount(1); // панель не должна дублироваться при перерисовке
    await expect(inline).toBeVisible();
    await expect(inline).toContainText("З-015");
    await expect(inline.locator("[data-msg]")).toHaveCount(3);
    await expect(inline).toContainText("Назначаю подрядчика");
    await expect(inline).not.toContainText("Принято, выезжаю");
  });
});

test.describe("Раскладка хронологии", () => {
  test("диаграмма и чат стоят в одной строке на широком экране", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto("/#timeline?at=2026-01-02");
    await page.waitForTimeout(600);
    const box = await page.evaluate(() => {
      const rect = (selector: string) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el === null) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), left: Math.round(r.left), bottom: Math.round(r.bottom), width: Math.round(r.width) };
      };
      return { graph: rect(".graph-wrap"), chat: rect("[data-inline-chat]"), list: rect("[data-event-list]"), hint: rect(".scroll-hint") };
    });
    expect(box.graph, "диаграмма не найдена").not.toBeNull();
    expect(box.chat, "чат не найден").not.toBeNull();
    expect(Math.abs((box.graph as { top: number }).top - (box.chat as { top: number }).top)).toBeLessThanOrEqual(4);
    expect((box.graph as { left: number }).left).toBeLessThan((box.chat as { left: number }).left);
    expect((box.graph as { top: number }).top).toBeLessThan((box.chat as { bottom: number }).bottom);
    expect((box.hint as { width: number } | null)?.width ?? 0).toBeLessThanOrEqual((box.graph as { width: number }).width);
    expect((box.list as { top: number }).top).toBeGreaterThanOrEqual((box.chat as { bottom: number }).bottom);
  });

  test("при смене дня обёртка диаграммы не вкладывается сама в себя", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto("/#timeline?at=2026-01-02");
    await page.waitForTimeout(500);
    const slider = page.locator("[data-slider]");
    for (const value of ["0", "5", "10", "15", "19"]) {
      await slider.fill(value);
      await page.waitForTimeout(250);
    }
    const nesting = await page.evaluate(() => ({
      wrappers: document.querySelectorAll(".graph-wrap").length,
      nested: document.querySelectorAll(".graph-wrap .graph-wrap").length,
      hints: document.querySelectorAll("[data-scroll-hint]").length,
    }));
    expect(nesting).toEqual({ wrappers: 1, nested: 0, hints: 1 });
  });
});
