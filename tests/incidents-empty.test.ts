import { expect, test } from "bun:test";
import { emptyStateFor, renderEmptyIncidents, type EmptyReason } from "../src/web/incidents-empty.ts";
import { defaultFilters, type IncidentFilters } from "../src/web/incidents.ts";

const cases: readonly (readonly [EmptyReason, Partial<IncidentFilters>])[] = [
  ["no-data", {}],
  ["search", { q: "нет такого" }],
  ["department", { department: "DEP-HOUSING" }],
  ["unassigned", { department: "none" }],
  ["view", { view: "attention" }],
  ["combination", { q: "нет", priority: "urgent" }],
];

test("пустое состояние собрано без литерального HTML и с иконкой", () => {
  for (const [reason, patch] of cases) {
    const state = emptyStateFor({ ...defaultFilters(), ...patch }, 0);
    expect(state?.reason, reason).toBe(reason);
    const html = renderEmptyIncidents(state!);
    expect(html, reason).not.toContain("&lt;b&gt;");
    expect(html, reason).toContain("<b>");
    expect(html, reason).toContain("empty-glyph");
    expect(html, reason).toContain("data-incidents-empty");
  }
});

test("действие пустого состояния остаётся доступным", () => {
  const state = emptyStateFor({ ...defaultFilters(), q: "нет" }, 0);
  expect(renderEmptyIncidents(state!)).toContain("data-filter-clear=\"q\"");
});
