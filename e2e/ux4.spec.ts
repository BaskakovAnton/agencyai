import { expect, test } from "@playwright/test";

test.describe("UX-4: подразделения и подтверждение завершения", () => {
  test("обзор показывает разрез по подразделениям и ожидание подтверждения", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await expect(page.locator("[data-department-split]")).toBeVisible();
    await expect(page.locator("[data-department-split]").locator("[data-department]").first()).toBeVisible();
    await expect(page.locator("[data-waiting-review]")).toBeVisible();
    await expect(page.locator("[data-attention]").first()).toBeVisible();
    await expect(page.locator("th", { hasText: "Подразделение" })).toBeVisible();
  });

  test("карточка показывает подразделение, участников и панель подтверждения", async ({ page }) => {
    await page.goto("/#incident/З-015?at=2026-01-02");
    await expect(page.locator("[data-org-confirmation]")).toBeVisible();
    await expect(page.locator("[data-org-actor]")).toBeVisible();
    await expect(page.locator("[data-sla]")).toContainText("SLA");
    await expect(page.locator(".detail-facts")).toContainText("Ответственное подразделение");
    await expect(page.locator("[data-org-confirmation]")).toContainText("Подтверждение завершения");
  });

  test("сценарий подтверждения: сдаёт исполнитель, подтверждает контролёр", async ({ page }) => {
    await page.goto("/#incident/З-001?at=2026-01-02");
    await page.locator("[data-org-actor]").selectOption("USR-EXECUTOR");
    await page.getByRole("button", { name: "Сообщить о выполнении" }).click();
    await expect(page.locator("[data-org-message]")).toContainText("Готово");
    // Исполнителю подтверждение недоступно — запрет самоподтверждения и полномочий.
    await expect(page.getByRole("button", { name: "Подтвердить завершение" })).toBeDisabled();
    await page.locator("[data-org-actor]").selectOption("USR-CONTROL");
    await page.getByRole("button", { name: "Подтвердить завершение" }).click();
    await expect(page.locator("[data-org-message]")).toContainText("Готово");
    await expect(page.locator("[data-org-confirmation]")).toContainText("Завершено");
    // Завершённое обращение можно переоткрыть контролёром.
    await page.getByRole("button", { name: "Переоткрыть" }).click();
    await expect(page.locator("[data-org-confirmation]")).toContainText("Переоткрыто");
  });
});
