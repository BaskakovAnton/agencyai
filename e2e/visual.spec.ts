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

test.describe("Плотность и ориентирование", () => {
  test("мобильная карточка не выше трети экрана, видно две", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#incidents?at=2026-01-02");
    const row = page.locator("[data-incident-row]").first();
    // Абсолютная высота зависит от шрифтов платформы (Linux шире), поэтому предел — доля экрана:
    // прежняя карточка занимала ~0,35 высоты, текущая укладывается в 0,32.
    const height = await row.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    const limit = await page.evaluate(() => Math.round(window.innerHeight * 0.32));
    expect(height, "карточка " + height + " px при пределе " + limit + " px").toBeLessThanOrEqual(limit);
    const visible = await page.evaluate(() => [...document.querySelectorAll("[data-incident-row]")].filter((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }).length);
    expect(visible).toBeGreaterThanOrEqual(2);
  });

  test("десктопный реестр: шапка липкая, строки различаются по чётности", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#incidents?at=2026-01-13");
    await expect(page.locator("[data-incidents-table] thead th").first()).toHaveCSS("position", "sticky");
    const tones = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("[data-incident-row]")].slice(0, 2) as HTMLElement[];
      return rows.map((row) => getComputedStyle(row).backgroundColor);
    });
    expect(tones[0]).not.toBe(tones[1]);
    const scroll = await page.locator("[data-incidents-body]").evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(scroll).toBe(true);
  });

  test("пустое состояние показывает иконку и текст", async ({ page }) => {
    await page.goto("/#incidents?at=2026-01-02&q=НЕТ-ТАКОГО");
    await expect(page.locator("[data-empty-state]").first()).toBeVisible();
    await expect(page.locator("[data-empty-state] .empty-glyph").first()).toBeVisible();
    await expect(page.locator("[data-empty-state] .empty-text").first()).not.toBeEmpty();
  });
});
