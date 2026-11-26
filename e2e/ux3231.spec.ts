import { expect, test } from "@playwright/test";

const DAY = "2026-01-02";
const dashboard = "/#dashboard?at=" + DAY;
const kpiValue = async (page: any, key: string) => Number(await page.locator('[data-kpi="' + key + '"] .kpi-value').innerText());

test.describe("UX-3.2.3.1: контекстные переходы и историческая очередь", () => {
  test("KPI «Активные обращения» ведёт в список активных на ту же дату", async ({ page }) => {
    await page.goto(dashboard);
    await page.waitForSelector("[data-dashboard]");
    const expected = await kpiValue(page, "active");
    await page.locator('[data-kpi-link="active"]').click();
    await page.waitForSelector("[data-incidents-table]");
    const url = decodeURIComponent(page.url());
    expect(url).toContain("view=active");
    expect(url).toContain("at=" + DAY);
    expect(await page.locator("[data-incident-row]").count()).toBe(expected);
  });

  test("KPI «Требуют внимания» ведёт в список внимания", async ({ page }) => {
    await page.goto(dashboard);
    await page.waitForSelector("[data-dashboard]");
    const expected = await kpiValue(page, "attention");
    await page.locator('[data-kpi-link="attention"]').click();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=attention");
    expect(await page.locator("[data-incident-row]").count()).toBe(expected);
  });

  test("KPI «На паузе» ведёт в список пауз", async ({ page }) => {
    await page.goto(dashboard);
    await page.waitForSelector("[data-dashboard]");
    await page.locator('[data-kpi-link="paused"]').click();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=paused");
  });

  test("«Завершено за период» осталось без перехода", async ({ page }) => {
    await page.goto(dashboard);
    await page.waitForSelector("[data-dashboard]");
    await expect(page.locator('[data-kpi="completed"] a')).toHaveCount(0);
    await expect(page.locator('[data-kpi-link="completed"]')).toHaveCount(0);
  });

  test("счётчик очереди совпадает с числом строк после перехода (историческая семантика)", async ({ page }) => {
    for (const day of [DAY, "2025-12-22", "2025-12-23", "2025-12-28"]) {
      await page.goto("/#dashboard?at=" + day);
      await page.waitForSelector("[data-dashboard]");
      const counter = Number(await page.locator("[data-waiting-review]").innerText());
      await page.locator("[data-waiting-review]").click();
      await page.waitForSelector("[data-incidents-table]");
      expect(decodeURIComponent(page.url())).toContain("view=review");
      expect({ day, rows: await page.locator("[data-incident-row]").count() }).toEqual({ day, rows: counter });
    }
  });

  test("разрез по подразделению ведёт в свой список с той же датой", async ({ page }) => {
    await page.goto(dashboard);
    await page.waitForSelector("[data-department-link]");
    const link = page.locator("[data-department-link]").first();
    const department = await link.getAttribute("data-department-link");
    await link.click();
    await page.waitForSelector("[data-incidents-table]");
    const url = decodeURIComponent(page.url());
    expect(url).toContain("department=" + department);
    expect(url).toContain("at=" + DAY);
    expect(await page.locator("[data-incident-row]").count()).toBeGreaterThan(0);
  });

  test("панель внимания сохраняет контекст, Back и Forward работают", async ({ page }) => {
    await page.goto(dashboard);
    await page.waitForSelector("[data-dashboard]");
    await page.locator('a.panel-link[href*="view=attention"]').first().click();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=attention");
    await page.goBack();
    await page.waitForSelector("[data-dashboard]");
    await expect(page.locator("[data-dashboard]")).toBeVisible();
    await page.goForward();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=attention");
  });

  test("после перехода reload сохраняет фильтр, ссылка доступна с клавиатуры", async ({ page }) => {
    await page.goto(dashboard);
    await page.waitForSelector("[data-dashboard]");
    await page.locator('[data-kpi-link="active"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-incidents-table]");
    await page.reload();
    await page.waitForSelector("[data-incidents-table]");
    const rows = await page.locator("[data-incident-row]").count();
    expect(decodeURIComponent(page.url())).toContain("view=active");
    expect(rows).toBeGreaterThan(0);
  });
});
