import { expect, test } from "bun:test";
import { flowOf } from "../src/core/analytics/flow.ts";
import { buildPeriodAnalytics, percentChange } from "../src/core/analytics/kpi.ts";
import { periodEndingAt, previousOf } from "../src/core/periods.ts";
import { assignments, graph, incidents, lifecycles } from "./kpi-fixture.ts";

const period = periodEndingAt("2026-01-10", 7);
const previous = previousOf(period);

test("Flow считает события внутри периода и не заглядывает за границу", () => {
  const flow = flowOf({ graph, incidents, lifecycles, assignments }, period);
  expect(flow.created).toBe(3);
  expect(flow.finished).toBe(0); // завершение З-103 произошло 3 января — в прошлом периоде
  expect(flow.submitted).toBe(1);
  expect(flow.approved).toBe(1);
  expect(flow.reopened).toBe(1);
  expect(flow.rejected).toBe(0);
  expect(flow.assigned).toBe(1);
  expect(flow.assignmentsClosed).toBe(1);
});

test("Flow предыдущего периода равен по длине и не пересекается по событиям", () => {
  const prev = flowOf({ graph, incidents, lifecycles, assignments }, previous);
  expect(prev.created).toBe(1); // З-101 создано 1 января
  expect(prev.finished).toBe(1); // З-103 закрыто 3 января
  // Граничный день: сдача работы 3 января относится к предыдущему периоду, подтверждение 4 января — к текущему.
  expect(prev.submitted).toBe(1);
  expect(prev.approved).toBe(0);
  const current = flowOf({ graph, incidents, lifecycles, assignments }, period);
  expect(current.submitted).toBe(1); // сдача З-101 от 4 января
  expect(current.approved).toBe(1); // подтверждение З-103 от 4 января
});

test("дельта остатка — разница Snapshot, а не поток", () => {
  const analytics = buildPeriodAnalytics({ graph, incidents, lifecycles, assignments }, "2026-01-10", 7);
  expect(analytics.snapshot.active).toBe(4);
  expect(analytics.snapshotPrevious.active).toBe(1);
  expect(analytics.backlogDelta).toBe(3);
  expect(analytics.backlogDelta).toBe(analytics.snapshot.active - analytics.snapshotPrevious.active);

  // Период, где поток и остаток расходятся: поступило 1, завершено 1, а остаток не изменился.
  const balanced = buildPeriodAnalytics({ graph, incidents, lifecycles, assignments }, "2026-01-03", 7);
  expect(balanced.flow.created).toBe(1);
  expect(balanced.flow.finished).toBe(1);
  expect(balanced.backlogDelta).toBe(0);
  expect(balanced.backlogDelta).not.toBe(balanced.flow.created);
});

test("проценты: нулевая база и оба нуля дают «нет сравнения»", () => {
  expect(percentChange(3, 1)).toBe(200);
  expect(percentChange(1, 0)).toBeNull();
  expect(percentChange(0, 0)).toBeNull();
  expect(percentChange(2, 4)).toBe(-50);
});

test("динамика по дням покрывает каждый день периода", () => {
  const analytics = buildPeriodAnalytics({ graph, incidents, lifecycles, assignments }, "2026-01-10", 7);
  expect(analytics.dynamics).toHaveLength(7);
  expect(analytics.dynamics[0]?.day).toBe("2026-01-04");
  expect(analytics.dynamics.reduce((sum, point) => sum + point.created, 0)).toBe(analytics.flow.created);
  expect(analytics.dynamics.reduce((sum, point) => sum + point.finished, 0)).toBe(analytics.flow.finished);
});

test("расчёт повторяем и содержит ограничения данных", () => {
  const first = buildPeriodAnalytics({ graph, incidents, lifecycles, assignments }, "2026-01-10", 30);
  const second = buildPeriodAnalytics({ graph, incidents, lifecycles, assignments }, "2026-01-10", 30);
  expect(first).toEqual(second);
  expect(first.period.length).toBe(30);
  expect(first.notes.length).toBeGreaterThan(0);
});
