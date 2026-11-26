/** UX-3.2.4.2, блок A: режим view=unassigned должен работать по фактической семантике. */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { buildRows, defaultFilters } from "../src/web/incidents.ts";
import { matchesView } from "../src/web/incidents-view-filter.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const { repository } = createDemoOrgRepository(graph, 7);
const ids = (day: string, patch: Record<string, unknown> = {}): string[] =>
  buildRows(graph, story.incidents, day, { ...defaultFilters(), ...patch } as never, repository).map((row) => row.id).sort();

test("A1: обращение без активного ответственного попадает в unassigned", () => {
  const incident = story.incidents.find((item) => repository.accountableOf(item.id) === undefined)!;
  expect(incident).toBeDefined();
  expect(matchesView("unassigned", graph, repository, incident, "2026-01-02")).toBe(true);
});

test("A2: обращение с ответственным не попадает в unassigned", () => {
  const withAccountable = story.incidents.filter((item) => repository.accountableOf(item.id) !== undefined);
  expect(withAccountable.length).toBeGreaterThan(0);
  for (const incident of withAccountable.slice(0, 5)) {
    expect(matchesView("unassigned", graph, repository, incident, "2026-01-02")).toBe(false);
  }
});

test("A3: unassigned = активные без ответственного (пересечение active и department=none)", () => {
  for (const day of ["2025-12-22", "2026-01-02", "2026-01-13"]) {
    const unassigned = ids(day, { view: "unassigned" });
    const expected = ids(day, { view: "active" }).filter((id) => ids(day, { department: "none" }).includes(id));
    expect({ day, unassigned }).toEqual({ day, unassigned: expected });
  }
  // 22.12: одно обращение без ответственного среди активных; 02.01: два.
  expect(ids("2025-12-22", { view: "unassigned" }).length).toBe(1);
  expect(ids("2026-01-02", { view: "unassigned" }).length).toBe(2);
});

test("A4: режим не пуст ни на одной дате окна, где есть активные без ответственного", () => {
  const days = story.days;
  const nonEmpty = days.filter((day) => ids(day, { view: "unassigned" }).length > 0);
  expect(nonEmpty.length).toBeGreaterThan(10);
  // на дату до появления таких обращений список пуст — это не ошибка фильтра
  expect(ids("2025-12-20", { view: "unassigned" }).length).toBe(0);
});

test("A5: остальные представления и department=none не изменились", () => {
  const day = "2026-01-02";
  const counts = {
    active: ids(day, { view: "active" }).length,
    attention: ids(day, { view: "attention" }).length,
    overdue: ids(day, { view: "overdue" }).length,
    paused: ids(day, { view: "paused" }).length,
    review: ids(day, { view: "review" }).length,
    none: ids(day, { department: "none" }).length,
    all: ids(day).length,
  };
  expect(counts).toEqual({ active: 27, attention: 14, overdue: 14, paused: 0, review: 6, none: 3, all: 28 });
  expect(ids("2026-01-13", { department: "none" }).length).toBe(3);
});

test("A6: unassigned не зависит от фазы SLA и не включает завершённые без ответственного", () => {
  const day = "2026-01-13";
  const unassigned = ids(day, { view: "unassigned" });
  const none = ids(day, { department: "none" });
  expect(none.length).toBeGreaterThan(unassigned.length); // в none есть завершённые без ответственного
  expect(unassigned.every((id) => none.includes(id))).toBe(true);
});
