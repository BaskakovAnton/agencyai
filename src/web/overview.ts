import { isFinished, priorityRank } from "../core/incident.ts";
import { dayOf, formatStamp, incidentAt, visibleAt } from "../core/timeline.ts";
import { SLA_PHASE_LABELS, slaPhaseOnDay, type SlaPhase } from "../core/sla-at.ts";
import { slaHoursLeft, slaIsAtRisk, needsAttention } from "../core/sla-attention.ts";
import { buildPeriodAnalytics, type PeriodAnalytics } from "../core/analytics/kpi.ts";
import { snapshotOn } from "../core/analytics/snapshot.ts";
import type { PeriodLength } from "../core/periods.ts";
import { PRIORITY_TITLES } from "../data/roles.ts";
import { SLA_PROFILES } from "../data/sla.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import { incidentDepartmentName, orgFactsFor, type OrgFacts } from "./org-integration.ts";
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
  /** Ответственное подразделение; пусто, если орг-модель не подключена. */
  readonly departmentName: string;
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
  /** Сколько обращений среза на риске нарушения SLA (просрочка или остаток ≤ 24 ч). */
  readonly atRisk: number;
  /** Орг-факты (UX-4): подразделения и ожидание подтверждения; null — модель не подключена. */
  readonly org: OrgFacts | null;
  /** Периодная аналитика (UX-3): Snapshot, Flow, дельта остатка и динамика. */
  readonly analytics: PeriodAnalytics;
}

export const PRIORITY_TONES: Readonly<Record<Priority, Tone>> = { urgent: "red", normal: "amber", routine: "gray", none: "gray" };
export const PHASE_TONES: Readonly<Record<SlaPhase, Tone>> = { ok: "green", paused: "amber", overdue: "red", none: "gray" };
/** Подписи фаз: единый источник — core/sla-at.ts (SLA_PHASE_LABELS). */
export const PHASE_TITLES: Readonly<Record<SlaPhase, string>> = SLA_PHASE_LABELS;

export { needsAttention, slaHoursLeft, slaIsAtRisk } from "../core/sla-attention.ts";

export const slaTextFor = (incident: Incident, day: string): string => {
  const phase = slaPhaseOnDay(incident, day);
  if (phase !== "ok") return PHASE_TITLES[phase];
  if (SLA_PROFILES[incident.priority].resolveHours === 0) return PHASE_TITLES.none;
  const left = slaHoursLeft(incident, day);
  return left > 0 ? "Осталось " + left + " ч" : PHASE_TITLES.overdue;
};

/** Сводка обзора: KPI, требующие внимания, события, распределение и контроль сроков. */
export const buildOverview = (
  graph: Graph,
  incidents: readonly Incident[],
  day: string,
  org?: OrgQuery,
  period: PeriodLength = 7,
): Overview => {
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
        departmentName: org === undefined ? "" : incidentDepartmentName(org, incident.id),
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

  // KPI берутся из доменного Snapshot: одно правило для карточки, реестра и аналитики.
  const state = snapshotOn(graph, incidents, day, org?.allLifecycles?.() ?? {});

  return {
    day,
    kpi: {
      active: state.active,
      attention: state.attention,
      paused: state.paused,
      completed: state.finished,
      total: state.total,
    },
    attention: attention.slice(0, 8),
    events,
    distribution,
    sla,
    atRisk: state.atRisk,
    org: org === undefined ? null : orgFactsFor(org, slice.map((incident) => incident.id)),
    analytics: buildPeriodAnalytics(
      {
        graph,
        incidents,
        lifecycles: org?.allLifecycles?.() ?? {},
        assignments: org?.allAssignments?.() ?? [],
      },
      day,
      period,
    ),
  };
};