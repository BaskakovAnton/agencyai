import { SLA_PROFILES } from "../data/sla.ts";
import type { Incident, Priority, SlaState } from "../types.ts";
import { startSla } from "./sla.ts";
import { dayOf } from "./timeline.ts";

/** Фаза SLA: в срок, на паузе, вне SLA (просрочено) или норматив не задан. */
export type SlaPhase = "ok" | "paused" | "overdue" | "none";

/**
 * Короткие подписи для значков и легенд (исторический вид, нижний регистр).
 * Внимание: у фаз `overdue` и `none` здесь совпадающая подпись — для различимых состояний
 * используйте `SLA_PHASE_LABELS`.
 */
export const SLA_PHASE_TITLES: Readonly<Record<SlaPhase, string>> = {
  ok: "в срок",
  paused: "на паузе",
  overdue: "вне SLA",
  none: "вне SLA",
};

export const SLA_PHASES: readonly SlaPhase[] = ["ok", "paused", "overdue", "none"];

/** Подписи для легенды: просрочка и «вне норматива» — разные вещи. */
/** Полные подписи для карточек и таблиц: единый источник для веб-экранов. */
export const SLA_PHASE_LABELS: Readonly<Record<SlaPhase, string>> = {
  ok: "В срок",
  paused: "Пауза",
  overdue: "Просрочено",
  none: "Нет SLA",
};

export const SLA_LEGEND_TITLES: Readonly<Record<SlaPhase, string>> = {
  ok: "в срок",
  paused: "на паузе",
  overdue: "вне SLA (просрочено)",
  none: "вне норматива",
};

/** Часы между двумя моментами (не отрицательные). */
export const hoursSince = (fromIso: string, toIso: string): number =>
  Math.max(0, (Date.parse(toIso) - Date.parse(fromIso)) / 3_600_000);

/** Фаза SLA по сохранённому состоянию на момент времени — чистая функция для хронологии. */
export const slaPhaseOf = (priority: Priority, sla: SlaState, clock: number): SlaPhase => {
  if (SLA_PROFILES[priority].resolveHours === 0) return "none";
  if (sla.paused) return "paused";
  return clock > sla.dueAt ? "overdue" : "ok";
};

/** Фаза SLA в момент события заявки: состояние берётся из записи перехода. */
export const slaPhaseAtEvent = (incident: Incident, at: string, state?: SlaState): SlaPhase => {
  const sla = state ?? startSla(incident.priority, 0);
  return slaPhaseOf(incident.priority, sla, hoursSince(incident.createdAt ?? at, at));
};

/** Состояние SLA заявки на конец дня: последняя запись перехода до этой даты. */
export const slaStateAt = (incident: Incident, day: string): SlaState => {
  const moves = incident.history.filter((move) => (move.at === undefined ? false : dayOf(move.at) <= day));
  return moves.at(-1)?.sla ?? startSla(incident.priority, 0);
};

/** Фаза SLA заявки на конец дня — так пересчитываются метки при перемотке времени. */
export const slaPhaseOnDay = (incident: Incident, day: string): SlaPhase =>
  slaPhaseOf(
    incident.priority,
    slaStateAt(incident, day),
    hoursSince(incident.createdAt ?? day + "T00:00:00.000Z", day + "T23:59:59.999Z"),
  );

/** Фаза SLA заявки на произвольный момент (по её финальному состоянию). */
export const slaPhaseAt = (incident: Incident, iso: string): SlaPhase =>
  slaPhaseOf(incident.priority, incident.sla, hoursSince(incident.createdAt ?? iso, iso));
