import { expect, test } from "@playwright/test";

test.describe("Этап 4: хронология, чат и модель", () => {
  test("хронология: плотность, подсказка скролла и видимый сброс", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    await expect(page.locator("[data-scroll-hint]")).toBeVisible();
    await expect(page.locator('[data-action="clear"]')).toBeVisible();
    await expect(page.locator('[data-action="clear"]')).toBeDisabled();
    await page.locator('[data-density="compact"]').click();
    await expect(page.locator("[data-timeline]")).toHaveClass(/density-compact/);
    await page.locator("[data-incident-filter]").first().click();
    await expect(page.locator('[data-action="clear"]')).toBeEnabled();
  });

  test("чат: только чтение, роль у реплики", async ({ page }) => {
    await page.goto("/#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await expect(page.locator("[data-readonly]")).toContainText("Только чтение");
    await expect(page.locator("[data-role-label]").first()).toBeVisible();
  });

  test("модель: матрица прав и группы узлов", async ({ page }) => {
    await page.goto("/#model");
    await page.locator('[data-action="select"]').first().click();
    await expect(page.locator("[data-roles-matrix]")).toBeVisible();
    await expect(page.locator("[data-role-row]")).toHaveCount(7);
    await expect(page.locator("[data-group]")).toHaveCount(6);
  });
});
