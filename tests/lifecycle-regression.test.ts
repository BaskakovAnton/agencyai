/** UX-3.1.1: регрессия жизненного цикла — семь обязательных проверок. */
import { expect, test } from "bun:test";
import { flowOf } from "../src/core/analytics/flow.ts";
import { snapshotOn } from "../src/core/analytics/snapshot.ts";
import { periodEndingAt } from "../src/core/periods.ts";
import { graph, incidents, lifecycles } from "./lifecycle-fixture.ts";

const only = (index: number, day: string) => snapshotOn(graph, [incidents[index]!], day, lifecycles);

test("1. pending_review не считается завершённым", () => {
  for (const index of [1, 2]) {
    const state = only(index, "2026-01-05");
    expect(state.finished).toBe(0);
    expect(state.active).toBe(1);
    expect(state.pendingReview).toBe(1);
  }
});

test("2. approved учитывается как подтверждённое завершение", () => {
  const before = only(3, "2026-01-04");
  const after = only(3, "2026-01-05");
  expect(before.finished).toBe(0);
  expect(after.finished).toBe(1);
  expect(after.active).toBe(0);
});

test("3. rejected возвращает обращение в активную нагрузку", () => {
  const after = only(4, "2026-01-06");
  expect(after.finished).toBe(0);
  expect(after.active).toBe(1);
  expect(after.pendingReview).toBe(0);
});

test("4. approved → reopened: до переоткрытия завершение, после — активная нагрузка, Flow помнит подтверждение", () => {
  expect(only(5, "2026-01-05").finished).toBe(1);
  expect(only(5, "2026-01-06").finished).toBe(1);
  const afterReopen = only(5, "2026-01-07");
  expect(afterReopen.finished).toBe(0);
  expect(afterReopen.active).toBe(1);
  const flow = flowOf({ graph, incidents, lifecycles }, periodEndingAt("2026-01-08", 7));
  expect(flow.approved).toBeGreaterThanOrEqual(1);
  expect(flow.reopened).toBe(1);
});

test("5. повторное подтверждение не создаёт задвоенных завершений", () => {
  const first = only(3, "2026-01-05");
  const second = only(3, "2026-01-06");
  expect(first.finished).toBe(1);
  expect(second.finished).toBe(1);
  const records = lifecycles["L-APPROVED"]!.records.filter((record) => record.type === "approved");
  expect(records).toHaveLength(1);
  const flow = flowOf({ graph, incidents, lifecycles }, periodEndingAt("2026-01-08", 7));
  // Подтверждение одно и относится к 5 января: 4 и 5 января дают 0 и 1, а не 2.
  expect(flowOf({ graph, incidents, lifecycles }, periodEndingAt("2026-01-04", 7)).finished).toBe(0);
  expect(flow.finished).toBe(2); // L-APPROVED и L-REOPENED
});

test("6. обращение без записей lifecycle не считается подтверждённым", () => {
  const state = only(0, "2026-01-05");
  expect(state.finished).toBe(0);
  expect(state.active).toBe(1);
});

test("7. исторические даты не переписываются последующими событиями", () => {
  const history: readonly (readonly [string, number])[] = [
    ["2026-01-03", 0],
    ["2026-01-04", 0],
    ["2026-01-05", 1],
    ["2026-01-06", 1],
    ["2026-01-07", 0],
  ];
  for (const [day, finished] of history) {
    expect({ day, finished: only(5, day).finished }).toEqual({ day, finished });
  }
});
