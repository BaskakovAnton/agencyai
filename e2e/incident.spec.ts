import { expect, test } from "@playwright/test";

test.describe("Карточка обращения", () => {
  test("показывает заявку, узел, SLA и историю на выбранную дату", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await expect(page.locator(".page-title")).toContainText("З-015");
    await expect(page.locator("[data-incident-detail]")).toContainText("Разбита дверь подъезда");
    await expect(page.locator("[data-current]")).toContainText("U6");
    await expect(page.locator("[data-sla]")).toContainText("SLA");
    await expect(page.locator("[data-history-row]")).toHaveCount(1);
    await expect(page.locator("[data-next]")).toBeVisible();
    await expect(page.locator("[data-decision-card]")).toBeVisible();
    await expect(page.locator("[data-current-role]")).toContainText("Депутат-диспетчер");
  });

  test("ссылки ведут в чат и хронологию с той же датой", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await page.locator('[data-links] a[href^="#chat/"]').click();
    await expect(page.locator("[data-phone]")).toBeVisible();
    await page.goBack();
    await page.locator('[data-links] a[href*="view=git"]').click();
    await expect(page.locator("svg[data-graph]")).toBeVisible();
  });

  test("смена даты среза пишется в адрес", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await page.locator("[data-day-select]").selectOption("2026-01-03");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("at=2026-01-03");
  });

  test("неизвестный id показывает сообщение и возвращает к списку", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-999") + "?at=2026-01-02");
    await expect(page.locator("[data-incident-missing]")).toContainText("не найдена");
    await page.locator('[data-incident-missing] a[href^="#incidents"]').click();
    await expect(page.locator("[data-incidents-table]")).toBeVisible();
  });
});
