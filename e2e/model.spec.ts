import { expect, test } from "@playwright/test";

test.describe("Экран «Модель процессов»", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#model");
    await expect(page.locator(".page-title")).toContainText("Модель процесса");
  });

  test("список 30 заявок и приглашение выбрать", async ({ page }) => {
    await expect(page.locator('[data-action="select"]')).toHaveCount(30);
    await expect(page.locator(".side")).toContainText("Выберите заявку");
  });

  test("клавиатура: Enter и Space по строке выбирают заявку", async ({ page }) => {
    const first = page.locator('[data-action="select"]').first();
    const ref = await first.getAttribute("data-ref");
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".side")).toContainText(ref as string);
    await page.locator('[data-action="select"]').nth(1).focus();
    const second = await page.locator('[data-action="select"]').nth(1).getAttribute("data-ref");
    await page.keyboard.press(" ");
    await expect(page.locator(".side")).toContainText(second as string);
  });

  test("выбор заявки раскрывает карточку, «вперёд» и «назад» пишут историю", async ({ page }) => {
    await page.locator('[data-action="select"][data-ref="З-001"]').click();
    await expect(page.locator(".side")).toContainText("З-001");
    await expect(page.locator(".side")).toContainText("U1");
    await page.locator('.side [data-action="forward"]').first().click();
    await expect(page.locator(".side")).toContainText("шаг 1");
    await page.locator('.side [data-action="back"]').first().click();
    await expect(page.locator(".side")).toContainText("шаг 2");
  });

  test("«+4 ч» двигает время и обновляет SLA", async ({ page }) => {
    const slaLine = page.locator(".stats").nth(1);
    await expect(slaLine).toContainText("время 0 ч");
    await page.locator('[data-action="wait"]').click();
    await expect(slaLine).toContainText("время 4 ч");
    await page.locator('[data-action="wait"]').click();
    await expect(slaLine).toContainText("время 8 ч");
  });

  test("массовый шаг двигает заявки, сброс возвращает исходное состояние", async ({ page }) => {
    await expect(page.locator(".stats").first()).toContainText("переходов 0");
    await page.locator('[data-action="sweep"]').click();
    await expect(page.locator(".stats").first()).not.toContainText("переходов 0");
    await page.locator('[data-action="wait"]').click();
    await page.locator('[data-action="reset"]').click();
    await expect(page.locator(".stats").first()).toContainText("переходов 0");
    await expect(page.locator(".stats").nth(1)).toContainText("время 0 ч");
  });

  test("смена роли включает и выключает переходы по правам", async ({ page }) => {
    await page.locator('[data-action="select"][data-ref="З-009"]').click();
    // заявка на U9: соседи U8, U10, U6, U16. У подрядчика U8 «Подтверждение принятия» и U10 свои,
    // а U6 и U16 — чужие, поэтому кнопки переходов туда выключены
    await page.locator('[data-action="role"][data-role="contractor"]').click();
    await expect(page.locator(".rolebar")).toContainText("Подрядчик");
    await expect(page.locator('.side [data-node="U8"]').first()).toBeEnabled();
    await expect(page.locator('.side [data-node="U10"]').first()).toBeEnabled();
    await expect(page.locator('.side [data-node="U6"]').first()).toBeDisabled();
    await expect(page.locator('.side [data-node="U16"]').first()).toBeDisabled();

    await page.locator('[data-action="role"][data-role="deputy"]').click();
    await expect(page.locator(".rolebar")).toContainText("Депутат-диспетчер");
    await expect(page.locator('.side [data-node="U6"]').first()).toBeEnabled();
    await expect(page.locator('.side [data-node="U8"]').first()).toBeDisabled();
  });

  test("в конце процесса шаг вперёд объясняет отказ", async ({ page }) => {
    // З-030 стоит на U30 — дальше идти некуда ни одной роли
    await page.locator('[data-action="select"][data-ref="З-030"]').click();
    await expect(page.locator(".side")).toContainText("U30");
    await page.locator('.side [data-action="forward"]').first().click();
    await expect(page.locator(".notice")).toContainText("нет доступных переходов");
  });
});
