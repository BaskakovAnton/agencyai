import { priorityRank } from "../core/incident.ts";
import { needsAttention } from "../core/sla-attention.ts";
import { lifecycleStatusOn } from "../core/analytics/snapshot.ts";
import { slaPhaseOnDay, SLA_PHASES, type SlaPhase } from "../core/sla-at.ts";
import { slaStateAt } from "../core/sla-at.ts";
import { addHours, dayOf, historyUpTo, incidentAt, visibleAt } from "../core/timeline.ts";
import { dayShift } from "../core/periods.ts";
import { NODE_MESSAGES } from "../data/messages.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { situationById } from "../data/situations.ts";
import { slaTextFor } from "./overview.ts";
import { incidentAssigneeName, incidentDepartmentName } from "./org-integration.ts";
import { departmentFilterActive, matchesDepartment, matchesView } from "./incidents-view-filter.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import type { Graph, Incident, Priority } from "../types.ts";

export type IncidentSort = "id" | "priority" | "date" | "urgency";

/** Представление списка: канонический параметр `view` (UX-3.2.1). */
export type IncidentViewFilter = "all" | "active" | "attention" | "overdue" | "paused" | "review" | "unassigned";

export interface IncidentFilters {
  readonly q: string;
  readonly priority: Priority | "";
  readonly sla: SlaPhase | "";
  readonly node: string;
  readonly sort: IncidentSort;
  /** Состояние-представление: одно значение, второй источник состояния не создаётся. */
  readonly view: IncidentViewFilter;
  /** Подразделение: `DEP-*`, `none` (без ответственного) или пусто (без фильтра). */
  readonly department: string;
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
  readonly roleTitle: string;
  /** Ответственное подразделение; пусто, если орг-модель не подключена. */
  readonly departmentName: string;
  /** Ответственный сотрудник; пусто, если данных нет. */
  readonly assigneeName: string;
  readonly slaText: string;
}

const PRIORITIES: readonly Priority[] = ["urgent", "normal", "routine", "none"];
const SORTS: readonly IncidentSort[] = ["id", "priority", "date", "urgency"];

const VIEWS: readonly IncidentViewFilter[] = ["all", "active", "attention", "overdue", "paused", "review", "unassigned"];

export const defaultFilters = (): IncidentFilters => ({ q: "", priority: "", sla: "", node: "", sort: "id", view: "all", department: "" });

/** Идентификатор подразделения: `DEP-*`, спецзначение `none`; прочее игнорируется. */
const DEPARTMENT_ID = /^(?:none|DEP-[A-Za-z0-9_-]+)$/;

/**
 * Разбор фильтров из адреса. Канонический параметр — `view`; legacy `review=pending`
 * читается как `view=review` (DEC-02) и в новые ссылки не пишется. Неизвестные значения
 * игнорируются, экран не ломается.
 */
export const parseFilters = (hash: string): IncidentFilters => {
  const query = new URLSearchParams(hash.replace(/^#\/?/, "").split("?")[1] ?? "");
  const priority = query.get("priority") ?? "";
  const sla = query.get("sla") ?? "";
  const sort = query.get("sort") ?? "";
  const department = query.get("department") ?? "";
  const rawView = query.get("view") ?? "";
  const view: IncidentViewFilter = VIEWS.includes(rawView as IncidentViewFilter)
    ? (rawView as IncidentViewFilter)
    : query.get("review") === "pending"
      ? "review"
      : "all";
  return {
    q: query.get("q") ?? "",
    priority: PRIORITIES.includes(priority as Priority) ? (priority as Priority) : "",
    sla: SLA_PHASES.includes(sla as SlaPhase) ? (sla as SlaPhase) : "",
    node: query.get("node") ?? "",
    sort: SORTS.includes(sort as IncidentSort) ? (sort as IncidentSort) : "id",
    view,
    department: DEPARTMENT_ID.test(department) ? department : "",
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
  if (filters.view !== "all") params.set("view", filters.view); // legacy review=pending не пишется (DEC-02)
  if (filters.department !== "") params.set("department", filters.department);
  params.set("at", day);
  return "#incidents?" + params.toString();
};

const roleOf = (nodeId: string): string => {
  const role = NODE_MESSAGES[nodeId]?.role;
  return role === undefined ? "" : ROLE_NAMES[role];
};

const matches = (incident: Incident, situation: string, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = [incident.id, incident.title, incident.address, incident.reporter, incident.channel ?? "", situation]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};

/** Обращения, у которых были события в периоде, заканчивающемся днём `day` (Flow, WP-5). */
export const eventsInPeriod = (incidents: readonly Incident[], day: string, length: number): readonly string[] => {
  const from = dayShift(day, -(Math.max(length, 1) - 1));
  return incidents
    .filter((incident) =>
      incident.history.some((move) => typeof move.at === "string" && move.at.slice(0, 10) >= from && move.at.slice(0, 10) <= day),
    )
    .map((incident) => incident.id);
};

/** Строки реестра на выбранный день: все поля берутся из модели. */
export const buildRows = (
  graph: Graph,
  incidents: readonly Incident[],
  day: string,
  filters: IncidentFilters,
  org?: OrgQuery,
): readonly IncidentRow[] => {
  const visible = visibleAt(incidents, day);
  const byId = new Map(visible.map((incident) => [incident.id, incident] as const));
  const byDepartment = departmentFilterActive(org, filters.department);
  const rows = visible
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
        roleTitle: roleOf(asOf.nodeId),
        departmentName: org === undefined ? "" : incidentDepartmentName(org, incident.id),
        assigneeName: org === undefined ? "" : incidentAssigneeName(org, incident.id),
        slaText: slaTextFor(incident, day),
      };
    })
    .filter((row) => matches(byId.get(row.id) as Incident, row.situation, filters.q))
    .filter((row) => filters.priority === "" || row.priority === filters.priority)
    .filter((row) => filters.sla === "" || row.phase === filters.sla)
    .filter((row) => filters.node === "" || row.nodeId === filters.node)
    .filter((row) => matchesView(filters.view, graph, org, byId.get(row.id) as Incident, day))
    .filter((row) => !byDepartment || matchesDepartment(org, row.id, filters.department));

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