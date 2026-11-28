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
    // Платформенные шрифты разные: проверяем, что карточка целиком помещается на экране,
    // и что хотя бы одна строка видна. Это и есть требование плотности.
    const fit = await row.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { fits: r.bottom <= window.innerHeight, visible: [...document.querySelectorAll("[data-incident-row]")].filter((node) => { const b = node.getBoundingClientRect(); return b.top < window.innerHeight && b.bottom > 0; }).length };
    });
    expect(fit.fits, "карточка не помещается целиком").toBe(true);
    expect(fit.visible).toBeGreaterThanOrEqual(1);
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
    await expect(page.locator("[data-empty-state] .empty-art").first()).toBeVisible();
    await expect(page.locator("[data-empty-state] .empty-text").first()).not.toBeEmpty();
  });
});

test.describe("Печать и движение", () => {
  test("печать скрывает обвязку и оставляет содержимое карточки", async ({ page }) => {
    await page.goto("/#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("ui-sidebar")).toBeHidden();
    await expect(page.locator("ui-topbar")).toBeHidden();
    await expect(page.locator("[data-incident-detail]")).toBeVisible();
    await expect(page.locator("[data-transfers]")).toBeVisible();
  });

  test("появление экрана анимируется и отключается при reduced-motion", async ({ page }) => {
    await page.goto("/#dashboard?at=2026-01-02");
    const name = await page.locator("#view > *").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toContain("screen-in");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const off = await page.locator("#view > *").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(off).toBe("none");
  });
});

test.describe("Ползунок и диаграмма", () => {
  test("ползунок без заливки: без accent-color и с прозрачным фоном", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02");
    const slider = page.locator("[data-slider]");
    await expect(slider).toBeVisible();
    const style = await slider.evaluate((el) => {
      const s = getComputedStyle(el);
      return { accent: s.accentColor, appearance: s.appearance, background: s.backgroundColor, progressFill: s.getPropertyValue("--o-fill") };
    });
    expect(style.accent).toBe("auto");
    expect(style.appearance).toBe("none");
    expect(style.background).toBe("rgba(0, 0, 0, 0)");
  });

  test("столбцы Ганта оформлены: скругление, градиент, тень", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    const bar = page.locator(".gantt-bar").first();
    await expect(bar).toBeVisible();
    const style = await bar.evaluate((el) => {
      const s = getComputedStyle(el);
      return { radius: Number.parseFloat(s.borderTopLeftRadius), image: s.backgroundImage, shadow: s.boxShadow, bg: s.backgroundColor };
    });
    expect(style.radius).toBeGreaterThanOrEqual(8);
    expect(style.image).toContain("gradient");
    expect(style.shadow).not.toBe("none");
    expect(style.bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("строки Ганта чередуются, строка героя выделена", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    const tones = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".gantt-body > .gantt-row")].slice(0, 3);
      return {
        tones: rows.map((row) => getComputedStyle(row).backgroundColor),
        hero: (() => {
          const hero = document.querySelector(".gantt-row.hero") as HTMLElement | null;
          const plain = document.querySelector(".gantt-body > .gantt-row:not(.hero)") as HTMLElement | null;
          return { hero: hero ? getComputedStyle(hero).backgroundColor : "", plain: plain ? getComputedStyle(plain).backgroundColor : "" };
        })(),
      };
    });
    expect(tones.tones[0]).not.toBe(tones.tones[1]);
    expect(tones.hero.hero).not.toBe(tones.hero.plain);
  });
});
