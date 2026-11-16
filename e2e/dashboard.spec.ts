import { expect, test } from "@playwright/test";

test.describe("Модуль 1 · Шкала времени и когорты", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#dashboard");
    await expect(page.locator("canvas#chart")).toBeVisible();
    await expect(page.locator("[data-strip] .node-cell")).toHaveCount(30);
  });

  test("дашборд: график, 30 узлов и полный список заявок", async ({ page }) => {
    await expect(page.locator("h1.brand")).toHaveText("Шкала времени и когорты");
    await expect(page.locator("[data-list] li")).toHaveCount(30);
  });

  test("тултип при наведении на узел говорит про когорты", async ({ page }) => {
    await page.locator('[data-node="U9"]').hover();
    const tip = page.locator("#tt");
    await expect(tip).toHaveClass(/on/);
    await expect(tip).toContainText("Узел U9");
    await expect(tip).toContainText("1 заявка");
    await expect(tip).toContainText("аварийная");
  });

  test("клик по узлу фильтрует список, повторный клик снимает фильтр", async ({ page }) => {
    await page.locator('[data-node="U7"]').click();
    await expect(page.locator("[data-list] li")).toHaveCount(1);
    await expect(page.locator("[data-list] li .id")).toHaveText("З-007");
    await page.locator('[data-node="U7"]').click();
    await expect(page.locator("[data-list] li")).toHaveCount(30);
  });

  test("фильтр по когорте «Авария / экстренно» оставляет 3 заявки", async ({ page }) => {
    await page.locator('[data-cohort="urgent"]').check();
    await expect(page.locator("[data-list] li")).toHaveCount(3);
    for (const row of await page.locator("[data-list] li").all()) {
      await expect(row.locator(".prio")).toHaveText("авария / экстренно");
    }
  });

  test("фильтр по роли «Подрядчик» учитывает права роли на узле", async ({ page }) => {
    await page.locator('[data-f="role"]').selectOption("contractor");
    await expect(page.locator("[data-list] li")).toHaveCount(7);
    await expect(page.locator("[data-list] li .id").first()).toHaveText("З-008");
  });

  test("клик по столбцу диаграммы фильтрует список и снимается повторным кликом", async ({ page }) => {
    const canvas = page.locator("canvas#chart");
    const box = (await canvas.boundingBox())!;
    // координаты первого столбца (U1) берём у самого Chart.js — так тест не зависит от вёрстки
    const bar = await page.evaluate(() => {
      const element = document.querySelector("#chart") as HTMLCanvasElement & { __chart?: { getDatasetMeta: (index: number) => { data: { x: number; y: number; base: number }[] } } };
      const chart = element.__chart;
      if (!chart) return null;
      const item = chart.getDatasetMeta(0).data[0];
      return item ? { x: item.x, y: (item.y + item.base) / 2 } : null;
    });
    expect(bar).not.toBeNull();
    await page.mouse.click(box.x + (bar as { x: number }).x, box.y + (bar as { y: number }).y);
    await expect(page.locator("[data-list] li")).toHaveCount(1);
    await expect(page.locator("[data-list] li .id")).toHaveText("З-001");
    await page.mouse.click(box.x + (bar as { x: number }).x, box.y + (bar as { y: number }).y);
    await expect(page.locator("[data-list] li")).toHaveCount(30);
  });

  test("сброс фильтров возвращает все 30 заявок", async ({ page }) => {
    await page.locator('[data-cohort="urgent"]').check();
    await expect(page.locator("[data-list] li")).toHaveCount(3);
    await page.locator('[data-action="reset"]').click();
    await expect(page.locator("[data-list] li")).toHaveCount(30);
  });
});
