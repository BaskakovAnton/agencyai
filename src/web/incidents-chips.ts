/**
 * Панель активных фильтров реестра (UX-3.2.4, блок C): показывает только непустые
 * параметры состояния и даёт снять каждый из них по отдельности.
 * Источник состояния — тот же IncidentFilters, второй модели не создаётся.
 */
import { SLA_LEGEND_TITLES } from "../core/sla-at.ts";
import { formatDay } from "../core/timeline.ts";
import { PRIORITY_TITLES } from "../data/roles.ts";
import { esc, renderActiveFilterChip } from "./components.ts";
import type { IncidentFilters, IncidentViewFilter } from "./incidents.ts";

export type ChipKey = "view" | "department" | "q" | "priority" | "sla" | "node" | "at";

export interface FilterChip {
  readonly key: ChipKey;
  /** Человекочитаемое значение: идентификаторы заменяются названиями из модели. */
  readonly text: string;
  readonly label: string;
}

const VIEW_TITLES: Readonly<Record<IncidentViewFilter, string>> = {
  all: "все",
  active: "активные",
  attention: "требуют внимания",
  overdue: "просроченные (активные)",
  paused: "на паузе",
  review: "ждут подтверждения",
  unassigned: "без ответственного",
};

/**
 * Чипы текущего состояния. Дата показывается только когда она выбрана явно,
 * то есть отличается от последнего доступного дня (иначе чип был бы постоянным).
 */
export const filterChips = (
  filters: IncidentFilters,
  day: string,
  days: readonly string[],
  departmentName: (departmentId: string) => string,
): readonly FilterChip[] => {
  const chips: FilterChip[] = [];
  if (filters.view !== "all") chips.push({ key: "view", text: VIEW_TITLES[filters.view], label: "Представление" });
  if (filters.department !== "") {
    const name = filters.department === "none" ? "без ответственного" : departmentName(filters.department);
    chips.push({ key: "department", text: name === "" ? filters.department : name, label: "Подразделение" });
  }
  if (filters.q !== "") chips.push({ key: "q", text: filters.q, label: "Поиск" });
  if (filters.priority !== "") chips.push({ key: "priority", text: PRIORITY_TITLES[filters.priority], label: "Приоритет" });
  if (filters.sla !== "") chips.push({ key: "sla", text: SLA_LEGEND_TITLES[filters.sla], label: "SLA" });
  if (filters.node !== "") chips.push({ key: "node", text: filters.node, label: "Узел" });
  const lastDay = days.at(-1) ?? "";
  if (day !== "" && lastDay !== "" && day !== lastDay) chips.push({ key: "at", text: formatDay(day), label: "Дата среза" });
  return chips;
};

/** Разметка панели чипов; пустой список — пустая строка (панель скрыта). */
export const renderFilterChips = (chips: readonly FilterChip[]): string => {
  if (chips.length === 0) return "";
  return (
    '<div class="incident-chips" data-filter-chips role="group" aria-label="Активные фильтры">' +
    chips.map((chip) => renderActiveFilterChip(chip)).join("") +
    "</div>"
  );
};

/** Фильтры без указанного параметра (снятие одного чипа не трогает остальные). */
export const filtersWithout = (filters: IncidentFilters, key: ChipKey): IncidentFilters => {
  if (key === "view") return { ...filters, view: "all" };
  if (key === "department") return { ...filters, department: "" };
  if (key === "q") return { ...filters, q: "" };
  if (key === "priority") return { ...filters, priority: "" };
  if (key === "sla") return { ...filters, sla: "" };
  if (key === "node") return { ...filters, node: "" };
  return filters;
};
