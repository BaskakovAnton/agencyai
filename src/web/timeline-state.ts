/** Состояние экрана хронологии: выделено из timeline-view.ts (лимит 200 строк). Поведение не менялось. */
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { Story } from "../core/story.ts";
import type { Route, ViewMode } from "./router.ts";

export interface TimelineState {
  day: string;
  view: ViewMode;
  filter: string;
  override: string | null;
  selectedId: string | null;
  density: "normal" | "compact";
}

/** День среза: выбранный в адресе, если он доступен, иначе последний доступный. */
export const timelineDayFrom = (route: Route, days: readonly string[]): string =>
  route.at !== "" && days.includes(route.at) ? route.at : days.at(-1) ?? "";

export const initialTimelineState = (route: Route, days: readonly string[]): TimelineState => ({
  day: timelineDayFrom(route, days),
  view: route.view,
  filter: "",
  override: null,
  selectedId: null,
  density: "normal",
});

/** Заявка для панели чата: выбранная в полосе, иначе герой демонстрации. */
export const chatIncidentOf = (state: TimelineState, story: Story) =>
  story.incidents.find((incident) => incident.id === (state.override ?? state.filter)) ??
  story.incidents.find((incident) => incident.id === HERO_INCIDENT_ID) ??
  (story.incidents[0] as (typeof story.incidents)[number]);

/** Активный фильтр заявки: ручной выбор перекрывает значение по умолчанию. */
export const activeFilter = (state: TimelineState): string => state.override ?? state.filter;

/** Переключение фильтра заявки: повторный выбор снимает фильтр. */
export const toggleIncidentFilter = (state: TimelineState, id: string): void => {
  state.override = state.override === id ? null : id;
};

export const setDensity = (state: TimelineState, value: string | undefined): void => {
  state.density = value === "compact" ? "compact" : "normal";
};

export const clearFilter = (state: TimelineState): void => {
  state.override = null;
  state.filter = "";
};
