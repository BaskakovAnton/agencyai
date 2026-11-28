import { expect, test } from "bun:test";
import { eventsInPeriod } from "../src/web/incidents.ts";
import type { Incident } from "../src/types.ts";

const incident = (id: string, days: string[]): Incident => ({
  id, category: "c", title: "t", address: "a", reporter: "r", priority: "normal", nodeId: "U1",
  situationId: "С1", sla: { state: "ok", dueAt: 0 } as unknown as Incident["sla"],
  history: days.map((day, index) => ({ step: index, from: "U1", to: "U2", actor: "generator" as const, note: "", at: day + "T10:00:00.000Z" })),
  createdAt: "2026-01-01T00:00:00.000Z",
});

test("в период попадают только обращения с событиями внутри окна", () => {
  const list = [incident("A", ["2026-01-10"]), incident("B", ["2026-01-01"]), incident("C", [])];
  expect(eventsInPeriod(list, "2026-01-10", 7)).toEqual(["A"]);
});

test("границы периода включительны, длина 1 — только выбранный день", () => {
  const list = [incident("A", ["2026-01-04"]), incident("B", ["2026-01-03"]), incident("C", ["2026-01-10"])];
  expect(eventsInPeriod(list, "2026-01-10", 1)).toEqual(["C"]);
  expect(eventsInPeriod(list, "2026-01-10", 7)).toEqual(["A", "C"]);
});
