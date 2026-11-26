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

test("A3: unassigned даёт тот же набор, что department=none (единый сценарий, DEC-UX-324-03)", () => {
  for (const day of story.days) {
    expect({ day, unassigned: ids(day, { view: "unassigned" }) }).toEqual({ day, unassigned: ids(day, { department: "none" }) });
  }
  expect(ids("2025-12-22", { view: "unassigned" })).toEqual(["З-005"]);
  expect(ids("2026-01-02", { view: "unassigned" })).toEqual(["З-005", "З-016", "З-027"]);
  expect(ids("2026-01-13", { view: "unassigned" })).toEqual(["З-005", "З-016", "З-027"]);
});

test("A4: режим не пуст на большинстве дней окна и пуст до появления таких обращений", () => {
  const nonEmpty = story.days.filter((day) => ids(day, { view: "unassigned" }).length > 0);
  expect(nonEmpty.length).toBeGreaterThan(10);
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

test("A6: unassigned не зависит от фазы SLA и от завершённости (совпадает с department=none)", () => {
  const day = "2026-01-13";
  const unassigned = ids(day, { view: "unassigned" });
  const none = ids(day, { department: "none" });
  const activeNone = ids(day, { view: "active" }).filter((id) => none.includes(id));
  expect(unassigned).toEqual(none);
  // завершённые без ответственного входят в набор: активных без ответственного на эту дату меньше
  expect(activeNone.length).toBeLessThan(unassigned.length);
});
