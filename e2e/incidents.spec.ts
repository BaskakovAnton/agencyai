import { expect, test } from "@playwright/test";

test.describe("Обращения", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#incidents");
    await expect(page.locator(".page-title")).toContainText("Обращения");
  });

  test("таблица показывает 30 заявок с реальными полями", async ({ page }) => {
    await expect(page.locator("[data-incident-row]")).toHaveCount(30);
    const hero = page.locator('[data-incident-row="З-015"]');
    await expect(hero).toContainText("Разбита дверь подъезда");
    await expect(hero).toContainText("U");
  });

  test("поиск сужает список и пишется в адрес", async ({ page }) => {
    await page.locator("[data-search]").fill("З-015");
    await expect(page.locator("[data-incident-row]")).toHaveCount(1);
    await expect.poll(() => decodeURIComponent(page.url())).toContain("q=З-015");
  });

  test("фильтр по приоритету и сброс возвращают весь список", async ({ page }) => {
    await page.locator("[data-filter-priority]").selectOption("urgent");
    const urgent = page.locator("[data-incident-row]");
    expect(await urgent.count()).toBeGreaterThan(0);
    await expect(urgent.first()).toContainText("авария");
    await page.locator("[data-reset]").click();
    await expect(page.locator("[data-incident-row]")).toHaveCount(30);
    await expect.poll(() => decodeURIComponent(page.url())).not.toContain("q=");
  });

  test("параметры фильтра переживают перезагрузку", async ({ page }) => {
    await page.locator("[data-search]").fill("З-015");
    await page.reload();
    await expect(page.locator("[data-search]")).toHaveValue("З-015");
    await expect(page.locator("[data-incident-row]")).toHaveCount(1);
  });

  test("строка ведёт в карточку обращения", async ({ page }) => {
    await page.locator("[data-incident-row]").first().locator("a").first().click();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#incident/");
  });
});
