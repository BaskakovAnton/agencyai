/** Snapshot — состояние обращений на конкретный день (UX-3). Только чтение, без побочных эффектов. */
import { isFinished } from "../incident.ts";
import { slaIsAtRisk } from "../sla-attention.ts";
import { slaPhaseOnDay } from "../sla-at.ts";
import { dayOf, visibleAt } from "../timeline.ts";
import type { IncidentLifecycle } from "../org/completion.ts";
import type { IncidentStatus } from "../org/types.ts";
import type { Graph, Incident } from "../../types.ts";

export interface DaySnapshot {
  readonly day: string;
  /** Видимые заявки среза. */
  readonly total: number;
  /** Незавершённые. */
  readonly active: number;
  readonly finished: number;
  /** Просрочка, пауза и отсутствие норматива — только по незавершённым. */
  readonly overdue: number;
  readonly paused: number;
  readonly none: number;
  /** Ожидают подтверждения завершения по журналу проверок. */
  readonly pendingReview: number;
  /** Просрочка или остаток ≤ 24 ч (только незавершённые). */
  readonly atRisk: number;
  readonly hasData: boolean;
}

/**
 * Статус подтверждения на конец дня: журнал записей проигрывается до указанной даты.
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

  for (const incident of slice) {
    if (isFinished(incident, graph)) {
      finished += 1;
      continue;
    }
    active += 1;
    const phase = slaPhaseOnDay(incident, day);
    if (phase === "overdue") overdue += 1;
    else if (phase === "paused") paused += 1;
    else if (phase === "none") none += 1;
    if (slaIsAtRisk(incident, day)) atRisk += 1;
    const lifecycle = lifecycles[incident.id];
    if (lifecycle && lifecycleStatusOn(lifecycle, day) === "pending_review") pendingReview += 1;
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
    hasData: slice.length > 0,
  };
};
