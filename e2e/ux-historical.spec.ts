import { expect, test } from "@playwright/test";

test.describe("UX-3.1.1/3.1.2: исторический режим и индикация", () => {
  test("исторический срез запрещает действия и объясняет причину", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-001") + "?at=2026-01-02");
    await expect(page.locator("[data-org-confirmation]")).toBeVisible();
    await expect(page.locator("[data-historical]")).toBeVisible();
    await expect(page.locator("[data-org-confirmation]")).toContainText("историческое состояние");
    for (const action of ["submit", "approve", "reject", "reopen"]) {
      await expect(page.locator('[data-org-action="' + action + '"]')).toBeDisabled();
    }
  });

  test("текущая дата разрешает действия по правилам домена", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-001"));
    await expect(page.locator("[data-org-confirmation]")).toBeVisible();
    await expect(page.locator("[data-historical]")).toHaveCount(0);
    await expect(page.locator('[data-org-action="submit"]')).toBeEnabled();
  });

  test("состояние обращения в историческом срезе соответствует дате", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-001") + "?at=2026-01-02");
    await expect(page.locator("[data-org-confirmation]")).toContainText("на 02.01");
  });

  test("после переоткрытия текущая карточка снова активна", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-001"));
    await page.locator("[data-org-actor]").selectOption("USR-EXECUTOR");
    await page.getByRole("button", { name: "Сообщить о выполнении" }).click();
    await expect(page.locator("[data-org-message]")).toContainText("Готово");
    await page.locator("[data-org-actor]").selectOption("USR-CONTROL");
    await page.getByRole("button", { name: "Подтвердить завершение" }).click();
    await expect(page.locator("[data-org-confirmation]")).toContainText("Завершено");
    await page.getByRole("button", { name: "Переоткрыть" }).click();
    await expect(page.locator("[data-org-confirmation]")).toContainText("Переоткрыто");
  });

  test("индикатор исторического среза виден на Dashboard и в реестре, на текущей дате — нет", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await expect(page.locator("[data-historical-indicator]")).toBeVisible();
    await expect(page.locator("[data-historical-indicator]")).toContainText("2 января 2026");
    await page.goto("/#dashboard");
    await expect(page.locator("[data-historical-indicator]")).toHaveCount(0);

    await page.goto("/#incidents?at=2026-01-02");
    await expect(page.locator("[data-historical-indicator]")).toBeVisible();
    await expect(page.locator("[data-historical-indicator]")).toContainText("2 января 2026");
    await page.goto("/#incidents");
    await expect(page.locator("[data-historical-indicator]")).toHaveCount(0);
  });

  test("смена дня в реестре обновляет индикатор и сохраняет таблицу", async ({ page }) => {
    await page.goto("/#incidents?at=2026-01-02");
    await expect(page.locator("[data-historical-indicator]")).toBeVisible();
    const historicalRows = await page.locator("[data-incident-row]").count();
    await page.goto("/#incidents");
    await expect(page.locator("[data-historical-indicator]")).toHaveCount(0);
    expect(await page.locator("[data-incident-row]").count()).toBeGreaterThan(0);
    expect(historicalRows).toBeGreaterThan(0);
  });
});
