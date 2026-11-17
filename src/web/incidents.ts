import { priorityRank } from "../core/incident.ts";
import { slaPhaseOnDay, SLA_PHASES, type SlaPhase } from "../core/sla-at.ts";
import { slaStateAt } from "../core/sla-at.ts";
import { addHours, dayOf, historyUpTo, incidentAt, visibleAt } from "../core/timeline.ts";
import { situationById } from "../data/situations.ts";
import type { Graph, Incident, Priority } from "../types.ts";

export type IncidentSort = "id" | "priority" | "date" | "urgency";

export interface IncidentFilters {
  readonly q: string;
  readonly priority: Priority | "";
  readonly sla: SlaPhase | "";
  readonly node: string;
  readonly sort: IncidentSort;
}

export interface IncidentRow {
  readonly id: string;
  readonly title: string;
  readonly situation: string;
  readonly priority: Priority;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly phase: SlaPhase;
  readonly lastEvent: string;
  readonly dueDay: string;
}

const PRIORITIES: readonly Priority[] = ["urgent", "normal", "routine", "none"];
const SORTS: readonly IncidentSort[] = ["id", "priority", "date", "urgency"];

export const defaultFilters = (): IncidentFilters => ({ q: "", priority: "", sla: "", node: "", sort: "id" });

export const parseFilters = (hash: string): IncidentFilters => {
  const query = new URLSearchParams(hash.replace(/^#\/?/, "").split("?")[1] ?? "");
  const priority = query.get("priority") ?? "";
  const sla = query.get("sla") ?? "";
  const sort = query.get("sort") ?? "";
  return {
    q: query.get("q") ?? "",
    priority: PRIORITIES.includes(priority as Priority) ? (priority as Priority) : "",
    sla: SLA_PHASES.includes(sla as SlaPhase) ? (sla as SlaPhase) : "",
    node: query.get("node") ?? "",
    sort: SORTS.includes(sort as IncidentSort) ? (sort as IncidentSort) : "id",
  };
};

/** Ссылка на список с фильтрами и датой: параметры переживают перезагрузку. */
export const filtersHash = (filters: IncidentFilters, day: string): string => {
  const params = new URLSearchParams();
  if (filters.q !== "") params.set("q", filters.q);
  if (filters.priority !== "") params.set("priority", filters.priority);
  if (filters.sla !== "") params.set("sla", filters.sla);
  if (filters.node !== "") params.set("node", filters.node);
  if (filters.sort !== "id") params.set("sort", filters.sort);
  params.set("at", day);
  return "#incidents?" + params.toString();
};

const matches = (incident: Incident, situation: string, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = [incident.id, incident.title, incident.address, incident.reporter, situation].join(" ").toLowerCase();
  return haystack.includes(needle);
};

/** Строки реестра на выбранный день: все поля берутся из модели. */
export const buildRows = (
  graph: Graph,
  incidents: readonly Incident[],
  day: string,
  filters: IncidentFilters,
): readonly IncidentRow[] => {
  const rows = visibleAt(incidents, day)
    .map((incident) => {
      const asOf = incidentAt(incident, day);
      const situation = situationById(incident.situationId)?.title ?? "";
      const last = historyUpTo(incident, day).at(-1)?.at ?? incident.createdAt ?? day + "T00:00:00.000Z";
      const sla = slaStateAt(incident, day);
      return {
        id: incident.id,
        title: incident.title,
        situation,
        priority: incident.priority,
        nodeId: asOf.nodeId,
        nodeTitle: graph.byId[asOf.nodeId]?.title ?? "",
        phase: slaPhaseOnDay(incident, day),
        lastEvent: last,
        dueDay: sla.dueAt > 0 ? dayOf(addHours("2025-12-20T09:00:00.000Z", sla.dueAt)) : "",
      };
    })
    .filter((row) => matches(incidents.find((i) => i.id === row.id) as Incident, row.situation, filters.q))
    .filter((row) => filters.priority === "" || row.priority === filters.priority)
    .filter((row) => filters.sla === "" || row.phase === filters.sla)
    .filter((row) => filters.node === "" || row.nodeId === filters.node);

  const sorted = [...rows];
  if (filters.sort === "priority") {
    sorted.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id, "ru", { numeric: true }));
  } else if (filters.sort === "date") {
    sorted.sort((a, b) => b.lastEvent.localeCompare(a.lastEvent) || a.id.localeCompare(b.id, "ru", { numeric: true }));
  } else if (filters.sort === "urgency") {
    sorted.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.dueDay.localeCompare(b.dueDay));
  } else {
    sorted.sort((a, b) => a.id.localeCompare(b.id, "ru", { numeric: true }));
  }
  return sorted;
};
