/** Типы периодной аналитики UX-3: вынесены отдельно, чтобы модули расчёта и реестра не замыкались друг на друга. */
import type { Period } from "../periods.ts";
import type { PeriodFlow } from "./flow.ts";
import type { DaySnapshot } from "./snapshot.ts";

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
  /** Подтверждённые завершения в этот день (записи `approved`). */
  readonly finished: number;
  /** Достижения терминального узла в этот день — не подтверждение завершения. */
  readonly reachedTerminal: number;
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
  /** Доля подтверждённых в срок среди подтверждённых за период; null — подтверждённых нет. */
  readonly inTimeShare: number | null;
  readonly inTimeSharePrevious: number | null;
  readonly dynamics: readonly DailyPoint[];
  readonly kpis: readonly PeriodKpi[];
  readonly notes: readonly string[];
}
