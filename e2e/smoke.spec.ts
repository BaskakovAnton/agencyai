import { expect, test } from "@playwright/test";

/**
 * Базовый кросс-браузерный набор (B1): 6 маршрутов × 2 вьюпорта.
 * Гоняется в chromium, firefox и webkit — проверяет то, что чаще всего расходится между движками.
 */
const routes: readonly (readonly [string, string])[] = [
  ["#dashboard?at=2026-01-02", "[data-dashboard]"],
  ["#incidents?at=2026-01-02", "[data-incidents-table]"],
  ["#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02", "[data-incident-detail]"],
  ["#timeline?at=2026-01-02", "[data-timeline]"],
  ["#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02", "[data-phone]"],
  ["#model", ".row"],
];

for (const [width, height] of [[390, 844], [1440, 900]] as const) {
  test.describe("Базовый прогон " + width + "px", () => {
    test.use({ viewport: { width, height } });
    for (const [hash, selector] of routes) {
      test("открывается: " + hash, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        await page.goto("/" + hash);
        await expect(page.locator(selector).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
        await expect(page.locator(".brand b")).toHaveText("ДЕПУТАТ 360°");
        expect(errors, JSON.stringify(errors)).toEqual([]);
      });
    }
  });
}
