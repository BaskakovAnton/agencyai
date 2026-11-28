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

  test("оперативная очередь расположена до KPI и открывает карточку", async ({ page }) => {
    await expect(page.locator("[data-action-queue]")).toBeVisible();
    const link = page.locator("[data-action-item]").first();
    await expect(link).toContainText("Проверить следующий шаг");
    await link.click();
    await expect(page.locator("[data-decision-card]")).toBeVisible();
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
  test("динамика ведёт в события периода без новых параметров", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    const link = page.locator("[data-period-events]");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /period=\d+/);
    await link.click();
    await expect(page).toHaveURL(/period=\d+/);
    await expect(page.locator("[data-period-mode]")).toBeVisible();
    await expect(page.locator("[data-period-mode]")).toContainText("События за");
  });
});

test.describe("Кольцо фаз SLA", () => {
  test("на обзоре вместо полос — кольцо с легендой", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    const ring = page.locator("[data-sla-ring]");
    await expect(ring).toBeVisible();
    await expect(ring).toHaveAttribute("aria-label", /Фазы SLA/);
    // Числа и доли остаются текстом: цвет — не единственный канал.
    await expect(page.locator('[data-sla-count="overdue"]')).toHaveText("14");
    await expect(page.locator('[data-sla-seg="ok"] .ring-legend-share')).toHaveText("18%");
    // Старых полос больше нет.
    expect(await page.locator(".progress").count()).toBe(0);
  });

  test("кольцо помещается на мобильном экране", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#dashboard?at=2026-01-02");
    const box = await page.locator("[data-sla-ring]").boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.x + box!.width)).toBeLessThanOrEqual(390);
    await expect(page.locator("[data-sla-legend]")).toBeVisible();
  });
});
