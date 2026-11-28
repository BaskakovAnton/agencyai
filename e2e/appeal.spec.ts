import { expect, test } from "@playwright/test";

test.describe("Форма обращения: два потока", () => {
  test("сначала выбор потока, затем форма выбранного потока", async ({ page }) => {
    await page.goto("/#appeal");
    await expect(page.locator("[data-appeal-chooser]")).toBeVisible();
    await expect(page.locator('[data-appeal-stream="official"]')).toContainText("Официальное обращение");
    await expect(page.locator('[data-appeal-stream="operational"]')).toContainText("Оперативное сообщение");
    await page.locator('[data-appeal-stream="operational"]').click();
    await expect(page.locator("[data-appeal-form]")).toBeVisible();
    await expect(page.locator('[name="identified"]')).toHaveCount(0);
    await expect(page.locator("[data-appeal-form]")).toContainText("не является официальным обращением");
  });

  test("пустая отправка показывает ошибки и переводит фокус на первое поле", async ({ page }) => {
    await page.goto("/#appeal?stream=operational");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".field-error").first()).toBeVisible();
    await expect(page.locator('[name="text"]')).toHaveAttribute("aria-invalid", "true");
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("name") ?? "")).toBe("name");
  });

  test("оперативный поток: заполнение и подтверждение без статуса обращения", async ({ page }) => {
    await page.goto("/#appeal?stream=operational");
    await page.locator('[name="name"]').fill("Иванов Иван");
    await page.locator('[name="contact"]').fill("ivanov@example.ru");
    await page.locator('[name="text"]').fill("Прошу отремонтировать освещение во дворе дома 12.");
    await page.locator('[name="consent"]').check();
    await page.locator('button[type="submit"]').click();
    const confirm = page.locator('[data-appeal-confirm="operational"]');
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText("не является официальным обращением");
    await expect(confirm).toContainText("Демонстрация");
    await expect(confirm.locator('a[href="#appeal?stream=official"]')).toBeVisible();
  });

  test("официальный поток требует идентификацию и говорит о сроке 30 дней", async ({ page }) => {
    await page.goto("/#appeal?stream=official");
    await expect(page.locator('[name="identified"]')).toHaveCount(1);
    await page.locator('[name="name"]').fill("Петров Пётр");
    await page.locator('[name="contact"]').fill("+7 900 123-45-67");
    await page.locator('[name="text"]').fill("Прошу разъяснить порядок включения двора в программу благоустройства.");
    await page.locator('[name="consent"]').check();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[name="identified"]')).toHaveAttribute("aria-invalid", "true");
    await page.locator('[name="identified"]').check();
    await page.locator('button[type="submit"]').click();
    const confirm = page.locator('[data-appeal-confirm="official"]');
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText("30 дней");
    await expect(confirm).toContainText("номер");
  });

  test("раздел доступен из навигации и в заголовке экрана", async ({ page }) => {
    await page.goto("/#dashboard");
    await page.locator('[data-nav="appeal"]').click();
    await expect(page.locator(".page-title")).toContainText("Обращение");
    await expect(page.locator("[data-appeal-chooser]")).toBeVisible();
  });
});
