import { expect, test } from "@playwright/test";

test.describe("Мобильный чат заявки", () => {
  test("выглядит как мессенджер и не содержит поля ввода", async ({ page }) => {
    await page.goto("/#chat/З-015?at=2026-01-02");
    await expect(page.locator("[data-phone]")).toBeVisible();
    await expect(page.locator("[data-phone] .bubble").first()).toBeVisible();
    await expect(page.locator("[data-phone] input, [data-phone] textarea")).toHaveCount(0);
    await expect(page.locator('[data-phone] button:has-text("Отправить")')).toHaveCount(0);
    await expect(page.locator("[data-phone]")).toContainText("отправка недоступна");
    await expect(page.locator("[data-msg]")).toHaveCount(3); // две реплики + системное сообщение о передаче
  });

  test("на 2 января видна только переписка до этой даты", async ({ page }) => {
    await page.goto("/#chat/З-015?at=2026-01-02");
    await expect(page.locator("[data-chat-date]")).toContainText("2 января 2026");
    await expect(page.locator("[data-messages]")).toContainText("Во дворе разбита дверь подъезда");
    await expect(page.locator("[data-messages]")).toContainText("Заявка передана в работу диспетчеру");
    await expect(page.locator("[data-messages]")).toContainText("Назначаю подрядчика");
    await expect(page.locator("[data-messages]")).not.toContainText("Принято, выезжаю");
    const days = await page.locator("[data-msg]").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.day ?? ""),
    );
    expect(days.every((day) => day <= "2026-01-02")).toBe(true);
  });

  test("при смене узла чат сам меняет роль и собеседника", async ({ page }) => {
    const cases: readonly (readonly [string, string, string])[] = [
      ["2026-01-01", "Житель", "Депутат-диспетчер"],
      ["2026-01-02", "Депутат-диспетчер", "Житель"],
      ["2026-01-03", "Подрядчик", "Депутат-диспетчер"],
      ["2026-01-05", "Житель", "Подрядчик"],
    ];
    for (const [day, role, interlocutor] of cases) {
      await page.goto("/#chat/З-015?at=" + day);
      await expect(page.locator("[data-role-badge]")).toHaveText(role);
      await expect(page.locator("[data-interlocutor]")).toHaveText(interlocutor);
    }
  });

  test("«Сменить роль» показывает диалог с другой стороны", async ({ page }) => {
    await page.goto("/#chat/З-015?at=2026-01-03");
    await expect(page.locator("[data-role-badge]")).toHaveText("Подрядчик");
    await expect(page.locator("[data-msg].own")).toHaveCount(1); // реплика подрядчика справа
    await page.locator('[data-action="cycle-role"]').click();
    await expect(page.locator("[data-role-badge]")).toHaveText("Система");
    await expect(page.locator("[data-sim]")).toBeVisible();
  });

  test("«Следующая реплика» перематывает дату и обновляет адрес", async ({ page }) => {
    await page.goto("/#chat/З-015?at=2026-01-02");
    await page.locator('[data-action="next-msg"]').click();
    await expect(page).toHaveURL(/at=2026-01-03/);
    await expect(page.locator("[data-role-badge]")).toHaveText("Подрядчик");
    await page.locator('[data-action="prev-msg"]').click();
    await expect(page).toHaveURL(/at=2026-01-02/);
    await expect(page.locator("[data-role-badge]")).toHaveText("Депутат-диспетчер");
  });

  test("переписка есть у любой заявки, а не только у героя", async ({ page }) => {
    await page.goto("/#chat/З-020?at=2026-01-02");
    await expect(page.locator("[data-phone]")).toContainText("З-020");
    const messages = await page.locator("[data-msg]").count();
    expect(messages).toBeGreaterThan(0);
  });

  test("ссылка назад возвращает в хронологию на ту же дату", async ({ page }) => {
    await page.goto("/#chat/З-015?at=2026-01-02");
    await page.locator("[data-back]").click();
    await expect(page).toHaveURL(/at=2026-01-02/);
    await expect(page.locator("svg[data-graph]")).toBeVisible();
    await expect(page.locator("[data-day-label]")).toHaveText("2 января 2026");
  });
});
