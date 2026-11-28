/**
 * Контекстные пустые состояния реестра (UX-3.2.4, блок D): причина определяется по
 * фактическому состоянию фильтров и результату построения списка, а не по наличию параметра.
 */
import { renderEmptyStateRich } from "./components.ts";
import type { ChipKey } from "./incidents-chips.ts";
import type { IncidentFilters } from "./incidents.ts";

export type EmptyReason = "no-data" | "combination" | "department" | "unassigned" | "view" | "search";

export interface EmptyIncidentsState {
  readonly reason: EmptyReason;
  readonly title: string;
  readonly note: string;
  /** Действие: снять один фильтр или сбросить пользовательские фильтры. */
  readonly action?: { readonly label: string; readonly clear?: ChipKey };
}

/** Активные пользовательские фильтры в порядке интерфейса. */
const activeFilters = (filters: IncidentFilters): readonly ChipKey[] => {
  const keys: ChipKey[] = [];
  if (filters.view !== "all") keys.push("view");
  if (filters.department !== "") keys.push("department");
  if (filters.q !== "") keys.push("q");
  if (filters.priority !== "") keys.push("priority");
  if (filters.sla !== "") keys.push("sla");
  if (filters.node !== "") keys.push("node");
  return keys;
};

const TITLES: Readonly<Record<EmptyReason, readonly [string, string]>> = {
  "no-data": ["На эту дату обращений нет", "В выбранный день в модели нет обращений."],
  combination: ["Под эти условия ничего не подходит", "Активны несколько фильтров сразу."],
  department: ["В этом подразделении обращений нет", "На выбранную дату у подразделения нет обращений."],
  unassigned: ["Обращений без ответственного нет", "У всех обращений на эту дату есть активный ответственный."],
  view: ["В этом представлении пусто", "Ни одно обращение не подходит под выбранное представление."],
  search: ["По запросу ничего не найдено", "Проверьте формулировку или очистите поиск."],
};

const GLYPHS: Readonly<Record<EmptyReason, string>> = {
  "no-data": "∅",
  combination: "⚙",
  department: "⌂",
  unassigned: "⚑",
  view: "◫",
  search: "⌕",
};

const ACTION_LABELS: Readonly<Record<ChipKey, string>> = {
  view: "Снять фильтр представления",
  department: "Снять фильтр подразделения",
  q: "Очистить поиск",
  priority: "Снять фильтр приоритета",
  sla: "Снять фильтр SLA",
  node: "Снять фильтр узла",
  at: "Вернуть последнюю дату",
};

/** Причина пустого результата: приоритет как в спецификации UX-3.2.4 (раздел 16). */
export const emptyReasonFor = (filters: IncidentFilters, rowsCount: number): EmptyReason | null => {
  if (rowsCount > 0) return null;
  const keys = activeFilters(filters);
  if (keys.length === 0) return "no-data";
  if (keys.length > 1) return "combination";
  if (filters.department === "none") return "unassigned";
  if (filters.department !== "") return "department";
  if (filters.view !== "all") return "view";
  return "search";
};

/** Состояние пустого результата с текстом и одним целевым действием. */
export const emptyStateFor = (filters: IncidentFilters, rowsCount: number): EmptyIncidentsState | null => {
  const reason = emptyReasonFor(filters, rowsCount);
  if (reason === null) return null;
  const [title, note] = TITLES[reason];
  if (reason === "combination") return { reason, title, note, action: { label: "Сбросить фильтры" } };
  if (reason === "no-data") return { reason, title, note };
  const key = activeFilters(filters)[0]!;
  return { reason, title, note, action: { label: ACTION_LABELS[key], clear: key } };
};

/** Разметка пустого состояния; действие снимает только нужный фильтр. */
export const renderEmptyIncidents = (state: EmptyIncidentsState): string =>
  '<div data-incidents-empty="' + state.reason + '">' +
  renderEmptyStateRich({ title: state.title, note: state.note, glyph: GLYPHS[state.reason] }) +
  (state.action === undefined
    ? ""
    : '<p class="hint">' +
      (state.action.clear === undefined
        ? '<button type="button" data-reset>' + state.action.label + "</button>"
        : '<button type="button" data-filter-clear="' + state.action.clear + '">' + state.action.label + "</button>") +
      "</p>") +
  "</div>";
