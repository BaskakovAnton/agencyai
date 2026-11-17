import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { renderDashboard } from "./dashboard-html.ts";
import { buildOverview } from "./overview.ts";
import type { Route } from "./router.ts";

/** Экран «Обзор»: сводка на выбранную дату, дата синхронизирована с адресом. */
export const mountDashboard = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const days = story.days;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(route.at) ? route.at : days.at(-1) ?? "";
  root.innerHTML = renderDashboard({ overview: buildOverview(graph, story.incidents, day), days, day });
  root.addEventListener("change", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.matches("[data-day-select]")) {
      location.hash = "#dashboard?at=" + encodeURIComponent((target as HTMLSelectElement).value);
    }
  });
};
