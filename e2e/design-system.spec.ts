import { expect, test } from "@playwright/test";

test.describe("Дизайн-система и оболочка", () => {
  test("оболочка: тёмный сайдбар 250 и топбар 68 по эталону", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0f1115");
    const sidebar = page.locator("ui-sidebar[data-sidebar]");
    await expect(sidebar).toBeVisible();
    const bg = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(23, 26, 33)");
    const width = await sidebar.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    expect(width).toBe(250);
    const top = await page.locator("ui-topbar[data-topbar]").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(top).toBe(68);
  });

  test("типографика и фон соответствуют токенам кита", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    const title = await page.locator(".page-title").evaluate((el) => getComputedStyle(el).fontSize);
    expect(title).toBe("28px");
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBe("rgb(15, 17, 21)");
  });

  test("на экранах нет кеглей меньше 12 px и нет инлайновых цветов", async ({ page }) => {
    for (const hash of ["#dashboard?at=2026-01-02", "#incidents", "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02", "#model"]) {
      await page.goto("/" + hash);
      await page.waitForTimeout(300);
      const small = await page.evaluate(() => Array.from(document.querySelectorAll("#view *")).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12).length);
      expect(small).toBe(0);
      const inlineColors = await page.evaluate(() => Array.from(document.querySelectorAll("#view *[style]")).filter((el) => /color:/i.test(el.getAttribute("style") ?? "")).length);
      expect(inlineColors).toBe(0);
    }
  });

  test("все шесть маршрутов живут в новой оболочке", async ({ page }) => {
    for (const hash of ["#dashboard", "#incidents", "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02", "#timeline?at=2026-01-02&view=gantt", "#timeline?at=2026-01-02&view=gantt", "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02", "#model"]) {
      await page.goto("/" + hash);
      await expect(page.locator("ui-sidebar")).toBeVisible();
      await expect(page.locator("ui-topbar")).toBeVisible();
      await expect(page.locator(".page-title")).not.toBeEmpty();
    }
  });
});
