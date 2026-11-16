import { expect, test } from "@playwright/test";

test.describe("Модуль 2 · Переписка по ролям", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#chat");
    await expect(page.locator("[data-role-badge]")).toBeVisible();
  });

  test("стартовый шаг: узел U1, роль Житель, сообщение жителя", async ({ page }) => {
    await expect(page.locator("[data-role-badge]")).toHaveText("Житель");
    await expect(page.locator('[data-step="U1"]')).toHaveClass(/current/);
    await expect(page.locator('[data-step="U6"]')).toHaveClass(/todo/);
    await expect(page.locator("[data-messages]")).toContainText("разбита дверь подъезда");
    await expect(page.locator("[data-passport]")).toContainText("З-015");
  });

  test("список заявок: 30 строк, выбрана З-015", async ({ page }) => {
    await expect(page.locator("[data-pane=list] .inc-row")).toHaveCount(30);
    await expect(page.locator("[data-pane=list] .inc-row.on")).toContainText("З-015");
  });

  test("следующий узел переключает роль на диспетчера и добавляет системное сообщение", async ({ page }) => {
    await page.locator('[data-action="next"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Депутат-диспетчер");
    await expect(page.locator('[data-step="U1"]')).toHaveClass(/done/);
    await expect(page.locator('[data-step="U6"]')).toHaveClass(/current/);
    await expect(page.locator("[data-messages]")).toContainText("передана в работу");
    await expect(page.locator("[data-messages]")).toContainText("Кто может выехать на З-015?");
  });

  test("узел U7: роль подрядчика, карточки SLA и подрядчика, ответ бригады", async ({ page }) => {
    await page.locator('[data-action="next"]').click();
    await page.locator('[data-action="next"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Подрядчик");
    await expect(page.locator('[data-step="U7"]')).toHaveClass(/current/);
    await expect(page.locator('[data-card="sla"]')).toContainText("SLA заявки З-015");
    await expect(page.locator('[data-card="contractor"]')).toContainText("Дом-Сервис");
    await expect(page.locator("[data-messages]")).toContainText("Бригада выехала");
    await expect(page.locator("[data-messages]")).toContainText("40 минут");
  });

  test("узел U19 возвращает роль жителя и просит подтвердить результат", async ({ page }) => {
    for (let i = 0; i < 3; i += 1) await page.locator('[data-action="next"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Житель");
    await expect(page.locator('[data-step="U19"]')).toHaveClass(/current/);
    await expect(page.locator("[data-messages]")).toContainText("Подтвердите");
  });

  test("шаг назад и «Сменить роль» работают", async ({ page }) => {
    await page.locator('[data-action="next"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Депутат-диспетчер");
    await page.locator('[data-action="prev"]').click();
    await expect(page.locator('[data-step="U1"]')).toHaveClass(/current/);
    await page.locator('[data-action="cycle-role"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Депутат-диспетчер");
  });

  test("авто-плеер доводит сценарий до U19", async ({ page }) => {
    await page.locator('[data-action="play"]').click();
    await expect(page.locator('[data-step="U19"]')).toHaveClass(/current/, { timeout: 12_000 });
  });

  test("навигация между тремя модулями работает", async ({ page }) => {
    await page.locator('.nav-link[data-route="dashboard"]').click();
    await expect(page.locator("canvas#chart")).toBeVisible();
    await page.locator('.nav-link[data-route="model"]').click();
    await expect(page.locator('.nav-link[data-route="model"]')).toHaveClass(/on/);
    await page.locator('.nav-link[data-route="chat"]').click();
    await expect(page.locator("[data-role-badge]")).toBeVisible();
  });
});
