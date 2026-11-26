import { expect, test } from "@playwright/test";

test.describe("UX-3: периоды и динамика KPI", () => {
  test("Dashboard открывается, по умолчанию период 7 дней", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await expect(page.locator("[data-dashboard]")).toBeVisible();
    await expect(page.locator('[data-period-button="7"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-period-button="30"]')).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-dynamics-row]")).toHaveCount(7);
    await expect(page.locator("[data-kpi-delta]").first()).toBeVisible();
  });

  test("переключение на 30 дней обновляет адрес и все зависимые показатели", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await page.locator('[data-period-button="30"]').click();
    await expect.poll(() => page.url()).toContain("period=30");
    await expect(page.locator('[data-period-button="30"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-dynamics-row]")).toHaveCount(30);
    await expect(page.locator(".fact-label", { hasText: "период" }).last()).toContainText("—");
    const periodText = await page.locator(".period-notes").innerText();
    expect(periodText).toContain("Snapshot");
  });

  test("переключение обратно на 7 дней согласовано", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02&period=30");
    await expect(page.locator("[data-dynamics-row]")).toHaveCount(30);
    await page.locator('[data-period-button="7"]').click();
    await expect.poll(() => page.url()).not.toContain("period=30");
    await expect(page.locator("[data-dynamics-row]")).toHaveCount(7);
  });

  test("карточки и панель периода не расходятся, динамика помечена смыслом", async ({ page }) => {
    for (const period of [7, 30]) {
      await page.goto("/#dashboard?at=2026-01-02&period=" + period);
      await expect(page.locator("[data-dynamics-row]")).toHaveCount(period);
      const deltas = await page.locator("[data-kpi-delta]").count();
      expect(deltas).toBeGreaterThanOrEqual(4);
      const firstDelta = await page.locator("[data-kpi-delta]").first().getAttribute("title");
      expect(firstDelta ?? "").toContain("было");
    }
  });

  test("дата вне окна модели показывает единое состояние и ссылку на доступную дату", async ({ page }) => {
    await page.goto("/#dashboard?at=2020-01-01");
    await expect(page.locator("[data-outside-window]")).toContainText("Дата вне доступного периода");
    await expect(page.locator("[data-outside-link]")).toBeVisible();
    await page.locator("[data-outside-link]").click();
    await expect(page.locator("[data-dashboard]")).toBeVisible();
    await expect(page.locator("[data-period-switch]")).toBeVisible();
  });

  test("период переживает перезагрузку и не сбрасывает дату среза", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-05&period=30");
    await page.reload();
    await expect(page.locator("[data-day-select]")).toHaveValue("2026-01-05");
    await expect(page.locator('[data-period-button="30"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("остальные экраны продолжают работать", async ({ page }) => {
    for (const hash of ["#incidents", "#model", "#timeline?at=2026-01-02&view=git"]) {
      await page.goto("/" + hash);
      await expect(page.locator("ui-topbar")).toBeVisible();
      await expect(page.locator(".page-title")).not.toBeEmpty();
    }
  });
});
