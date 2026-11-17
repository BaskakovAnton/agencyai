import { expect, test } from "@playwright/test";

test.describe("Стиль DarkStore", () => {
  test("оболочка: тёмный сайдбар и топбар 76", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    const sidebar = page.locator("[data-sidebar]");
    await expect(sidebar).toBeVisible();
    const bg = await sidebar.evaluate((el) => getComputedStyle(el).backgroundImage + " " + getComputedStyle(el).backgroundColor);
    expect(bg).toContain("17, 26, 24");
    const top = await page.locator("[data-topbar]").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(top).toBe(76);
  });

  test("полоса дней ведёт в дату и помечает выбор", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    const chips = page.locator("[data-day-chip]");
    await expect(chips).toHaveCount(6);
    await expect(page.locator('[data-day-chip="2026-01-02"]')).toHaveAttribute("aria-pressed", "true");
    await chips.first().click();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#dashboard?at=");
  });

  test("матрица SLA: заголовки со scope и без мелких кеглей", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await expect(page.locator("[data-sla-matrix] th[scope=col]").first()).toBeVisible();
    await expect(page.locator("[data-matrix-row]")).toHaveCount(4);
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#view *")).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12).length);
    expect(small).toBe(0);
  });

  test("остальные экраны живут в той же теме", async ({ page }) => {
    for (const hash of ["#incidents", "#timeline?at=2026-01-02&view=git", "#model", "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02"]) {
      await page.goto("/" + hash);
      await expect(page.locator("[data-sidebar]")).toBeVisible();
      await expect(page.locator("[data-topbar]")).toBeVisible();
    }
  });
});
