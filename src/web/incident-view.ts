import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { renderIncident, renderIncidentMissing } from "./incident-html.ts";
import { buildIncidentView } from "./incident.ts";
import type { Route } from "./router.ts";

/** Экран карточки обращения: дата среза синхронизирована с адресом. */
export const mountIncident = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const days = story.days;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(route.at) ? route.at : days.at(-1) ?? "";
  const view = buildIncidentView(graph, story.incidents, route.incidentId, day);
  root.innerHTML = view === null ? renderIncidentMissing(route.incidentId, day, days) : renderIncident(view, day, days);
  root.addEventListener("change", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.matches("[data-day-select]")) {
      location.hash = "#incident/" + encodeURIComponent(route.incidentId) + "?at=" + encodeURIComponent((target as HTMLSelectElement).value);
    }
  });
};
