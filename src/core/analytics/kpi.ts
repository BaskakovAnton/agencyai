/**
 * Сборка периодной аналитики Dashboard (UX-3, уточнено UX-3.1):
 * Snapshot и Flow, дельта остатка, динамика по дням и ограничения данных.
 */
import { dayOf } from "../timeline.ts";
import { slaStateAt } from "../sla-at.ts";
import { comparisonDayOf, periodEndingAt, previousOf, type Period, type PeriodLength } from "../periods.ts";
import { flowOf, reachedTerminalAt, type FlowInput } from "./flow.ts";
import { snapshotOn } from "./snapshot.ts";
import { kpisOf, notesOf } from "./registry.ts";
import type { DailyPoint, KpiDelta, PeriodAnalytics, PeriodKpi, Sentiment } from "./kpi-types.ts";

export type { DailyPoint, KpiDelta, PeriodAnalytics, PeriodKpi, Sentiment } from "./kpi-types.ts";

/** Процент изменения: база 0 делает сравнение некорректным. */
export const percentChange = (current: number, previous: number): number | null =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;

export const deltaOf = (current: number, previous: number, sentiment: Sentiment): KpiDelta => {
  const percent = percentChange(current, previous);
  return {
    current,
    previous,
    change: current - previous,
    percent,
    hasComparison: percent !== null,
    text: percent === null ? "нет сравнения" : (percent > 0 ? "+" : "") + percent + " %",
    sentiment,
  };
};

/** Подтверждения за период: доля тех, у которых на дату подтверждения не было нарушения норматива. */
const inTimeShareOf = (input: FlowInput, period: Period): number | null => {
  const days = new Set(period.days);
  const byId = new Map(input.incidents.map((incident) => [incident.id, incident]));
  const approvals = Object.values(input.lifecycles ?? {}).flatMap((lifecycle) =>
    lifecycle.records
      .filter((record) => record.type === "approved" && days.has(dayOf(record.at)))
      .map((record) => ({ incident: byId.get(lifecycle.incidentId), at: record.at })),
  ).filter((row): row is { readonly incident: NonNullable<ReturnType<typeof byId.get>>; readonly at: string } => row.incident !== undefined);
  if (approvals.length === 0) return null;
  const inTime = approvals.filter((row) => !slaStateAt(row.incident, dayOf(row.at)).breached).length;
  return Math.round((inTime / approvals.length) * 100);
};

const dynamicsOf = (input: FlowInput, period: Period): readonly DailyPoint[] => {
  const days = new Set(period.days);
  const approvals = Object.values(input.lifecycles ?? {})
    .flatMap((lifecycle) => lifecycle.records.filter((record) => record.type === "approved"))
    .filter((record) => days.has(dayOf(record.at)));
  return period.days.map((day) => ({
    day,
    created: input.incidents.filter((incident) => incident.createdAt !== undefined && dayOf(incident.createdAt) === day).length,
    finished: approvals.filter((record) => dayOf(record.at) === day).length,
    reachedTerminal: input.incidents.filter((incident) => {
      const at = reachedTerminalAt(input.graph, incident);
      return at !== null && dayOf(at) === day;
    }).length,
  }));
};

/** Полная модель периодной аналитики для Dashboard. */
export const buildPeriodAnalytics = (input: FlowInput, endDay: string, length: PeriodLength): PeriodAnalytics => {
  const period = periodEndingAt(endDay, length);
  const previous = previousOf(period);
  const lifecycles = input.lifecycles ?? {};
  const base = {
    period,
    previous,
    snapshot: snapshotOn(input.graph, input.incidents, period.toDay, lifecycles),
    snapshotPrevious: snapshotOn(input.graph, input.incidents, comparisonDayOf(period), lifecycles),
    flow: flowOf(input, period),
    flowPrevious: flowOf(input, previous),
    backlogDelta: 0,
    inTimeShare: inTimeShareOf(input, period),
    inTimeSharePrevious: inTimeShareOf(input, previous),
    dynamics: dynamicsOf(input, period),
  };
  const withDelta = { ...base, backlogDelta: base.snapshot.active - base.snapshotPrevious.active };
  return { ...withDelta, kpis: kpisOf(withDelta, deltaOf), notes: notesOf(input, withDelta) };
};
