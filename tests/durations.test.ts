import { expect, test } from "bun:test";
import { durationsOf, lifecycleIntervals, stageIntervals } from "../src/core/analytics/durations.ts";

const move = (to: string, at?: string) => ({ step: 1, from: "U1", to, actor: "generator" as const, note: "", at });
const record = (type: "submitted" | "approved", at: string) => ({ type, at, byUserId: null, reason: null, accountableDepartmentId: null });
const lifecycle = (records: ReturnType<typeof record>[]) => ({ incidentId: "З-1", organizationId: "ORG", status: "active" as const, records });

test("этапы: интервалы из history.at, соседние метки дают 0 ч", () => {
  const r = stageIntervals([move("U1", "2026-01-01T10:00:00.000Z"), move("U2", "2026-01-01T10:00:00.000Z"), move("U3", "2026-01-01T13:00:00.000Z")]);
  expect(r.intervals.map((item) => item.hours)).toEqual([0, 3]);
  expect(r.hours).toBe(3);
  expect(r.intervals.map((item) => item.nodeId)).toEqual(["U1", "U2"]);
});

test("ходы без at исключаются, а итог помечается как неполный", () => {
  const r = stageIntervals([move("U1", "2026-01-01T10:00:00.000Z"), move("U2")]);
  expect(r.intervals.length).toBe(0);
  expect(r.hours).toBeNull();
});

test("жизненный цикл: интервалы из records в порядке append-only", () => {
  const r = lifecycleIntervals(lifecycle([record("submitted", "2026-01-01T10:00:00.000Z"), record("approved", "2026-01-02T10:00:00.000Z")]));
  expect(r.hours).toBe(24);
  expect(r.intervals.length).toBe(1);
  expect(r.intervals[0]!.from).toBe("submitted");
  expect(r.intervals[0]!.to).toBe("approved");
});

test("жизненный цикл без записей или с одной записью — нет данных", () => {
  expect(lifecycleIntervals(undefined).hours).toBeNull();
  expect(lifecycleIntervals(lifecycle([])).hours).toBeNull();
  expect(lifecycleIntervals(lifecycle([record("submitted", "2026-01-01T10:00:00.000Z")])).hours).toBeNull();
});

test("durationsOf не смешивает этапы и жизненный цикл", () => {
  const r = durationsOf({
    history: [move("U1", "2026-01-01T00:00:00.000Z"), move("U2", "2026-01-01T06:00:00.000Z")],
    lifecycle: lifecycle([record("submitted", "2026-01-01T00:00:00.000Z"), record("approved", "2026-01-01T20:00:00.000Z")]),
  });
  expect(r.stageHours).toBe(6);
  expect(r.lifecycleHours).toBe(20);
});
