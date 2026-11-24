import type { Story } from "../core/story.ts";
import type { OrgRepository } from "../core/org/repository.ts";
import type { Graph } from "../types.ts";
import { renderDashboard } from "./dashboard-html.ts";
import { buildOverview } from "./overview.ts";
import { hrefDashboard, type Route } from "./router.ts";

/** Экран «Обзор»: сводка на выбранную дату, дата синхронизирована с адресом. */
export const mountDashboard = (
  root: HTMLElement,
  graph: Graph,
  story: Story,
  route: Route,
  org?: OrgRepository,
): void => {
  const days = story.days;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(route.at) ? route.at : days.at(-1) ?? "";
  const period = route.period;
  root.innerHTML = renderDashboard({ overview: buildOverview(graph, story.incidents, day, org, period), days, day });
  root.addEventListener("click", (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>("[data-period]");
    if (!button) return;
    const value = Number(button.dataset.period ?? "7");
    const next = value === 30 ? 30 : 7;
    location.hash = hrefDashboard(day, next).replace(/^#/, "#");
  });
  root.addEventListener("change", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.matches("[data-day-select]")) {
      location.hash = "#dashboard?at=" + encodeURIComponent((target as HTMLSelectElement).value);
    }
  });
};