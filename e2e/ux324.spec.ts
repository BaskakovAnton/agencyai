import { expect, test } from "@playwright/test";

const DAY = "2026-01-02";
const LAST = "2026-01-13";
const HIST = "2025-12-22";
const rows = (page: any) => page.locator("[data-incident-row]").count();
const go = async (page: any, hash: string) => { await page.goto("/" + hash); await page.waitForSelector("[data-incidents-table], [data-incidents-empty]"); };

test.describe("UX-3.2.4: управление представлением и подразделением", () => {
  test("селект представления меняет URL и состав списка", async ({ page }) => {
    await go(page, "#incidents?at=" + DAY);
    expect(await rows(page)).toBe(28);
    for (const [value, expected] of [["active", 27], ["attention", 14], ["overdue", 14], ["review", 6]] as const) {
      await go(page, "#incidents?at=" + DAY);
      await page.locator("[data-filter-view]").selectOption(value);
      await page.waitForTimeout(400);
      expect({ value, url: decodeURIComponent(page.url()).includes("view=" + value), rows: await rows(page) }).toEqual({ value, url: true, rows: expected });
    }
    await page.goto("/#incidents?at=" + DAY);
    await page.waitForSelector("[data-incidents-table]");
    await page.locator("[data-filter-view]").selectOption("paused");
    await expect(page.locator('[data-incidents-empty="view"]')).toBeVisible();
    expect(decodeURIComponent(page.url())).not.toContain("view=all");
  });

  test("подразделение и «без ответственного» доступны из селекта", async ({ page }) => {
    await go(page, "#incidents?at=" + LAST);
    const department = await page.locator("[data-filter-department] option").nth(1).getAttribute("value");
    await page.locator("[data-filter-department]").selectOption(department!);
    await page.waitForTimeout(400);
    expect(decodeURIComponent(page.url())).toContain("department=" + department);
    expect(await rows(page)).toBeGreaterThan(0);
    await go(page, "#incidents?at=" + LAST);
    await page.locator("[data-filter-department]").selectOption("none");
    await page.waitForTimeout(400);
    // family "без ответственного" = department=none (включая завершённые) — на 13.01 три обращения
    expect(await rows(page)).toBe(3);
  });

  test("«Без ответственного» не дублируется в селекте представления, но view=unassigned работает", async ({ page }) => {
    await go(page, "#incidents?at=" + DAY);
    const viewOptions = await page.locator("[data-filter-view] option").allInnerTexts();
    expect(viewOptions.join(" ")).not.toContain("ответствен");
    // независимый расчёт по модели на 02.01: активные без ответственного — З-005 и З-027 (З-016 завершено)
    await go(page, "#incidents?at=" + DAY + "&view=unassigned");
    expect(await rows(page)).toBe(2);
  });

  test("панель чипов показывает активные фильтры и снимает по одному", async ({ page }) => {
    await go(page, "#incidents?at=" + LAST + "&view=attention&department=DEP-HOUSING&q=З-0");
    await expect(page.locator("[data-filter-chips]")).toBeVisible();
    expect(await page.locator("[data-chip]").count()).toBe(3);
    await page.locator('[data-filter-clear="view"]').click();
    await page.waitForTimeout(400);
    const url = decodeURIComponent(page.url());
    expect(url).not.toContain("view=attention");
    expect(url).toContain("department=DEP-HOUSING");
    expect(url).toContain("q=З-0");
    expect(url).toContain("at=" + LAST);
    expect(await page.locator("[data-filter-view]").inputValue()).toBe("all");
  });

  test("чип даты появляется только при исторической дате и возвращает последний день", async ({ page }) => {
    await go(page, "#incidents?at=" + LAST);
    await expect(page.locator('[data-chip="at"]')).toHaveCount(0);
    await go(page, "#incidents?at=" + HIST + "&view=review");
    await expect(page.locator('[data-chip="at"]')).toHaveCount(1);
    await page.locator('[data-filter-clear="at"]').click();
    await page.waitForTimeout(500);
    expect(decodeURIComponent(page.url())).toContain("at=2026-01-13");
    expect(decodeURIComponent(page.url())).toContain("view=review");
  });

  test("полный сброс сохраняет дату среза", async ({ page }) => {
    await go(page, "#incidents?at=" + HIST + "&view=review&q=З-0");
    await page.locator("[data-reset]").click();
    await page.waitForTimeout(500);
    const url = decodeURIComponent(page.url());
    expect(url).toContain("at=" + HIST);
    expect(url).not.toContain("view=");
    expect(url).not.toContain("q=");
    // на историческую дату остаётся только чип даты: пользовательские фильтры сняты
    expect(await page.locator("[data-chip]").count()).toBe(1);
    expect(await page.locator('[data-chip="at"]').count()).toBe(1);
    expect(await rows(page)).toBeGreaterThan(0);
  });

  test("пустые состояния различаются по причине", async ({ page }) => {
    for (const [hash, reason] of [["#incidents?at=" + LAST + "&q=нет-такого", "search"], ["#incidents?at=" + LAST + "&view=paused", "view"], ["#incidents?at=" + LAST + "&department=DEP-ARCHIVE", "department"], ["#incidents?at=" + LAST + "&view=attention&q=прочее", "combination"]] as const) {
      await go(page, hash);
      await expect(page.locator('[data-incidents-empty="' + reason + '"]')).toBeVisible();
    }
    await go(page, "#incidents?at=" + LAST + "&q=нет-такого");
    await page.locator('[data-incidents-empty="search"] button').click();
    await page.waitForTimeout(400);
    expect(await rows(page)).toBe(30);
  });

  test("предупреждение F5 появляется только при исторической дате и подразделении", async ({ page }) => {
    await go(page, "#incidents?at=" + HIST + "&department=DEP-HOUSING");
    await expect(page.locator("[data-f5-notice]")).toBeVisible();
    await go(page, "#incidents?at=" + LAST + "&department=DEP-HOUSING");
    await expect(page.locator("[data-f5-notice]")).toHaveCount(0);
    await go(page, "#incidents?at=" + HIST + "&view=review");
    await expect(page.locator("[data-f5-notice]")).toHaveCount(0);
    await go(page, "#incidents?at=" + HIST + "&department=none");
    await expect(page.locator("[data-f5-notice]")).toBeVisible();
  });

  test("reload, Back и Forward восстанавливают интерфейс", async ({ page }) => {
    await go(page, "#incidents?at=" + LAST);
    await page.locator("[data-filter-view]").selectOption("attention");
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector("[data-incidents-table]");
    expect(await page.locator("[data-filter-view]").inputValue()).toBe("attention");
    await page.goBack();
    await page.waitForTimeout(500);
    expect(await page.locator("[data-filter-view]").inputValue()).toBe("all");
    await page.goForward();
    await page.waitForTimeout(500);
    expect(await page.locator("[data-filter-view]").inputValue()).toBe("attention");
  });

  test("мобильный экран: фильтры доступны, страница не переполнена", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, "#incidents?at=" + HIST + "&view=attention&department=DEP-HOUSING&q=З-0");
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      controls: [...document.querySelectorAll("[data-incidents-filters] select, [data-incidents-filters] input, [data-incidents-filters] button")].map((el) => Math.round(el.getBoundingClientRect().height)),
      chipButtons: [...document.querySelectorAll("[data-filter-clear]")].map((el) => Math.round(el.getBoundingClientRect().height)),
      notice: document.querySelector("[data-f5-notice]") !== null,
    }));
    expect(m.overflow).toBe(false);
    expect(m.controls.every((h) => h >= 32)).toBe(true);
    expect(m.chipButtons.every((h) => h >= 32)).toBe(true);
    expect(m.notice).toBe(true);
    await page.locator('[data-filter-clear="q"]').click();
    await page.waitForTimeout(400);
    expect(decodeURIComponent(page.url())).not.toContain("q=");
  });
});
