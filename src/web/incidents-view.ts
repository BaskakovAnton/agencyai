import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { renderIncidents, renderIncidentsBody } from "./incidents-html.ts";
import { buildRows, defaultFilters, filtersHash, parseFilters, type IncidentFilters } from "./incidents.ts";
import type { Route } from "./router.ts";

/** Экран «Обращения»: фильтры живут в адресе, таблица перерисовывается без потери фокуса поиска. */
export const mountIncidents = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const days = story.days;
  let day = /^\d{4}-\d{2}-\d{2}$/.test(route.at) ? route.at : days.at(-1) ?? "";
  let filters = parseFilters(location.hash);
  const nodes = graph.order.map((id) => ({ id, title: graph.byId[id]?.title ?? id }));
  const rows = () => buildRows(graph, story.incidents, day, filters);
  const value = (target: HTMLElement): string => (target as HTMLSelectElement | HTMLInputElement).value;

  const paint = (): void => {
    root.innerHTML = renderIncidents({ rows: rows(), days, day, filters, nodes });
  };
  const paintBody = (): void => {
    const body = root.querySelector("[data-incidents-body]");
    if (body) body.outerHTML = '<div data-incidents-body>' + renderIncidentsBody(rows(), filters, day) + "</div>";
    history.replaceState(null, "", filtersHash(filters, day));
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
    if (target.matches("[data-filter-priority]")) filters = { ...filters, priority: value(target) as IncidentFilters["priority"] };
    else if (target.matches("[data-filter-sla]")) filters = { ...filters, sla: value(target) as IncidentFilters["sla"] };
    else if (target.matches("[data-filter-node]")) filters = { ...filters, node: value(target) };
    else if (target.matches("[data-sort]")) filters = { ...filters, sort: value(target) as IncidentFilters["sort"] };
    else if (target.matches("[data-day-select]")) day = value(target);
    else return;
    paintBody();
  });
  root.addEventListener("click", (event) => {
    const reset = (event.target as Element | null)?.closest("[data-reset]");
    if (!reset) return;
    filters = defaultFilters();
    paint();
    history.replaceState(null, "", filtersHash(filters, day));
  });
};
