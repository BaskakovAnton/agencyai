/** UX-3.2.0: проверка выделенного состояния хронологии (поведение не менялось). */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { HERO_INCIDENT_ID } from "../src/data/hero.ts";
import { activeFilter, chatIncidentOf, clearFilter, initialTimelineState, setDensity, timelineDayFrom, toggleIncidentFilter } from "../src/web/timeline-state.ts";
import type { Route } from "../src/web/router.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const route = (at: string, view: "gantt" = "gantt"): Route => ({ name: "timeline", incidentId: "", at, view, period: 7 });

test("день среза: известный берётся из адреса, пустой — последний доступный (UX-3.2.2)", () => {
  expect(timelineDayFrom(route(""), days)).toBe(days.at(-1)!);
  expect(timelineDayFrom(route(days[0]!), days)).toBe(days[0]!);
  // Дата вне окна больше не подменяется: её обрабатывает состояние «вне окна модели» в представлении.
  expect(timelineDayFrom(route("2020-01-01"), days)).toBe("2020-01-01");
});

test("начальное состояние повторяет прежние значения по умолчанию", () => {
  const state = initialTimelineState(route(""), days);
  expect(state).toEqual({ day: days.at(-1)!, view: "gantt", filter: "", override: null, density: "normal", graphMode: false });
  expect(initialTimelineState(route(days[2]!, "gantt"), days).view).toBe("gantt");
});

test("фильтр заявки: повторный выбор снимает, значение по умолчанию сохраняется", () => {
  const state = initialTimelineState(route(""), days);
  expect(activeFilter(state)).toBe("");
  toggleIncidentFilter(state, "З-015");
  expect(state.override).toBe("З-015");
  expect(activeFilter(state)).toBe("З-015");
  toggleIncidentFilter(state, "З-015");
  expect(state.override).toBeNull();
  state.filter = "З-001";
  expect(activeFilter(state)).toBe("З-001");
  clearFilter(state);
  expect(state).toMatchObject({ override: null, filter: "" });
});

test("плотность переключается только в compact, иначе normal", () => {
  const state = initialTimelineState(route(""), days);
  setDensity(state, "compact");
  expect(state.density).toBe("compact");
  setDensity(state, "normal");
  expect(state.density).toBe("normal");
  setDensity(state, undefined);
  expect(state.density).toBe("normal");
});

test("заявка для панели чата: ручной выбор, иначе герой демонстрации", () => {
  const state = initialTimelineState(route(""), days);
  expect(chatIncidentOf(state, story).id).toBe(HERO_INCIDENT_ID);
  toggleIncidentFilter(state, "З-001");
  expect(chatIncidentOf(state, story).id).toBe("З-001");
});
