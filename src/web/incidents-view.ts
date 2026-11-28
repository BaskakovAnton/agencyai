import type { Story } from "../core/story.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import { isHistoricalDay } from "./historical.ts";
import { nearestDay, renderOutsideWindow, resolveDay } from "./day-window.ts";
import { hrefIncidents } from "./router.ts";
import type { Graph } from "../types.ts";
import { renderIncidents, renderIncidentsLive } from "./incidents-html.ts";
import { filtersWithout, type ChipKey } from "./incidents-chips.ts";
import { buildRows, defaultFilters, filtersHash, parseFilters, type IncidentFilters } from "./incidents.ts";
import type { Route } from "./router.ts";

/** Экран «Обращения»: фильтры живут в адресе, таблица перерисовывается без потери фокуса поиска. */
export const mountIncidents = (root: HTMLElement, graph: Graph, story: Story, route: Route, org?: OrgQuery): void => {
  const days = story.days;
  const resolved = resolveDay(route.at, days);
  if (resolved.availability === "outside") {
    root.innerHTML = renderOutsideWindow(route.at, days, hrefIncidents(nearestDay(route.at, days)));
    return;
  }
  let day = resolved.day;
  let filters = parseFilters(location.hash);
  const nodes = graph.order.map((id) => ({ id, title: graph.byId[id]?.title ?? id }));
  const rows = () => buildRows(graph, story.incidents, day, filters, org);
  const value = (target: HTMLElement): string => (target as HTMLSelectElement | HTMLInputElement).value;
  const live = () => ({
    rows: rows(),
    days,
    day,
    filters,
    nodes,
    departments: org?.directory.departments ?? [],
    historical: isHistoricalDay(day, days),
  });

  const paint = (): void => {
    root.innerHTML = renderIncidents(live());
  };

  /** Приводит контролы к текущему состоянию фильтров (пос��е снятия чипа или сброса). */
  const syncControls = (): void => {
    const set = (selector: string, next: string): void => {
      const element = root.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
      if (element) element.value = next;
    };
    set("[data-search]", filters.q);
    set("[data-filter-view]", filters.view);
    set("[data-filter-department]", filters.department);
    set("[data-filter-priority]", filters.priority);
    set("[data-filter-sla]", filters.sla);
    set("[data-filter-node]", filters.node);
  };
  /**
   * Перерисовка тела и синхронизация адреса. Дискретные изменения (фильтры, дата) пишутся
   * в историю браузера (push), чтобы работали back/forward; ввод поиска — replace,
   * иначе каждое нажатие клавиши создавало бы запись истории.
   */
  const paintBody = (push = false): void => {
    const region = root.querySelector("[data-incidents-live]");
    const state = live();
    if (region) region.outerHTML = renderIncidentsLive(state);
    const count = root.querySelector("[data-incidents-count]");
    if (count) count.textContent = "Найдено: " + state.rows.length;
    const next = filtersHash(filters, day);
    if (push && location.hash !== next) history.pushState(null, "", next);
    else history.replaceState(null, "", next);
  };

  paint();
  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-filters-toggle]")) return;
    const more = root.querySelector("[data-filters-more]");
    const toggle = root.querySelector<HTMLElement>("[data-filters-toggle]");
    if (!more || !toggle) return;
    const open = more.getAttribute("data-open") !== "true";
    more.setAttribute("data-open", String(open));
    toggle.setAttribute("aria-expanded", String(open));
  });

  root.addEventListener("input", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.matches("[data-search]")) {
      filters = { ...filters, q: value(target) };
      paintBody();
    }
  });
  root.addEventListener("change", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    let discrete = true;
    if (target.matches("[data-filter-priority]")) filters = { ...filters, priority: value(target) as IncidentFilters["priority"] };
    else if (target.matches("[data-filter-sla]")) filters = { ...filters, sla: value(target) as IncidentFilters["sla"] };
    else if (target.matches("[data-filter-node]")) filters = { ...filters, node: value(target) };
    else if (target.matches("[data-filter-view]")) filters = { ...filters, view: value(target) as IncidentFilters["view"] };
    else if (target.matches("[data-filter-department]")) filters = { ...filters, department: value(target) };
    else if (target.matches("[data-sort]")) filters = { ...filters, sort: value(target) as IncidentFilters["sort"] };
    else if (target.matches("[data-day-select]")) {
      day = value(target);
      // Смена дня меняет и индикатор исторического режима: перерисовываем экран целиком.
      paint();
      paintBody(true);
      return;
    } else { discrete = false; return; }
    paintBody(discrete);
  });
  root.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (target?.closest("[data-reset]") !== null && target?.closest("[data-reset]") !== undefined) {
      // Полный сброс пользовательских фильтров: дата среза (at) сохраняется.
      filters = defaultFilters();
      paint();
      syncControls();
      paintBody(true);
      return;
    }
    const chip = target?.closest<HTMLElement>("[data-filter-clear]");
    const key = chip?.dataset.filterClear as ChipKey | undefined;
    if (key === undefined) return;
    if (key === "at") {
      day = days.at(-1) ?? day;
      paint();
      syncControls();
      paintBody(true);
      return;
    }
    filters = filtersWithout(filters, key);
    syncControls();
    paintBody(true);
  });
};