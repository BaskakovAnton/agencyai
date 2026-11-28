import { expect, test } from "@playwright/test";

const routes = [
  "#dashboard?at=2026-01-02",
  "#incidents?at=2026-01-02",
  "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02",
  "#timeline?at=2026-01-02&view=git",
  "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02",
  "#model",
];

test.describe("Мобильная адаптация", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("экраны не прокручиваются по горизонтали", async ({ page }) => {
    for (const hash of routes) {
      await page.goto("/" + hash);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });

  test("верхняя панель оставляет удобные зоны касания", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    for (const selector of ["[data-menu]", "[data-theme-toggle]"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(40);
      expect(box?.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("внимание открывается компактной плиткой без горизонтального ухода", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    const card = page.locator("[data-attention-card]").first();
    await expect(card).toBeVisible();
    await expect(card.locator("[data-attention-tile]")).toBeHidden();
    await card.locator("summary").click();
    await expect(card.locator("[data-attention-tile]")).toBeVisible();
    await expect(card.locator("[data-attention-tile]")).toContainText("Подразделение");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
