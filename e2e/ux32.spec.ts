import { expect, test } from "@playwright/test";

const DAY = "2026-01-02";
const queue = "/#incidents?at=" + DAY + "&view=review";

test.describe("UX-3.2.1: контракт URL и состояние фильтров", () => {
  test("A. прямое открытие view=review показывает очередь", async ({ page }) => {
    await page.goto(queue);
    await page.waitForSelector("[data-incidents-table]");
    await expect(page.locator("[data-filter-review]")).toHaveValue("pending");
    const rows = await page.locator("[data-incident-row]").count();
    expect(rows).toBeGreaterThan(0);
    await expect(page.locator("[data-incidents-count]")).toContainText(String(rows));
  });

  test("B. legacy review=pending открывает ту же выборку и заменяется каноническим параметром", async ({ page }) => {
    await page.goto("/#incidents?at=" + DAY + "&review=pending");
    await page.waitForSelector("[data-incidents-table]");
    const legacyRows = await page.locator("[data-incident-row]").count();
    await expect(page.locator("[data-filter-review]")).toHaveValue("pending");
    await page.locator("[data-search]").fill("З-0");
    await page.waitForTimeout(400);
    const url = decodeURIComponent(page.url());
    expect(url).toContain("view=review");
    expect(url).not.toContain("review=pending");
    expect(legacyRows).toBeGreaterThan(0);
  });

  test("C. период сохраняется при смене представления", async ({ page }) => {
    await page.goto(queue);
    await page.locator("[data-filter-review]").selectOption("all");
    await page.waitForTimeout(400);
    const url = decodeURIComponent(page.url());
    expect(url).toContain("at=" + DAY);
    expect(url).not.toContain("view=review");
    await expect(page.locator("[data-filter-review]")).toHaveValue("all");
  });

  test("D. подразделение сохраняется при изменении других фильтров", async ({ page }) => {
    await page.goto("/#incidents?at=" + DAY);
    await page.waitForSelector("[data-incidents-table]");
    const all = await page.locator("[data-incident-row]").count();
    await page.goto("/#incidents?at=" + DAY + "&department=DEP-HOUSING");
    await page.waitForSelector("[data-incidents-table]");
    const filtered = await page.locator("[data-incident-row]").count();
    expect(filtered).toBeLessThan(all);
    await page.locator("[data-sort]").selectOption("priority");
    await page.waitForTimeout(400);
    const url = decodeURIComponent(page.url());
    expect(url).toContain("department=DEP-HOUSING");
    expect(url).toContain("at=" + DAY);
  });

  test("E. обновление страницы восстанавливает фильтры", async ({ page }) => {
    await page.goto("/#incidents?at=" + DAY + "&view=review&priority=urgent&sort=date");
    await page.waitForSelector("[data-incidents-table]");
    const before = await page.locator("[data-incident-row]").count();
    await page.reload();
    await page.waitForSelector("[data-incidents-table]");
    await expect(page.locator("[data-filter-review]")).toHaveValue("pending");
    await expect(page.locator("[data-filter-priority]")).toHaveValue("urgent");
    await expect(page.locator("[data-sort]")).toHaveValue("date");
    expect(await page.locator("[data-incident-row]").count()).toBe(before);
  });

  test("F. скопированная ссылка открывается в другой вкладке с тем же состоянием", async ({ page, context }) => {
    await page.goto("/#incidents?at=" + DAY + "&view=review");
    await page.waitForSelector("[data-incidents-table]");
    const rows = await page.locator("[data-incident-row]").count();
    const shared = new URL(page.url()).hash;
    const other = await context.newPage();
    await other.goto("/" + shared);
    await other.waitForSelector("[data-incidents-table]");
    await expect(other.locator("[data-filter-review]")).toHaveValue("pending");
    expect(await other.locator("[data-incident-row]").count()).toBe(rows);
    await other.close();
  });

  test("G. back/forward восстанавливают состояние фильтров", async ({ page }) => {
    await page.goto("/#incidents?at=" + DAY);
    await page.waitForSelector("[data-incidents-table]");
    await page.locator("[data-filter-priority]").selectOption("urgent");
    await page.waitForTimeout(400);
    await expect(page.locator("[data-filter-priority]")).toHaveValue("urgent");
    await page.goBack();
    await page.waitForSelector("[data-incidents-table]");
    await expect(page.locator("[data-filter-priority]")).toHaveValue("");
    await page.goForward();
    await page.waitForSelector("[data-incidents-table]");
    await expect(page.locator("[data-filter-priority]")).toHaveValue("urgent");
  });

  test("H. некорректные параметры обрабатываются безопасно", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/#incidents?at=" + DAY + "&view=нечто&department=ЧУЖОЕ&sla=никогда&priority=супер&sort=хаос");
    await page.waitForSelector("[data-incidents-table]");
    await expect(page.locator("[data-filter-review]")).toHaveValue("all");
    await expect(page.locator("[data-filter-sla]")).toHaveValue("");
    await expect(page.locator("[data-sort]")).toHaveValue("id");
    expect(await page.locator("[data-incident-row]").count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("I. «Завершено за период» не создаёт переход", async ({ page }) => {
    await page.goto("/#dashboard?at=" + DAY);
    await page.waitForSelector("[data-dashboard]");
    const card = page.locator('[data-kpi="completed"]');
    await expect(card).toBeVisible();
    expect(await card.locator("a").count()).toBe(0);
    const before = page.url();
    await card.click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
    expect(page.url()).toBe(before);
  });
});
