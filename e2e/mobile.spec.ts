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

  for (const width of [360, 390, 430]) {
    test("фильтры реестра на " + width + "px: свёрнутая панель ≤ 220 px", async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/#incidents?at=2026-01-02");
      const bar = page.locator("[data-incidents-filters]");
      await expect(bar).toBeVisible();
      expect(await bar.evaluate((el) => Math.round(el.getBoundingClientRect().height))).toBeLessThanOrEqual(220);
      const toggle = page.locator("[data-filters-toggle]");
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const priority = page.locator("[data-filter-priority]");
      await expect(priority).toBeVisible();
      await priority.selectOption("urgent");
      await expect.poll(() => page.evaluate(() => location.hash)).toContain("priority=urgent");
    });
  }

  for (const width of [360, 390, 430]) {
    test("реестр на " + width + "px: карточки строк вместо горизонтальной прокрутки", async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/#incidents?at=2026-01-02");
      await expect(page.locator("[data-incidents-table]")).toBeVisible();
      await expect(page.locator("[data-incidents-table] thead")).toBeHidden();
      const row = page.locator("[data-incident-row]").first();
      await expect(row).toBeVisible();
      expect(await row.evaluate((el) => getComputedStyle(el).display)).toBe("grid");
      expect(await page.locator("[data-incidents-body]").evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const label = await page.locator("[data-incidents-table] tbody td:nth-child(2)").first().evaluate((el) => getComputedStyle(el, "::before").content);
      expect(label).toContain("Приоритет");
      const anchor = row.locator('a[href*="#incident/"]');
      await expect(anchor).toBeVisible();
      // Ссылка растянута на всю карточку: контракт проверяем по геометрии, клик — по факту перехода.
      const stretched = await anchor.evaluate((el) => ({
        after: getComputedStyle(el, "::after").position,
        inset: getComputedStyle(el, "::after").inset,
        card: getComputedStyle(el.closest("tr") as Element).position,
      }));
      expect(stretched).toEqual({ after: "absolute", inset: "0px", card: "relative" });
      await anchor.click();
      await expect(page).toHaveURL(/#incident/);
    });
  }

  test("планшет 1024px: реестр остаётся таблицей", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/#incidents?at=2026-01-02");
    await expect(page.locator("[data-incidents-table] thead")).toBeVisible();
    expect(await page.locator("[data-incident-row]").first().evaluate((el) => getComputedStyle(el).display)).toBe("table-row");
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
