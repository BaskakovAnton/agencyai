import { expect, test } from "bun:test";
import { actionCard, emptyState, renderActiveFilterChip, renderPriorityBadge, renderSectionHeader, statusBadge } from "../src/web/components.ts";
import { renderFilterChips } from "../src/web/incidents-chips.ts";

test("единые компоненты экспортированы и дают ожидаемую разметку", () => {
  expect(renderPriorityBadge("авария", "red")).toContain("авария");
  expect(statusBadge("Просрочено", "red")).toContain("Просрочено");
  expect(emptyState("Ничего нет")).toContain("Ничего нет");
  expect(actionCard({ title: "Панель", body: "тело" })).toContain("Панель");
  expect(renderSectionHeader("Раздел", "Подпись")).toContain("<h2");
});

test("панель чипов собрана из общего компонента", () => {
  const chip = { key: "priority" as const, label: "Приоритет", text: "авария" };
  const html = renderFilterChips([chip]);
  expect(html).toContain(renderActiveFilterChip(chip));
  expect(html).toContain('aria-label="Снять фильтр: Приоритет — авария"');
});

test("экраны используют общий бейдж приоритета", async () => {
  const { readFile } = await import("node:fs/promises");
  const rows = await readFile("src/web/incidents-html.ts", "utf8");
  const attention = await readFile("src/web/dashboard-attention.ts", "utf8");
  expect(rows).toContain("renderPriorityBadge(");
  expect(attention).toContain("renderPriorityBadge(");
});
