import { isFinished, priorityRank } from "../core/incident.ts";
import { SLA_PHASES, slaPhaseOnDay, type SlaPhase } from "../core/sla-at.ts";
import { addHours, dayOf, formatDay, incidentAt, visibleAt } from "../core/timeline.ts";
import { GROUP_TITLES, PRIORITY_TITLES } from "../data/roles.ts";
import { situationById } from "../data/situations.ts";
import type { Graph, Incident, Priority } from "../types.ts";

export interface OverviewKpi {
  readonly total: number;
  readonly attention: number;
  readonly paused: number;
  readonly overdue: number;
  readonly ok: number;
  readonly none: number;
  readonly urgent: number;
}

export interface AttentionItem {
  readonly id: string;
  readonly title: string;
  readonly situation: string;
  readonly priority: Priority;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly phase: SlaPhase;
  readonly reason: string;
}

export interface OverviewEvent {
  readonly id: string;
  readonly at: string;
  readonly nodeId: string;
  readonly nodeTitle: string;
}

export interface DayChip {
  readonly day: string;
  readonly label: string;
  readonly total: number;
  readonly attention: number;
}

export interface GroupTile {
  readonly id: string;
  readonly title: string;
  readonly nodes: number;
  readonly incidents: number;
}

export interface DailyBar {
  readonly day: string;
  readonly label: string;
  readonly total: number;
  readonly overdue: number;
}

export interface MatrixRow {
  readonly id: string;
  readonly title: string;
  readonly metric: string;
  readonly values: readonly number[];
  readonly delta: number;
}

export interface WorkflowStep {
  readonly n: number;
  readonly title: string;
  readonly detail: string;
  readonly count: number;
  readonly current: boolean;
}

export interface Overview {
  readonly day: string;
  readonly kpi: OverviewKpi;
  readonly attention: readonly AttentionItem[];
  readonly events: readonly OverviewEvent[];
  readonly days: readonly DayChip[];
  readonly groups: readonly GroupTile[];
  readonly daily: readonly DailyBar[];
  readonly matrix: readonly MatrixRow[];
  readonly summary: readonly string[];
  readonly workflow: readonly WorkflowStep[];
}

/** Формула «требуют внимания»: просрочен SLA **или** срочная заявка, ещё не завершённая. */
export const needsAttention = (graph: Graph, incident: Incident, day: string): boolean => {
  if (slaPhaseOnDay(incident, day) === "overdue") return true;
  return incident.priority === "urgent" && !isFinished(incidentAt(incident, day), graph);
};

/** Окно из шести дней, заканчивающееся выбранной датой. */
export const dayWindow = (day: string, size = 6): readonly string[] => {
  const out: string[] = [];
  for (let i = size - 1; i >= 0; i--) out.push(dayOf(addHours(day + "T00:00:00.000Z", -24 * i)));
  return out;
};

const STAGES: readonly (readonly [string, string, number, number])[] = [
  ["Приём и регистрация", "обращение принято и зарегистрировано", 1, 4],
  ["Назначение и исполнение", "диспетчер назначает, подрядчик выполняет", 5, 13],
  ["Контроль и закрытие", "проверка, согласования, паузы SLA", 14, 29],
  ["Архив", "закрыто и сохранено на 5 лет", 30, 30],
];

