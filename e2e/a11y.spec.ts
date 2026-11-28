import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const routes = [
  "#dashboard?at=2026-01-02",
  "#incidents?at=2026-01-02",
  "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02",
  "#timeline?at=2026-01-02&view=git",
  "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02",
  "#model",
];

interface Violation { readonly id: string; readonly impact: string | null; readonly nodes: number }

for (const width of [390, 1440]) {
  test.describe("Доступность " + width + "px", () => {
    test.use({ viewport: { width, height: 900 } });
    for (const hash of routes) {
      test("axe: " + hash, async ({ page }) => {
        await page.goto("/" + hash);
        await page.waitForTimeout(700);
        await page.addScriptTag({ content: axeSource });
        const violations = (await page.evaluate(async () => {
          const runner = (window as unknown as { axe: { run: (root: Document, options: object) => Promise<{ violations: Violation[] }> } }).axe;
          const result = await runner.run(document, { resultTypes: ["violations"] });
          return result.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length }));
        })) as Violation[];
        const blocking = violations.filter((item) => item.impact === "critical" || item.impact === "serious");
        expect(blocking, JSON.stringify(blocking)).toEqual([]);
      });
    }
  });
}
