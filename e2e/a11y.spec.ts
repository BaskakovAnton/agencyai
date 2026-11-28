import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const routes = [
  "#dashboard?at=2026-01-02",
  "#incidents?at=2026-01-02",
  "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02",
  "#timeline?at=2026-01-02&view=gantt",
  "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02",
  "#model",
];

interface Violation { readonly id: string; readonly impact: string | null; readonly nodes: number }

/** Прогон axe: возвращает только критичные и серьёзные нарушения. */
const blockingViolations = async (page: import("@playwright/test").Page): Promise<Violation[]> => {
  await page.addScriptTag({ content: axeSource });
  const violations = (await page.evaluate(async () => {
    const runner = (window as unknown as { axe: { run: (root: Document, options: object) => Promise<{ violations: Violation[] }> } }).axe;
    const result = await runner.run(document, { resultTypes: ["violations"] });
    return result.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length }));
  })) as Violation[];
  return violations.filter((item) => item.impact === "critical" || item.impact === "serious");
};

const states = [
  { name: "пустой реестр", hash: "#incidents?at=2026-01-02&q=НЕТ-ТАКОГО" },
  { name: "события периода", hash: "#incidents?period=30&at=2026-01-13" },
  { name: "начало окна модели", hash: "#timeline?at=2025-12-20&view=gantt" },
  { name: "переписка до создания", hash: "#chat/" + encodeURIComponent("З-001") + "?at=2025-12-20" },
];

test.describe("Клавиатура и подписи", () => {
  test("ползунок времени подписан и озвучивает значение", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    const slider = page.locator('input[type="range"]');
    // Доступное имя даёт связанный label[for], значение озвучивается через aria-valuetext.
    const named = await slider.evaluate((el) => {
      if (el.hasAttribute("aria-label")) return true;
      const id = el.getAttribute("id") ?? "";
      return id !== "" && document.querySelector('label[for="' + id + '"]') !== null;
    });
    expect(named).toBe(true);
    await expect(slider).toHaveAttribute("aria-valuetext");
  });

  test("строка диаграммы доступна с клавиатуры и открывает переписку", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    const row = page.locator("[data-row]").first();
    await expect(row).toHaveAttribute("role", "button");
    await expect(row).toHaveAttribute("tabindex", "0");
    await row.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => decodeURIComponent(page.url())).toContain("#chat/");
  });

  test("прокручиваемые области канваса и чипов подписаны", async ({ page }) => {
    await page.goto("/#timeline?at=2026-01-02&view=gantt");
    await expect(page.locator("[data-canvas]")).toHaveAttribute("aria-label");
    await expect(page.locator("[data-canvas]")).toHaveAttribute("tabindex", "0");
    await expect(page.locator("[data-chips]")).toHaveAttribute("aria-label");
    await expect(page.locator("[data-chips]")).toHaveAttribute("tabindex", "0");
  });

  test("на каждом экране один h1 и нет пропуска уровней", async ({ page }) => {
    for (const hash of routes) {
      await page.goto("/" + hash);
      await page.waitForTimeout(300);
      const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#view h1, #view h2, #view h3, #view h4")).map((el) => Number(el.tagName.slice(1))),
      );
      expect(levels.filter((level) => level === 1).length).toBeLessThanOrEqual(1);
      for (let i = 1; i < levels.length; i += 1) expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });
});

for (const width of [390, 1440]) {
  test.describe("Доступность " + width + "px", () => {
    test.use({ viewport: { width, height: 900 } });
    for (const hash of routes) {
      test("axe: " + hash, async ({ page }) => {
        await page.goto("/" + hash);
        await page.waitForTimeout(700);
        const blocking = await blockingViolations(page);
        expect(blocking, JSON.stringify(blocking)).toEqual([]);
      });
    }
  });
}

for (const width of [390, 1440]) {
  test.describe("Состояния " + width + "px", () => {
    test.use({ viewport: { width, height: 900 } });
    for (const state of states) {
      test("axe: " + state.name, async ({ page }) => {
        await page.goto("/" + state.hash);
        await page.waitForTimeout(700);
        const blocking = await blockingViolations(page);
        expect(blocking, JSON.stringify(blocking)).toEqual([]);
      });
    }
    test("axe: светлая тема", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("agencyai-theme", "light"));
      await page.goto("/#dashboard?at=2026-01-02");
      await page.waitForTimeout(700);
      const blocking = await blockingViolations(page);
      expect(blocking, JSON.stringify(blocking)).toEqual([]);
    });
  });
}

for (const hash of ["#dashboard?at=2026-01-02", "#incidents?at=2026-01-02", "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02", "#timeline?at=2026-01-02&view=gantt", "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02", "#model"]) {
  test.describe("Светлая тема 1440px", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test("axe: " + hash, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("agencyai-theme", "light"));
      await page.goto("/" + hash);
      await page.waitForTimeout(700);
      const blocking = await blockingViolations(page);
      expect(blocking, JSON.stringify(blocking)).toEqual([]);
    });
  });
}
