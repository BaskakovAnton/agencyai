import { expect, test } from "bun:test";
import { flowOf } from "../src/core/analytics/flow.ts";
import { snapshotOn } from "../src/core/analytics/snapshot.ts";
import { periodEndingAt } from "../src/core/periods.ts";
import { graph, incidents, lifecycles } from "./lifecycle-fixture.ts";

const snapshot = (day: string) => snapshotOn(graph, incidents, day, lifecycles);

test("терминальный узел без подтверждения не считается завершённым", () => {
  const only = snapshotOn(graph, [incidents[0]!], "2026-01-05", lifecycles);
  expect(only.finished).toBe(0);
  expect(only.active).toBe(1);
  expect(only.pendingReview).toBe(0);
});

test("ожидание проверки на терминальном узле: активная нагрузка и pendingReview", () => {
  const day = snapshot("2026-01-05");
  // 5 января ждут решения: L-PEND-TERM, L-PEND-WORK и L-REJECTED (отказ будет 6 января).
  expect(day.pendingReview).toBe(3);
  // Подтверждены к этой дате: L-APPROVED и L-REOPENED (переоткрытие случится 7 января).
  expect(day.finished).toBe(2);
  expect(day.active).toBe(4); // L-TERM-NONE, L-PEND-TERM, L-PEND-WORK, L-REJECTED
});

test("ожидание проверки на терминальном и нетерминальном узле учитывается одинаково", () => {
  const terminalOnly = snapshotOn(graph, [incidents[1]!], "2026-01-05", lifecycles);
  const workOnly = snapshotOn(graph, [incidents[2]!], "2026-01-05", lifecycles);
  for (const state of [terminalOnly, workOnly]) {
    expect(state.active).toBe(1);
    expect(state.finished).toBe(0);
    expect(state.pendingReview).toBe(1);
  }
});

test("подтверждённое завершение: активно 0, завершено 1, проверки 0", () => {
  const state = snapshotOn(graph, [incidents[3]!], "2026-01-05", lifecycles);
  expect(state.active).toBe(0);
  expect(state.finished).toBe(1);
  expect(state.pendingReview).toBe(0);
});

test("отказ контролёра возвращает обращение в работу", () => {
  const before = snapshotOn(graph, [incidents[4]!], "2026-01-04", lifecycles);
  const after = snapshotOn(graph, [incidents[4]!], "2026-01-06", lifecycles);
  expect(before.pendingReview).toBe(1);
  expect(before.finished).toBe(0);
  expect(after.pendingReview).toBe(0);
  expect(after.finished).toBe(0);
  expect(after.active).toBe(1);
});

test("исторические Snapshot не переписываются после новых событий", () => {
  const expected: readonly (readonly [string, number, number, number])[] = [
    ["2026-01-03", 1, 0, 0],
    ["2026-01-04", 1, 0, 1],
    ["2026-01-05", 0, 1, 0],
    ["2026-01-06", 0, 1, 0],
    ["2026-01-07", 1, 0, 0],
  ];
  for (const [day, active, finished, pending] of expected) {
    const state = snapshotOn(graph, [incidents[5]!], day, lifecycles);
    expect({ day, active: state.active, finished: state.finished, pendingReview: state.pendingReview }).toEqual({
      day,
      active,
      finished,
      pendingReview: pending,
    });
  }
});

test("Flow разделяет достижение терминального узла и подтверждённое завершение", () => {
  const period = periodEndingAt("2026-01-08", 7);
  const flow = flowOf({ graph, incidents, lifecycles }, period);
  expect(flow.reachedTerminal).toBe(4); // L-TERM-NONE, L-PEND-TERM, L-APPROVED, L-REOPENED — все 2 января
  expect(flow.finished).toBe(2); // подтверждены 5 января: L-APPROVED и L-REOPENED
  expect(flow.finished).toBe(flow.approved);
  expect(flow.submitted).toBe(5);
  expect(flow.rejected).toBe(1);
  expect(flow.reopened).toBe(1);
});

test("исторические даты не меняются: завершение относится к дате подтверждения", () => {
  const before = flowOf({ graph, incidents, lifecycles }, periodEndingAt("2026-01-04", 7));
  expect(before.finished).toBe(0);
  expect(before.reachedTerminal).toBe(4);
  const after = flowOf({ graph, incidents, lifecycles }, periodEndingAt("2026-01-05", 7));
  expect(after.finished).toBe(2);
});
