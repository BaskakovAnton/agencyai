/**
 * Snapshot — состояние обращений на конкретный день (UX-3, уточнено в UX-3.1).
 * Завершённым считается только обращение с подтверждающей записью жизненного цикла `approved`;
 * достижение терминального узла само по себе завершением не является (см. `flow.reachedTerminal`).
 */
import { needsAttention, slaIsAtRisk } from "../sla-attention.ts";
import { slaPhaseOnDay } from "../sla-at.ts";
import { dayOf, visibleAt } from "../timeline.ts";
import type { IncidentLifecycle } from "../org/completion.ts";
import type { IncidentStatus } from "../org/types.ts";
import type { Graph, Incident } from "../../types.ts";

export interface DaySnapshot {
  readonly day: string;
  /** Видимые заявки среза. */
  readonly total: number;
  /** Незавершённые: в работе, ожидают проверки, переоткрытые и вернувшиеся после отказа. */
  readonly active: number;
  /** Подтверждённо завершённые (запись `approved` к этой дате). */
  readonly finished: number;
  /** Просрочка, пауза и отсутствие норматива — только по активным. */
  readonly overdue: number;
  readonly paused: number;
  readonly none: number;
  /** Ожидают подтверждения завершения на эту дату. */
  readonly pendingReview: number;
  /** Просрочка или остаток ≤ 24 ч (только активные). */
  readonly atRisk: number;
  /** Требуют внимания по единому правилу `needsAttention` (только активные). */
  readonly attention: number;
  readonly hasData: boolean;
}

/**
 * Статус подтверждения на конец дня: журнал записей проигрывается до указанной даты.
 * Порядок записей — часть контракта append-only журнала (см. `IncidentLifecycle.records`):
 * записи с одинаковым `at` разрешаются по позиции, побеждает последняя; сортировка не применяется.
 * Нет записей к этой дате — обращение считается «в работе».
 */
export const lifecycleStatusOn = (lifecycle: IncidentLifecycle, day: string): IncidentStatus => {
  let status: IncidentStatus = "active";
  for (const record of lifecycle.records) {
    if (dayOf(record.at) > day) continue;
    if (record.type === "submitted") status = "pending_review";
    else if (record.type === "approved") status = "completed";
    else if (record.type === "rejected") status = "active";
    else status = "reopened";
  }
  return status;
};

export const snapshotOn = (
  graph: Graph,
  incidents: readonly Incident[],
  day: string,
  lifecycles: Readonly<Record<string, IncidentLifecycle>> = {},
): DaySnapshot => {
  const slice = visibleAt(incidents, day);
  let active = 0;
  let finished = 0;
  let overdue = 0;
  let paused = 0;
  let none = 0;
  let pendingReview = 0;
  let atRisk = 0;
  let attention = 0;

  for (const incident of slice) {
    const lifecycle = lifecycles[incident.id];
    const status: IncidentStatus | null = lifecycle ? lifecycleStatusOn(lifecycle, day) : null;
    // Приоритет бизнес-состояния над состоянием графа: подтверждение важнее терминального узла.
    if (status === "completed") {
      finished += 1;
      continue;
    }
    active += 1;
    if (status === "pending_review") pendingReview += 1;
    const phase = slaPhaseOnDay(incident, day);
    if (phase === "overdue") overdue += 1;
    else if (phase === "paused") paused += 1;
    else if (phase === "none") none += 1;
    if (slaIsAtRisk(incident, day)) atRisk += 1;
    if (needsAttention(graph, incident, day)) attention += 1;
  }

  return {
    day,
    total: slice.length,
    active,
    finished,
    overdue,
    paused,
    none,
    pendingReview,
    atRisk,
    attention,
    hasData: slice.length > 0,
  };
};
