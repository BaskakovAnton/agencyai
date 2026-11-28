import { expect, test } from "@playwright/test";

test.describe("Визуальная полировка", () => {
  test("первый кадр показывает брендовый скелет вместо пустого текста", async ({ page }) => {
    await page.route("**/app.js", (route) => route.abort());
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const boot = page.locator("[data-boot]");
    await expect(boot).toBeVisible();
    await expect(boot.locator(".boot-mark")).toHaveText("360");
    await expect(boot.locator(".boot-rows i")).toHaveCount(3);
  });

  test("после загрузки приложения скелет исчезает", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    await expect(page.locator("[data-dashboard]")).toBeVisible();
    await expect(page.locator("[data-boot]")).toHaveCount(0);
  });

  test("иконка и манифест отдаются сервером", async ({ request }) => {
    for (const file of ["favicon.svg", "manifest.webmanifest"]) {
      const response = await request.get("/" + file);
      expect(response.status(), file).toBe(200);
    }
  });

  test("фокус во всех разделах одинаковой толщины", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    // Строка-заголовок Ганта не фокусируема: проверяем строки заявок.
    const row = page.locator(".gantt-row[data-row]").first();
    await row.focus();
    const style = await row.evaluate((el) => ({ width: getComputedStyle(el).outlineWidth, kind: getComputedStyle(el).outlineStyle }));
    expect(style).toEqual({ width: "2px", kind: "solid" });
  });
});
