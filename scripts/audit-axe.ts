/** Прогон axe-core для аудита (B4): вынесено из audit-ui.ts. */
import type { Page } from "@playwright/test";
import { axePath, type Finding } from "./audit-config.ts";

export const axePage = async (page: Page, name: string, viewport: string): Promise<Finding[]> => {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<{ violations: { id: string; impact: string | null; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
  });
  return result.violations.map((v) => ({
    page: name, viewport, kind: "axe:" + v.id, count: v.nodes.length,
    detail: "impact=" + (v.impact ?? "?") + "; " + v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | "),
  }));
};
