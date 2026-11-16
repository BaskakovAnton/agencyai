import { expect, test } from "@playwright/test";

test.describe("Модуль 1 · Шкала времени и когорты", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#dashboard");
    await expect(page.locator("h1.brand")).toHaveText("Шкала времени и когорты");
  });

  test("график, полоса 30 узлов и легенда на месте", async ({ page }) => {
    await expect(page.locator("canvas#chart")).toBeVisible();
    await expect(page.locator("[data-strip] .node-cell")).toHaveCount(30);
    await expect(page.locator(".legend span")).toHaveCount(4);
    await expect(page.locator(".legend")).toContainText("Авария / экстренно");
    await expect(page.locator(".legend")).toContainText("Неотложное");
    await expect(page.locator(".legend")).toContainText("Обычное / сезонное");
  });

  test("тултип по узлу U1 говорит, сколько заявок и каких когорт", async ({ page }) => {
    await page.locator('[data-node="U1"]').hover();
    const tip = page.locator("#tt");
    await expect(tip).toHaveClass(/on/);
    await expect(tip).toContainText("Узел U1");
    await expect(tip).toContainText("1 заявка");
  });

  test("клик по узлу фильтрует список заявок", async ({ page }) => {
    await page.locator('[data-node="U1"]').click();
    await expect(page.locator("[data-list] li")).toHaveCount(1);
    await expect(page.locator("[data-list] li .id")).toHaveText("З-001");
    await page.locator('[data-node="U1"]').click();
    await expect(page.locator("[data-list] li")).toHaveCount(30);
  });

  test("фильтр когорты «авария» оставляет только аварийные заявки", async ({ page }) => {
    await page.locator('[data-cohort="urgent"]').check();
    const rows = page.locator("[data-list] li");
    await expect(rows).toHaveCount(3);
    for (const row of await rows.all()) {
      await expect(row.locator(".prio")).toHaveText("авария / экстренно");
    }
  });

  test("фильтр по роли «Подрядчик» убирает заявки на узлах, где подрядчик не участвует", async ({ page }) => {
    await page.locator('[data-f="role"]').selectOption("contractor");
    const ids = await page.locator("[data-list] li .id").allTextContents();
    expect(ids).toContain("З-010");
    expect(ids).not.toContain("З-001");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThan(30);
  });

  test("сброс фильтров возвращает все 30 заявок", async ({ page }) => {
    await page.locator('[data-cohort="urgent"]').check();
    await expect(page.locator("[data-list] li")).toHaveCount(3);
    await page.locator('[data-action="reset"]').click();
    await expect(page.locator("[data-list] li")).toHaveCount(30);
  });
});
