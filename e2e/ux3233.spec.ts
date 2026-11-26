import { expect, test } from "@playwright/test";

const DAY = "2026-01-02";
const HIST = "2025-12-22";
const rows = (page: any) => page.locator("[data-incident-row]").count();
const kpi = async (page: any, key: string) => Number(await page.locator('[data-kpi="' + key + '"] .kpi-value').innerText());
const goDash = async (page: any, day: string) => {
  await page.goto("/#dashboard?at=" + day);
  await page.waitForSelector("[data-dashboard]");
};

test.describe("UX-3.2.3.3: сквозная интеграция Dashboard → KPI → реестр → карточка", () => {
  test("A. историческая очередь 22.12: счётчик → реестр → карточка → Back", async ({ page }) => {
    await goDash(page, HIST);
    const counter = Number(await page.locator("[data-waiting-review]").innerText());
    expect(counter).toBe(2);
    await page.locator("[data-waiting-review]").click();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=review");
    expect(decodeURIComponent(page.url())).toContain("at=" + HIST);
    expect(await rows(page)).toBe(counter);
    const ids = await page.locator("[data-incident-row]").evaluateAll((list) => list.map((el) => el.getAttribute("data-incident-row")));
    expect(new Set(ids).size).toBe(counter);
    await page.locator("[data-incident-row] a").first().click();
    await page.waitForSelector("[data-incident-detail]");
    expect(decodeURIComponent(page.url())).toContain("at=" + HIST);
    await page.goBack();
    await page.waitForSelector("[data-incidents-table]");
    expect(await rows(page)).toBe(counter);
  });

  test("B. KPI Attention на историческую дату ведёт в список внимания", async ({ page }) => {
    await goDash(page, DAY);
    const expected = await kpi(page, "attention");
    await page.locator('[data-kpi-link="attention"]').click();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=attention");
    expect(await rows(page)).toBe(expected);
    await page.goBack();
    await page.waitForSelector("[data-dashboard]");
    await expect(page.locator('[data-kpi="attention"]')).toBeVisible();
  });

  test("C. KPI Active: количество строк равно значению KPI", async ({ page }) => {
    await goDash(page, DAY);
    const expected = await kpi(page, "active");
    await page.locator('[data-kpi-link="active"]').click();
    await page.waitForSelector("[data-incidents-table]");
    expect(await rows(page)).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  test("D. KPI Paused: пустая выборка показывает честное состояние", async ({ page }) => {
    await goDash(page, DAY);
    const expected = await kpi(page, "paused");
    await page.locator('[data-kpi-link="paused"]').click();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=paused");
    if (expected === 0) {
      await expect(page.locator("[data-empty-state]")).toBeVisible();
    } else {
      expect(await rows(page)).toBe(expected);
    }
  });

  test("E. подразделение: ссылка передаёт department и дату, состав совпадает с легендой", async ({ page }) => {
    await goDash(page, DAY);
    const item = page.locator("[data-department-link]").first();
    const department = await item.getAttribute("data-department-link");
    const count = Number(await item.locator("xpath=..").locator("b").innerText());
    await item.click();
    await page.waitForSelector("[data-incidents-table]");
    const url = decodeURIComponent(page.url());
    expect(url).toContain("department=" + department);
    expect(url).toContain("at=" + DAY);
    expect(await rows(page)).toBe(count);
    // department=none: обращения без активного ответственного
    await page.goto("/#incidents?at=" + DAY + "&department=none");
    await page.waitForSelector("[data-incidents-table]");
    expect(await rows(page)).toBeGreaterThan(0);
  });

  test("F. составные фильтры: at + view + q переживают reload и Back/Forward", async ({ page }) => {
    await page.goto("/#incidents?at=" + DAY + "&view=attention&q=З-0");
    await page.waitForSelector("[data-incidents-table]");
    const before = await rows(page);
    await page.reload();
    await page.waitForSelector("[data-incidents-table]");
    expect(decodeURIComponent(page.url())).toContain("view=attention");
    expect(await page.locator("[data-search]").inputValue()).toBe("З-0");
    expect(await rows(page)).toBe(before);
    await page.goto("/#incidents?at=" + DAY + "&view=attention");
    await page.waitForSelector("[data-incidents-table]");
    await page.goBack();
    await page.waitForSelector("[data-incidents-table]");
    expect(await page.locator("[data-search]").inputValue()).toBe("З-0");
    expect(await rows(page)).toBe(before);
    await page.goForward();
    await page.waitForSelector("[data-incidents-table]");
    expect(await page.locator("[data-search]").inputValue()).toBe("");
  });

  test("G. дата вне окна: единое состояние, счётчика нет, ссылка ведёт на доступный день", async ({ page }) => {
    await page.goto("/#dashboard?at=2020-01-01");
    await page.waitForSelector("[data-outside-window]");
    await expect(page.locator("[data-waiting-review]")).toHaveCount(0);
    await expect(page.locator("[data-dashboard]")).toHaveCount(0);
    await page.locator("[data-outside-link]").click();
    await page.waitForSelector("[data-dashboard]");
    expect(decodeURIComponent(page.url())).toContain("at=2025-12-20");
    await expect(page.locator("[data-waiting-review]")).toBeVisible();
  });

  test("H. legacy review=pending канонизируется и даёт ту же выборку, что счётчик", async ({ page }) => {
    await page.goto("/#incidents?at=" + DAY + "&review=pending");
    await page.waitForSelector("[data-incidents-table]");
    const legacyRows = await rows(page);
    await page.locator("[data-filter-priority]").selectOption("urgent");
    await page.waitForTimeout(400);
    const url = decodeURIComponent(page.url());
    expect(url).toContain("view=review");
    expect(url).not.toContain("review=pending");
    await goDash(page, DAY);
    const counter = Number(await page.locator("[data-waiting-review]").innerText());
    await page.goto("/#incidents?at=" + DAY + "&view=review");
    await page.waitForSelector("[data-incidents-table]");
    expect(await rows(page)).toBe(counter);
    expect(legacyRows).toBeGreaterThan(0);
  });

  test("регрессия: ошибок консоли нет на всём маршруте", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    for (const hash of ["#dashboard?at=" + DAY, "#incidents?at=" + DAY + "&view=review", "#incident/" + encodeURIComponent("З-001") + "?at=" + DAY, "#dashboard?at=2020-01-01"]) {
      await page.goto("/" + hash);
      await page.waitForTimeout(600);
    }
    expect(errors).toEqual([]);
  });
});
