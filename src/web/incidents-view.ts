import type { Story } from "../core/story.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import { isHistoricalDay } from "./historical.ts";
import { nearestDay, renderOutsideWindow, resolveDay } from "./day-window.ts";
import { hrefIncidents } from "./router.ts";
import type { Graph } from "../types.ts";
import { renderIncidents, renderIncidentsBody } from "./incidents-html.ts";
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

  const paint = (): void => {
    root.innerHTML = renderIncidents({
      rows: rows(),
      days,
      day,
      filters,
      nodes,
      historical: isHistoricalDay(day, days),
    });
  };
  /**
   * Перерисовка тела и синхронизация адреса. Дискретные изменения (фильтры, дата) пишутся
   * в историю браузера (push), чтобы работали back/forward; ввод поиска — replace,
   * иначе каждое нажатие клавиши создавало бы запись истории.
   */
  const paintBody = (push = false): void => {
    const body = root.querySelector("[data-incidents-body]");
    if (body) body.outerHTML = '<div data-incidents-body>' + renderIncidentsBody(rows(), filters, day) + "</div>";
    const next = filtersHash(filters, day);
    if (push && location.hash !== next) history.pushState(null, "", next);
    else history.replaceState(null, "", next);
  };

  paint();
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
    else if (target.matches("[data-filter-review]")) filters = { ...filters, view: value(target) === "pending" ? "review" : "all" };
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
    const reset = (event.target as Element | null)?.closest("[data-reset]");
    if (!reset) return;
    filters = defaultFilters();
    paint();
    paintBody(true);
  });
};