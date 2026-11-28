import { expect, test, type Page } from "@playwright/test";

const ROUTES: readonly (readonly [string, string])[] = [
  ["dashboard", "/#dashboard?at=2026-01-02"],
  ["incidents", "/#incidents?at=2026-01-02"],
  ["incident", "/#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02"],

  ["timeline", "/#timeline?at=2026-01-02&view=gantt"],
  ["chat", "/#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02"],
  ["model", "/#model"],
];

const SIZES: readonly (readonly [string, number, number])[] = [
  ["1440", 1440, 1000],
  ["1024", 1024, 900],
  ["768", 768, 1024],
  ["390", 390, 844],
];

const openAll = async (page: Page, hash: string): Promise<void> => {
  await page.goto(hash);
  await page.waitForTimeout(250);
};

test.describe("Выпускная регрессия", () => {
  test("все семь экранов открываются в оболочке и с заголовком", async ({ page }) => {
    for (const [name, hash] of ROUTES) {
      await openAll(page, hash);
      await expect(page.locator("ui-sidebar"), name).toBeVisible();
      await expect(page.locator("ui-topbar"), name).toBeVisible();
      await expect(page.locator(".page-title"), name).not.toBeEmpty();
      await expect(page.locator("#view"), name).not.toBeEmpty();
    }
  });

  test("параметры адреса переживают перезагрузку и Back/Forward", async ({ page }) => {
    await openAll(page, "/#timeline?at=2026-01-02&view=gantt");
    await expect(page).toHaveURL(/view=gantt/);
    await page.reload();
    await expect(page).toHaveURL(/at=2026-01-02&view=gantt/);
    await openAll(page, "/#incidents?at=2026-01-02&q=З-015");
    await expect(page.locator("[data-incident-row]")).toHaveCount(1);
    await page.goBack();
    await expect(page).toHaveURL(/view=gantt/);
    await page.goForward();
    await expect(page).toHaveURL(/q=/);
    await expect(page.locator("[data-incident-row]")).toHaveCount(1);
  });

  test("страница не прокручивается по горизонтали на четырёх размерах", async ({ page }) => {
    for (const [sizeName, width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      for (const [name, hash] of ROUTES) {
        await openAll(page, hash);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, sizeName + " " + name).toBeLessThanOrEqual(2);
      }
    }
  });

  test("клавиатура: видимый фокус и переход в карточку по Enter", async ({ page }) => {
    await openAll(page, "/#incidents?at=2026-01-02");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el === null || el === document.body) return "";
      const style = getComputedStyle(el);
      return style.outlineStyle + " " + style.outlineWidth;
    });
    expect(outline).not.toBe("");
    expect(outline).not.toContain("none");
    await openAll(page, "/#timeline?at=2026-01-02&view=gantt");
    const row = page.locator("[data-row]").first();
    await row.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/");
  });
});
