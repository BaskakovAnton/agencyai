import { expect, test } from "@playwright/test";

test.describe("Модуль 2 · Переписка по ролям", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#chat");
    await expect(page.locator("h1.brand")).toHaveText("Переписка по ролям");
  });

  test("список заявок показывает 30 строк и З-015 выбрана", async ({ page }) => {
    await expect(page.locator("[data-pane='list'] .inc-row")).toHaveCount(30);
    await expect(page.locator("[data-pane='list'] .inc-row.on")).toContainText("З-015");
  });

  test("стартовый узел U1, роль Житель, сообщение жителя", async ({ page }) => {
    await expect(page.locator("[data-role-badge]")).toHaveText("Житель");
    await expect(page.locator('[data-step="U1"]')).toHaveClass(/current/);
    await expect(page.locator("[data-messages]")).toContainText("разбита дверь подъезда");
  });

  test("следующий узел переключает роль на диспетчера и показывает системное сообщение", async ({ page }) => {
    await page.locator('[data-action="next"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Депутат-диспетчер");
    await expect(page.locator('[data-step="U1"]')).toHaveClass(/done/);
    await expect(page.locator('[data-step="U6"]')).toHaveClass(/current/);
    await expect(page.locator("[data-messages]")).toContainText("передана в работу");
    await expect(page.locator("[data-messages]")).toContainText("Кто может выехать");
  });

  test("узел U7: роль Подрядчик, карточки SLA и подрядчика, автоответ бригады", async ({ page }) => {
    await page.locator('[data-action="next"]').click();
    await page.locator('[data-action="next"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Подрядчик");
    await expect(page.locator('[data-card="sla"]')).toBeVisible();
    await expect(page.locator('[data-card="contractor"]')).toBeVisible();
    await expect(page.locator("[data-messages]")).toContainText("Бригада выехала");
    await expect(page.locator("[data-messages]")).toContainText("40 минут");
  });

  test("узел U19 возвращает роль Жителя и просит подтвердить результат", async ({ page }) => {
    for (let i = 0; i < 3; i += 1) await page.locator('[data-action="next"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Житель");
    await expect(page.locator('[data-step="U19"]')).toHaveClass(/current/);
    await expect(page.locator("[data-messages]")).toContainText("Подтвердите");
  });

  test("кнопка «Сменить роль» меняет роль-симуляцию", async ({ page }) => {
    await expect(page.locator("[data-role-badge]")).toHaveText("Житель");
    await page.locator('[data-action="cycle-role"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Депутат-диспетчер");
  });

  test("шаг назад возвращает предыдущий узел", async ({ page }) => {
    await page.locator('[data-action="next"]').click();
    await expect(page.locator('[data-step="U6"]')).toHaveClass(/current/);
    await page.locator('[data-action="prev"]').click();
    await expect(page.locator('[data-step="U1"]')).toHaveClass(/current/);
  });

  test("авто-плеер сам проходит сценарий до конца", async ({ page }) => {
    await page.locator('[data-action="play"]').click();
    await expect(page.locator('[data-step="U19"]')).toHaveClass(/current/, { timeout: 8000 });
    await expect(page.locator("[data-role-badge]")).toHaveText("Житель");
  });
});
