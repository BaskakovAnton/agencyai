import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.describe("Выгрузка и печать реестра", () => {
  test("CSV скачивается с корректным именем и содержимым", async ({ page }) => {
    await page.goto("/#incidents?at=2026-01-02");
    await page.locator("[data-filters-toggle]").click().catch(() => undefined);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('[data-export="csv"]').click(),
    ]);
    expect(download.suggestedFilename()).toBe("реестр-2026-01-02.csv");
    const content = await readFile((await download.path()) as string, "utf8");
    expect(content.startsWith("\uFEFF")).toBe(true);
    expect(content).toContain("Номер;Обращение;Ситуация");
    const lines = content.trim().split("\r\n");
    const rows = await page.locator("[data-incident-row]").count();
    expect(lines.length).toBe(rows + 1);
  });

  test("JSON скачивается и содержит срез и строки", async ({ page }) => {
    await page.goto("/#incidents?at=2026-01-02&view=attention");
    await page.locator("[data-filters-toggle]").click().catch(() => undefined);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('[data-export="json"]').click(),
    ]);
    expect(download.suggestedFilename()).toBe("реестр-2026-01-02.json");
    const parsed = JSON.parse(await readFile((await download.path()) as string, "utf8")) as {
      day: string;
      filters: Record<string, string>;
      rows: unknown[];
    };
    expect(parsed.day).toBe("2026-01-02");
    expect(parsed.filters.view).toBe("attention");
    expect(parsed.rows.length).toBeGreaterThan(0);
  });

  test("печать реестра: фильтры скрыты, таблица с шапкой остаётся", async ({ page }) => {
    await page.goto("/#incidents?at=2026-01-02");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("[data-incidents-filters]")).toBeHidden();
    await expect(page.locator("[data-incidents-table] thead")).toBeVisible();
    const display = await page.locator("[data-incident-row]").first().evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("table-row");
  });
});
