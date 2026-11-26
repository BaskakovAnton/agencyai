import type { Story } from "../core/story.ts";
import type { OrgRepository } from "../core/org/repository.ts";
import type { Graph } from "../types.ts";
import { renderDashboard } from "./dashboard-html.ts";
import { buildOverview } from "./overview.ts";
import { isHistoricalDay } from "./historical.ts";
import { nearestDay as nearestDayOf, renderOutsideWindow, resolveDay } from "./day-window.ts";
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
  const period = route.period;
  const resolved = resolveDay(route.at, days);
  if (resolved.availability === "outside") {
    // Дата вне окна модели: единое состояние вместо данных на несуществующую дату.
    root.innerHTML = renderOutsideWindow(route.at, days, hrefDashboard(nearestDayOf(route.at, days), period));
    return;
  }
  const day = resolved.day;
  root.innerHTML = renderDashboard({
    overview: buildOverview(graph, story.incidents, day, org, period),
    days,
    day,
    historical: isHistoricalDay(day, days),
  });
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