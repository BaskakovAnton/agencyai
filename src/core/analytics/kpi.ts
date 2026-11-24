/**
 * Сборка периодной аналитики Dashboard (UX-3): Snapshot, Flow, дельта остатка,
 * динамика по дням и ограничения данных. Только расчёты — представление берёт готовое.
 */
import { SLA_PROFILES } from "../../data/sla.ts";
import { dayOf } from "../timeline.ts";
import { slaStateAt } from "../sla-at.ts";
import { comparisonDayOf, periodEndingAt, previousOf, type Period, type PeriodLength } from "../periods.ts";
import { finishedAt, flowOf, type FlowInput, type PeriodFlow } from "./flow.ts";
import { snapshotOn, type DaySnapshot } from "./snapshot.ts";
import type { Incident } from "../../types.ts";

/** Смысл роста показателя: улучшение, ухудшение или нейтрально. */
export type Sentiment = "good" | "bad" | "neutral";

export interface KpiDelta {
  readonly current: number;
  readonly previous: number;
  readonly change: number;
  /** Процент изменения; null — база равна нулю или сравнение некорректно. */
  readonly percent: number | null;
  readonly hasComparison: boolean;
  readonly text: string;
  readonly sentiment: Sentiment;
}

export interface DailyPoint {
  readonly day: string;
  readonly created: number;
  readonly finished: number;
}

export interface PeriodKpi {
  readonly id: string;
  readonly title: string;
  readonly kind: "snapshot" | "flow" | "delta" | "share";
  readonly value: number | null;
  readonly unit: "count" | "percent";
  readonly delta: KpiDelta | null;
  readonly note: string;
  readonly comparison: string;
}

export interface PeriodAnalytics {
  readonly period: Period;
  readonly previous: Period;
  readonly snapshot: DaySnapshot;
  readonly snapshotPrevious: DaySnapshot;
  readonly flow: PeriodFlow;
  readonly flowPrevious: PeriodFlow;
  /** Изменение остатка: активные на конец периода минус активные на конец предыдущего. */
  readonly backlogDelta: number;
  /** Доля завершённых в срок среди завершённых за период; null — завершённых нет. */
  readonly inTimeShare: number | null;
  readonly inTimeSharePrevious: number | null;
  readonly dynamics: readonly DailyPoint[];
  readonly kpis: readonly PeriodKpi[];
  readonly notes: readonly string[];
}

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

const inTimeShareOf = (input: FlowInput, period: Period): number | null => {
  const days = new Set(period.days);
  const finished = input.incidents
    .map((incident) => ({ incident, at: finishedAt(input.graph, incident) }))
    .filter((row): row is { readonly incident: Incident; readonly at: string } => row.at !== null && days.has(dayOf(row.at)));
  if (finished.length === 0) return null;
  const inTime = finished.filter((row) => !slaStateAt(row.incident, dayOf(row.at)).breached).length;
  return Math.round((inTime / finished.length) * 100);
};

const dynamicsOf = (input: FlowInput, period: Period): readonly DailyPoint[] =>
  period.days.map((day) => ({
    day,
    created: input.incidents.filter((incident) => incident.createdAt !== undefined && dayOf(incident.createdAt) === day).length,
    finished: input.incidents.filter((incident) => {
      const at = finishedAt(input.graph, incident);
      return at !== null && dayOf(at) === day;
    }).length,
  }));

const kpisOf = (analytics: Omit<PeriodAnalytics, "kpis" | "notes">): readonly PeriodKpi[] => {
  const { snapshot, snapshotPrevious, flow, flowPrevious, backlogDelta, inTimeShare, inTimeSharePrevious } = analytics;
  const snapshotComparison = "конец периода против конца предыдущего";
  const flowComparison = "события периода против предыдущего периода";
  const items: PeriodKpi[] = [
    { id: "active", title: "Активные обращения", kind: "snapshot", value: snapshot.active, unit: "count", delta: deltaOf(snapshot.active, snapshotPrevious.active, "neutral"), note: "", comparison: snapshotComparison },
    { id: "overdue", title: "Просроченные", kind: "snapshot", value: snapshot.overdue, unit: "count", delta: deltaOf(snapshot.overdue, snapshotPrevious.overdue, "bad"), note: "только незавершённые", comparison: snapshotComparison },
    { id: "paused", title: "На паузе", kind: "snapshot", value: snapshot.paused, unit: "count", delta: deltaOf(snapshot.paused, snapshotPrevious.paused, "neutral"), note: "только незавершённые", comparison: snapshotComparison },
    { id: "pending", title: "Ждут подтверждения", kind: "snapshot", value: snapshot.pendingReview, unit: "count", delta: deltaOf(snapshot.pendingReview, snapshotPrevious.pendingReview, "bad"), note: "по журналу проверок", comparison: snapshotComparison },
    { id: "created", title: "Поступило", kind: "flow", value: flow.created, unit: "count", delta: deltaOf(flow.created, flowPrevious.created, "neutral"), note: "объём обращений", comparison: flowComparison },
    { id: "finished", title: "Завершено", kind: "flow", value: flow.finished, unit: "count", delta: deltaOf(flow.finished, flowPrevious.finished, "good"), note: "вход в терминальный узел", comparison: flowComparison },
    { id: "approved", title: "Подтверждено контролёром", kind: "flow", value: flow.approved, unit: "count", delta: deltaOf(flow.approved, flowPrevious.approved, "good"), note: "", comparison: flowComparison },
    { id: "reopened", title: "Переоткрыто", kind: "flow", value: flow.reopened, unit: "count", delta: deltaOf(flow.reopened, flowPrevious.reopened, "bad"), note: "", comparison: flowComparison },
    { id: "rejected", title: "Отказано в подтверждении", kind: "flow", value: flow.rejected, unit: "count", delta: deltaOf(flow.rejected, flowPrevious.rejected, "bad"), note: "", comparison: flowComparison },
    { id: "backlog", title: "Изменение остатка", kind: "delta", value: backlogDelta, unit: "count", delta: null, note: "активные: конец против конца предыдущего периода", comparison: "дельта, а не поток" },
    { id: "inTime", title: "Завершено в срок", kind: "share", value: inTimeShare, unit: "percent", delta: inTimeShare !== null && inTimeSharePrevious !== null ? deltaOf(inTimeShare, inTimeSharePrevious, "good") : null, note: "среди завершённых за период", comparison: flowComparison },
  ];
  return items;
};

const notesOf = (input: FlowInput, analytics: Omit<PeriodAnalytics, "kpis" | "notes">): readonly string[] => {
  const notes: string[] = [
    "Snapshot — состояние на конец периода, Flow — события внутри периода; дельта остатка не равна потоку.",
    "Просрочка и пауза считаются только по незавершённым обращениям.",
    "Рейтинг подразделений по SLA не строится: передача ответственности и причины паузы не позволяют отнести просрочку однозначно.",
    "Записи подтверждения, датированные позже выбранного дня, в период не попадают.",
  ];
  if (analytics.inTimeShare === null) notes.push("В периоде нет завершённых обращений — доля в срок не рассчитывается.");
  if (!analytics.snapshot.hasData) notes.push("На конец периода нет данных: проверьте выбранную дату среза.");
  if (SLA_PROFILES.routine.resolveHours === 0) notes.push("Для приоритета без норматива SLA показатель не рассчитывается.");
  if ((input.assignments ?? []).length === 0) notes.push("Назначения подразделений в срезе отсутствуют.");
  return notes;
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
  return { ...withDelta, kpis: kpisOf(withDelta), notes: notesOf(input, withDelta) };
};
