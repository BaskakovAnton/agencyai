import { expect, test } from "@playwright/test";

test.describe("Оболочка редизайна", () => {
  test("desktop: сайдбар, активный пункт, переключатель темы запоминается", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    await expect(page.locator("[data-sidebar]")).toBeVisible();
    await expect(page.locator('[data-nav="timeline"]')).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-theme-toggle]")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("сохранённая светлая тема применяется до загрузки приложения (без вспышки)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("agencyai-theme", "light"));
    await page.route("**/app.js", (route) => route.abort());
    await page.goto("/#dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f6fa");
  });

  test("без сохранённой темы до загрузки приложения действует тёмная", async ({ page }) => {
    await page.route("**/app.js", (route) => route.abort());
    await page.goto("/#dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0f1115");
  });

  test("старые маршруты показывают своё содержимое внутри оболочки", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    await expect(page.locator("[data-gantt]")).toBeVisible();
    await page.goto("/#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await expect(page.locator("[data-phone]")).toBeVisible();
    await page.goto("/#model");
    await expect(page.locator(".row").first()).toBeVisible();
    await expect(page.locator('[data-nav="model"]')).toHaveAttribute("aria-current", "page");
  });

  test("новые маршруты: обзор, обращения и карточка работают", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-nav="dashboard"]')).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-dashboard]")).toBeVisible();
    await page.goto("/#incidents");
    await expect(page.locator("[data-incidents-table]")).toBeVisible();
    await page.goto("/#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await expect(page.locator("[data-incident-detail]")).toBeVisible();
  });

  test("mobile: сайдбар скрыт, открывается кнопкой меню", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    await expect(page.locator("[data-menu]")).toBeVisible();
    await expect(page.locator("[data-sidebar]")).toBeHidden();
    await page.locator("[data-menu]").click();
    await expect(page.locator("[data-sidebar]")).toBeVisible();
  });
});