/** Сводка обзора на выбранный день: KPI, требующие внимания заявки, события и блоки эталона. */
export const buildOverview = (graph: Graph, incidents: readonly Incident[], day: string): Overview => {
  const slice = visibleAt(incidents, day);
  const phases = slice.map((incident) => slaPhaseOnDay(incident, day));
  const attention = slice
    .filter((incident) => needsAttention(graph, incident, day))
    .map((incident) => {
      const asOf = incidentAt(incident, day);
      const phase = slaPhaseOnDay(incident, day);
      return {
        id: incident.id,
        title: incident.title,
        situation: situationById(incident.situationId)?.title ?? "",
        priority: incident.priority,
        nodeId: asOf.nodeId,
        nodeTitle: graph.byId[asOf.nodeId]?.title ?? "",
        phase,
        reason: phase === "overdue" ? "просрочен SLA" : "срочная",
      };
    })
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id, "ru", { numeric: true }));

  const events = slice
    .flatMap((incident) =>
      incidentAt(incident, day).history
        .filter((move) => move.at !== undefined)
        .map((move) => ({ id: incident.id, at: move.at as string, nodeId: move.to, nodeTitle: graph.byId[move.to]?.title ?? "" })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const window = dayWindow(day);
  const days: DayChip[] = window.map((value) => {
    const daySlice = visibleAt(incidents, value);
    return {
      day: value,
      label: formatDay(value).replace(/ \d{4}$/, ""),
      total: daySlice.length,
      attention: daySlice.filter((incident) => needsAttention(graph, incident, value)).length,
    };
  });

  const groups: GroupTile[] = Object.entries(GROUP_TITLES).map(([id, title]) => ({
    id,
    title,
    nodes: graph.order.filter((nodeId) => graph.byId[nodeId]?.group === id).length,
    incidents: slice.filter((incident) => graph.byId[incidentAt(incident, day).nodeId]?.group === id).length,
  }));

  const daily: DailyBar[] = window.map((value) => {
    const daySlice = visibleAt(incidents, value);
    return {
      day: value,
      label: formatDay(value).replace(/ \d{4}$/, ""),
      total: daySlice.length,
      overdue: daySlice.filter((incident) => slaPhaseOnDay(incident, value) === "overdue").length,
    };
  });

  const priorities: readonly Priority[] = ["urgent", "normal", "routine", "none"];
  const matrix: MatrixRow[] = priorities.map((priority) => {
    const values = window.map((value) => {
      const list = visibleAt(incidents, value).filter((incident) => incident.priority === priority);
      if (list.length === 0) return 0;
      const ok = list.filter((incident) => slaPhaseOnDay(incident, value) === "ok").length;
      return Math.round((ok / list.length) * 1000) / 10;
    });
    const first = values[0] ?? 0;
    const last = values.at(-1) ?? 0;
    return {
      id: priority,
      title: PRIORITY_TITLES[priority],
      metric: "в срок, %",
      values,
      delta: Math.round((last - first) * 10) / 10,
    };
  });

  const workflow: WorkflowStep[] = STAGES.map(([title, detail, from, to]) => {
    const nodes = new Set(graph.order.slice(from - 1, to));
    const count = slice.filter((incident) => nodes.has(incidentAt(incident, day).nodeId)).length;
    return { n: 0, title, detail, count, current: false };
  }).map((step, index) => ({ ...step, n: index + 1 }));
  const busiest = workflow.reduce((best, step) => (step.count > best.count ? step : best), workflow[0]!);
  const withCurrent = workflow.map((step) => ({ ...step, current: step.title === busiest.title && busiest.count > 0 }));

  const total = slice.length;
  const share = (value: number): string => (total === 0 ? "0" : String(Math.round((value / total) * 100)));
  const summary: readonly string[] = [
    "Заявок в срезе: " + total,
    "В срок: " + share(phases.filter((phase) => phase === "ok").length) + "%",
    "На паузе: " + phases.filter((phase) => phase === "paused").length,
    "Просрочено: " + phases.filter((phase) => phase === "overdue").length,
    "Требуют внимания: " + attention.length,
  ];

  return {
    day,
    kpi: {
      total,
      attention: attention.length,
      paused: phases.filter((phase) => phase === "paused").length,
      overdue: phases.filter((phase) => phase === "overdue").length,
      ok: phases.filter((phase) => phase === "ok").length,
      none: phases.filter((phase) => phase === "none").length,
      urgent: slice.filter((incident) => incident.priority === "urgent").length,
    },
    attention: attention.slice(0, 8),
    events,
    days,
    groups,
    daily,
    matrix,
    summary,
    workflow: withCurrent,
  };
};

export { SLA_PHASES };
