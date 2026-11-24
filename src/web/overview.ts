import { isFinished, priorityRank } from "../core/incident.ts";
import { DEMO_ORIGIN, dayOf, formatStamp, incidentAt, visibleAt } from "../core/timeline.ts";
import { hoursSince, slaPhaseOnDay, slaStateAt, type SlaPhase } from "../core/sla-at.ts";
import { PRIORITY_TITLES } from "../data/roles.ts";
import { SLA_PROFILES } from "../data/sla.ts";
import type { Graph, Incident, Priority } from "../types.ts";

export type Tone = "red" | "amber" | "green" | "gray" | "blue";

export interface KpiSet {
  readonly active: number;
  readonly attention: number;
  readonly paused: number;
  readonly completed: number;
  readonly total: number;
}

export interface AttentionItem {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly priority: Priority;
  readonly priorityTone: Tone;
  readonly priorityTitle: string;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly phase: SlaPhase;
  readonly slaTone: Tone;
  readonly slaText: string;
}

export interface ActivityRow {
  readonly id: string;
  readonly icon: string;
  readonly text: string;
  readonly time: string;
}

export interface DistributionRow {
  readonly id: Priority;
  readonly title: string;
  readonly count: number;
  readonly tone: Tone;
}

export interface SlaRow {
  readonly id: SlaPhase;
  readonly title: string;
  readonly count: number;
  readonly share: number;
}

export interface Overview {
  readonly day: string;
  readonly kpi: KpiSet;
  readonly attention: readonly AttentionItem[];
  readonly events: readonly ActivityRow[];
  readonly distribution: readonly DistributionRow[];
  readonly sla: readonly SlaRow[];
  readonly inTimeShare: number;
}

export const PRIORITY_TONES: Readonly<Record<Priority, Tone>> = { urgent: "red", normal: "amber", routine: "gray", none: "gray" };
export const PHASE_TONES: Readonly<Record<SlaPhase, Tone>> = { ok: "green", paused: "amber", overdue: "red", none: "gray" };
export const PHASE_TITLES: Readonly<Record<SlaPhase, string>> = { ok: "В срок", paused: "Пауза", overdue: "Просрочено", none: "Нет SLA" };

/** Часы модельного времени на конец выбранного дня. */
const dayEndHours = (day: string): number => hoursSince(DEMO_ORIGIN, day + "T23:59:59.999Z");

/** Остаток норматива в часах (может быть отрицательным — срок уже нарушен). */
export const slaHoursLeft = (incident: Incident, day: string): number =>
  Math.round(slaStateAt(incident, day).dueAt - dayEndHours(day));

/**
 * Формула «требуют внимания»: просрочен SLA **или** срочная незавершённая заявка.
 * Формула зафиксирована тестом `needsAttention`.
 */
export const needsAttention = (graph: Graph, incident: Incident, day: string): boolean => {
  if (slaPhaseOnDay(incident, day) === "overdue") return true;
  return incident.priority === "urgent" && !isFinished(incidentAt(incident, day), graph);
};

/** Контроль сроков: нарушен, если фаза вне SLA; «на риске», если в срок, но осталось ≤ 24 ч. */
export const slaIsAtRisk = (incident: Incident, day: string): boolean => {
  const phase = slaPhaseOnDay(incident, day);
  if (phase === "overdue") return true;
  if (phase !== "ok") return false;
  if (SLA_PROFILES[incident.priority].resolveHours === 0) return false;
  const left = slaHoursLeft(incident, day);
  return left > 0 && left <= 24;
};

export const slaTextFor = (incident: Incident, day: string): string => {
  const phase = slaPhaseOnDay(incident, day);
  if (phase !== "ok") return PHASE_TITLES[phase];
  if (SLA_PROFILES[incident.priority].resolveHours === 0) return PHASE_TITLES.none;
  const left = slaHoursLeft(incident, day);
  return left > 0 ? "Осталось " + left + " ч" : PHASE_TITLES.overdue;
};

/** Сводка обзора: KPI, требующие внимания, события, распределение и контроль сроков. */
export const buildOverview = (graph: Graph, incidents: readonly Incident[], day: string): Overview => {
  const slice = visibleAt(incidents, day);
  const phases = slice.map((incident) => slaPhaseOnDay(incident, day));

  const attention: AttentionItem[] = slice
    .filter((incident) => needsAttention(graph, incident, day))
    .map((incident) => {
      const asOf = incidentAt(incident, day);
      const phase = slaPhaseOnDay(incident, day);
      return {
        id: incident.id,
        title: incident.title,
        address: incident.address ?? "",
        priority: incident.priority,
        priorityTone: PRIORITY_TONES[incident.priority],
        priorityTitle: PRIORITY_TITLES[incident.priority],
        nodeId: asOf.nodeId,
        nodeTitle: graph.byId[asOf.nodeId]?.title ?? "",
        phase,
        slaTone: PHASE_TONES[phase],
        slaText: slaTextFor(incident, day),
      };
    })
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id, "ru", { numeric: true }));

  const eventRows = slice
    .flatMap((incident) =>
      incidentAt(incident, day).history
        .filter((move) => move.at !== undefined && dayOf(move.at) <= day)
        .map((move) => ({
          id: incident.id,
          at: move.at as string,
          text: incident.id + " перешло на узел «" + (graph.byId[move.to]?.title ?? move.to) + "»",
        })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const events: ActivityRow[] = eventRows.map((row) => ({
    id: row.id,
    icon: "↗",
    text: row.text,
    time: formatStamp(row.at) + " · модель",
  }));

  const distribution: DistributionRow[] = (["urgent", "normal", "routine", "none"] as readonly Priority[]).map((priority) => ({
    id: priority,
    title: PRIORITY_TITLES[priority],
    count: slice.filter((incident) => incident.priority === priority).length,
    tone: PRIORITY_TONES[priority],
  }));

  const sla: SlaRow[] = (["ok", "paused", "overdue", "none"] as readonly SlaPhase[]).map((phase) => {
    const count = phases.filter((value) => value === phase).length;
    return {
      id: phase,
      title: PHASE_TITLES[phase],
      count,
      share: slice.length === 0 ? 0 : Math.round((count / slice.length) * 100),
    };
  });

  const completed = slice.filter((incident) => isFinished(incidentAt(incident, day), graph)).length;
  const paused = phases.filter((phase) => phase === "paused").length;
  const overdue = phases.filter((phase) => phase === "overdue").length;

  return {
    day,
    kpi: { active: slice.length - completed, attention: attention.length, paused, completed, total: slice.length },
    attention: attention.slice(0, 8),
    events,
    distribution,
    sla,
    inTimeShare: slice.length === 0 ? 0 : Math.round(((slice.length - overdue - paused) / slice.length) * 100),
  };
};
