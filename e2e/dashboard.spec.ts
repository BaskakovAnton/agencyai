import { expect, test } from "@playwright/test";

test.describe("Обзор", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await expect(page.locator(".page-title")).toContainText("Обзор");
  });

  test("KPI считаются по модели и виден срез даты", async ({ page }) => {
    await expect(page.locator("[data-kpi]")).toHaveCount(4);
    await expect(page.locator("[data-kpi]").first()).toContainText("Активные обращения");
    const total = Number((await page.locator('[data-kpi="active"] .kpi-value').innerText()).trim());
    expect(total).toBeGreaterThan(0);
    await expect(page.locator("[data-day-select]")).toHaveValue("2026-01-02");
  });

  test("блок внимания ведёт в карточку обращения на выбранную дату", async ({ page }) => {
    const link = page.locator("[data-attention] a").first();
    await expect(link).toBeVisible();
    const href = (await link.getAttribute("href")) ?? "";
    expect(href).toContain("#incident/");
    expect(href).toContain("at=2026-01-02");
    await link.click();
    await expect(page.locator(".page-title")).toContainText("Обращение");
  });

  test("смена даты обновляет адрес и цифры", async ({ page }) => {
    await page.locator("[data-day-select]").selectOption("2026-01-05");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("at=2026-01-05");
  });

  test("дата вне окна модели объясняется текстом (UX-3.2.2)", async ({ page }) => {
    await page.goto("/#dashboard?at=2020-01-01");
    await expect(page.locator("[data-outside-window]")).toContainText("Дата вне доступного периода");
    await expect(page.locator("[data-dashboard]")).toHaveCount(0);
  });
});
