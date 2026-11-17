import { expect, test } from "@playwright/test";

test.describe("Оболочка редизайна", () => {
  test("desktop: сайдбар, активный пункт, переключатель темы запоминается", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=git");
    await expect(page.locator("[data-sidebar]")).toBeVisible();
    await expect(page.locator('[data-nav="timeline"]')).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-theme-toggle]")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("старые маршруты показывают своё содержимое внутри оболочки", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=git");
    await expect(page.locator("svg[data-graph]")).toBeVisible();
    await page.goto("/#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await expect(page.locator("[data-phone]")).toBeVisible();
    await page.goto("/#model");
    await expect(page.locator(".row").first()).toBeVisible();
    await expect(page.locator('[data-nav="model"]')).toHaveAttribute("aria-current", "page");
  });

  test("новые маршруты: стартовый обзор, обращения и карточка — заглушки", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-nav="dashboard"]')).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-placeholder]")).toBeVisible();
    await page.goto("/#incidents");
    await expect(page.locator("[data-placeholder]")).toBeVisible();
    await page.goto("/#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await expect(page.locator("[data-placeholder]")).toContainText("Этап");
  });

  test("mobile: сайдбар скрыт, открывается кнопкой меню", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#timeline?at=2026-01-02&view=git");
    await expect(page.locator("[data-menu]")).toBeVisible();
    await expect(page.locator("[data-sidebar]")).toBeHidden();
    await page.locator("[data-menu]").click();
    await expect(page.locator("[data-sidebar]")).toBeVisible();
  });
});
