import { expect, test } from "@playwright/test";

const OUTSIDE = "2020-01-01";
const AFTER = "2026-06-01";
const INSIDE = "2026-01-02";
const screens = [
  ["Обзор", "#dashboard?at=" + OUTSIDE],
  ["Реестр", "#incidents?at=" + OUTSIDE],
  ["Карточка", "#incident/" + encodeURIComponent("З-001") + "?at=" + OUTSIDE],
  ["Хронология", "#timeline?at=" + OUTSIDE],
  ["Переписка", "#chat/" + encodeURIComponent("З-015") + "?at=" + OUTSIDE],
] as const;

test.describe("UX-3.2.2: единое состояние выбранной даты", () => {
  for (const [name, hash] of screens) {
    test(name + ": дата вне окна модели даёт единое состояние без данных и действий", async ({ page }) => {
      await page.goto("/" + hash);
      await expect(page.locator("[data-outside-window]")).toBeVisible();
      await expect(page.locator("[data-outside-window]")).toContainText("Дата вне доступного периода");
      await expect(page.locator("[data-outside-window]")).toContainText("20 декабря 2025 — 13 января 2026");
      // Никаких «фантомных» данных и действий на несуществующую дату.
      for (const marker of ["[data-dashboard]", "[data-incidents-table]", "[data-incident-detail]", "[data-org-confirmation]", "[data-timeline]", "[data-chat]"]) {
        await expect(page.locator(marker)).toHaveCount(0);
      }
    });
  }

  test("все пять экранов показывают один и тот же текст недоступности", async ({ page }) => {
    const texts: string[] = [];
    for (const [, hash] of screens) {
      await page.goto("/" + hash);
      texts.push((await page.locator("[data-outside-window] .muted").innerText()).trim());
    }
    expect(new Set(texts).size).toBe(1);
    expect(texts[0]).toContain("Дата вне доступного периода");
  });

  test("дата после окна модели обрабатывается так же", async ({ page }) => {
    await page.goto("/#timeline?at=" + AFTER);
    await expect(page.locator("[data-outside-window]")).toBeVisible();
    await expect(page.locator("[data-outside-link]")).toContainText("13 января 2026");
  });

  test("дата до окна ведёт к первой доступной, после окна — к последней", async ({ page }) => {
    await page.goto("/#dashboard?at=" + OUTSIDE);
    await expect(page.locator("[data-outside-link]")).toContainText("20 декабря 2025");
    await page.goto("/#incidents?at=" + AFTER);
    await page.locator("[data-outside-link]").click();
    await expect(page.locator("[data-incidents-table]")).toBeVisible();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("at=2026-01-13");
  });

  test("доступная дата работает как прежде на всех экранах", async ({ page }) => {
    await page.goto("/#dashboard?at=" + INSIDE);
    await expect(page.locator("[data-dashboard]")).toBeVisible();
    await page.goto("/#incidents?at=" + INSIDE);
    await expect(page.locator("[data-incidents-table]")).toBeVisible();
    await page.goto("/#incident/" + encodeURIComponent("З-001") + "?at=" + INSIDE);
    await expect(page.locator("[data-incident-detail]")).toBeVisible();
    await page.goto("/#timeline?at=" + INSIDE);
    await expect(page.locator("[data-commit]").first()).toBeVisible();
    await page.goto("/#chat/" + encodeURIComponent("З-015") + "?at=" + INSIDE);
    await expect(page.locator("[data-outside-window]")).toHaveCount(0);
    expect((await page.locator("#shell").innerText()).length).toBeGreaterThan(50); // переписка отрисована
    for (const [, hash] of screens) {
      await page.goto("/" + hash.replace(OUTSIDE, INSIDE));
      await expect(page.locator("[data-outside-window]")).toHaveCount(0);
    }
  });

  test("некорректная дата — это отсутствие выбора, а не состояние вне окна", async ({ page }) => {
    await page.goto("/#incidents?at=abc");
    await expect(page.locator("[data-outside-window]")).toHaveCount(0);
    await expect(page.locator("[data-incidents-table]")).toBeVisible();
    await expect(page.locator("[data-day-select]")).toHaveValue("2026-01-13");
  });

  test("состояние вне окна переживает перезагрузку и back/forward", async ({ page }) => {
    await page.goto("/#incidents?at=" + INSIDE);
    await expect(page.locator("[data-incidents-table]")).toBeVisible();
    await page.goto("/#incidents?at=" + OUTSIDE);
    await expect(page.locator("[data-outside-window]")).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-outside-window]")).toBeVisible();
    await page.goBack();
    await page.waitForSelector("[data-incidents-table]");
    await expect(page.locator("[data-outside-window]")).toHaveCount(0);
    await page.goForward();
    await page.waitForSelector("[data-outside-window]");
    await expect(page.locator("[data-outside-window]")).toBeVisible();
  });

  test("регрессия UX-3.2.1: view, legacy alias и department работают на доступной дате", async ({ page }) => {
    await page.goto("/#incidents?at=" + INSIDE + "&view=review");
    await page.waitForSelector("[data-incidents-table]");
    const queue = await page.locator("[data-incident-row]").count();
    expect(queue).toBeGreaterThan(0);
    await page.goto("/#incidents?at=" + INSIDE + "&review=pending");
    await page.waitForSelector("[data-incidents-table]");
    expect(await page.locator("[data-incident-row]").count()).toBe(queue);
    await page.goto("/#incidents?at=" + INSIDE + "&department=DEP-HOUSING");
    await page.waitForSelector("[data-incidents-table]");
    const filtered = await page.locator("[data-incident-row]").count();
    expect(filtered).toBeGreaterThan(0);
    expect(decodeURIComponent(page.url())).toContain("department=DEP-HOUSING");
  });
});
