/** Длительности (UX-3.2.5, DEC-06): два потока времени — этапы процесса и жизненный цикл. */
import type { Move } from "../../types.ts";
import type { IncidentLifecycle, ReviewRecord } from "../org/completion-types.ts";

export interface Interval {
  readonly nodeId: string;
  readonly from: string;
  readonly to: string;
  readonly hours: number;
}

export interface LifecycleInterval {
  readonly from: ReviewRecord["type"];
  readonly to: ReviewRecord["type"];
  readonly at: string;
  readonly hours: number;
}

export interface StageReport {
  readonly intervals: readonly Interval[];
  /** null — история неполная: часть ходов без времени. Ноль часов не подставляется. */
  readonly hours: number | null;
}

export interface LifecycleReport {
  readonly intervals: readonly LifecycleInterval[];
  /** null — журнал короче двух записей: интервал не определён. */
  readonly hours: number | null;
}

export interface DurationReport {
  readonly stage: StageReport;
  readonly lifecycle: LifecycleReport;
  readonly stageHours: number | null;
  readonly lifecycleHours: number | null;
}

const HOUR = 3_600_000;
/** Совпадающие метки дают 0 ч; округление до сотых, отрицательные значения невозможны. */
const hoursBetween = (from: string, to: string): number =>
  Math.max(0, Math.round((((Date.parse(to) - Date.parse(from)) / HOUR) * 100) || 0) / 100);

/** Интервалы этапов по `Move.at`; ходы без времени исключаются, итог помечается как неполный. */
export const stageIntervals = (history: readonly Move[]): StageReport => {
  const timed = history.filter((move): move is Move & { at: string } => typeof move.at === "string" && move.at !== "");
  if (timed.length !== history.length) return { intervals: [], hours: null };
  if (timed.length < 2) return { intervals: [], hours: null };
  const intervals = timed.slice(0, -1).map((move, index) => {
    const next = timed[index + 1] as Move & { at: string };
    return { nodeId: move.to, from: move.at, to: next.at, hours: hoursBetween(move.at, next.at) };
  });
  return { intervals, hours: intervals.reduce((sum, item) => sum + item.hours, 0) };
};

/** Интервалы жизненного цикла по `records`; порядок журнала append-only и не пересортировывается. */
export const lifecycleIntervals = (lifecycle?: IncidentLifecycle): LifecycleReport => {
  const records = lifecycle?.records ?? [];
  if (records.length < 2) return { intervals: [], hours: null };
  const intervals = records.slice(0, -1).map((record, index) => {
    const next = records[index + 1] as ReviewRecord;
    return { from: record.type, to: next.type, at: next.at, hours: hoursBetween(record.at, next.at) };
  });
  return { intervals, hours: intervals.reduce((sum, item) => sum + item.hours, 0) };
};

/** Оба потока считаются раздельно и не смешиваются. */
export const durationsOf = (input: { readonly history: readonly Move[]; readonly lifecycle?: IncidentLifecycle }): DurationReport => {
  const stage = stageIntervals(input.history);
  const lifecycle = lifecycleIntervals(input.lifecycle);
  return { stage, lifecycle, stageHours: stage.hours, lifecycleHours: lifecycle.hours };
};
