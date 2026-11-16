import type { Graph, Incident, Priority, RoleId } from "../types.ts";
import { roleAccess } from "./roles.ts";

/** Когорта = приоритет заявки: так группируются столбцы на дашборде. */
export type Cohort = Priority;

export interface NodeBucket {
  readonly nodeId: string;
  readonly title: string;
  readonly total: number;
  readonly byCohort: Readonly<Record<Cohort, number>>;
  readonly incidentIds: readonly string[];
}

export const COHORTS: readonly Cohort[] = ["urgent", "normal", "routine", "none"];

export const COHORT_TITLES: Readonly<Record<Cohort, string>> = {
  urgent: "Авария / экстренно",
  normal: "Неотложное",
  routine: "Обычное / сезонное",
  none: "Вне SLA",
};

export const COHORT_COLORS: Readonly<Record<Cohort, string>> = {
  urgent: "#ff5c5c",
  normal: "#ffc14d",
  routine: "#6fd28a",
  none: "#7c8794",
};

const COHORT_WORDS: Readonly<Record<Cohort, readonly [string, string, string]>> = {
  urgent: ["аварийная", "аварийные", "аварийных"],
  normal: ["неотложная", "неотложные", "неотложных"],
  routine: ["обычная", "обычные", "обычных"],
  none: ["вне SLA", "вне SLA", "вне SLA"],
};

/** Русские формы числительных: 1 заявка, 3 заявки, 5 заявок, 11 заявок, 22 заявки. */
export const pluralize = (count: number, one: string, few: string, many: string): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export const emptyCohorts = (): Record<Cohort, number> => ({ urgent: 0, normal: 0, routine: 0, none: 0 });

/** Когортная раскладка по всем 30 узлам (включая пустые — график держит ось X целиком). */
export const cohortsByNode = (graph: Graph, incidents: readonly Incident[]): readonly NodeBucket[] =>
  graph.order.map((nodeId) => {
    const own = incidents.filter((incident) => incident.nodeId === nodeId);
    const byCohort = emptyCohorts();
    own.forEach((incident) => {
      byCohort[incident.priority] += 1;
    });
    return {
      nodeId,
      title: graph.byId[nodeId]?.title ?? "",
      total: own.length,
      byCohort,
      incidentIds: own.map((incident) => incident.id),
    };
  });

/** Текст тултипа по макету: «Узел U7 · Передача подрядчику: 3 заявки (1 аварийная, 1 неотложная, 1 обычная)». */
export const tooltipFor = (bucket: NodeBucket): string => {
  const parts = COHORTS.filter((cohort) => bucket.byCohort[cohort] > 0).map((cohort) => {
    const count = bucket.byCohort[cohort];
    return count + " " + pluralize(count, ...COHORT_WORDS[cohort]);
  });
  const tail = parts.length > 0 ? " (" + parts.join(", ") + ")" : "";
  const word = pluralize(bucket.total, "заявка", "заявки", "заявок");
  return "Узел " + bucket.nodeId + " · " + bucket.title + ": " + bucket.total + " " + word + tail;
};

export interface DashboardFilters {
  readonly cohort: Cohort | "all";
  readonly nodeId: string;
  readonly role: RoleId | "any";
}

export const defaultFilters = (): DashboardFilters => ({ cohort: "all", nodeId: "", role: "any" });

/** Фильтр по когорте, узлу и роли (роль допускается к заявке, если может действовать на её узле). */
export const applyFilters = (
  graph: Graph,
  incidents: readonly Incident[],
  filters: DashboardFilters,
): readonly Incident[] =>
  incidents.filter((incident) => {
    if (filters.cohort !== "all" && incident.priority !== filters.cohort) return false;
    if (filters.nodeId !== "" && incident.nodeId !== filters.nodeId) return false;
    if (filters.role !== "any" && !roleAccess(graph, incident.nodeId, filters.role).allowed) return false;
    return true;
  });
