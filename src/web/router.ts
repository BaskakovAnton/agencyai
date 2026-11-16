import type { Graph, Incident } from "../types.ts";
import { mountChat } from "./chat-view.ts";
import { mountDashboard } from "./dashboard.ts";
import { mountModel } from "./model-view.ts";

export type Route = "model" | "dashboard" | "chat";

const NAV: readonly (readonly [Route, string, string])[] = [
  ["model", "#", "Модель процессов"],
  ["dashboard", "#dashboard", "Дашборд когорт"],
  ["chat", "#chat", "Переписка по ролям"],
];

/** Значение после # без query-хвоста: #dashboard?x=1 → dashboard. */
export const routeFromHash = (hash: string): Route => {
  const value = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  if (value === "dashboard") return "dashboard";
  if (value === "chat") return "chat";
  return "model";
};

export const renderNav = (route: Route): string =>
  NAV.map(
    ([id, href, title]) =>
      '<a class="nav-link' + (id === route ? " on" : "") + '" href="' + href + '" data-route="' + id + '">' + title + "</a>",
  ).join("");

/**
 * Роутер по хэшу. Контейнер #app каждый раз создаётся заново — так не накапливаются
 * обработчики от предыдущего экрана.
 */
export const mountRouter = (graph: Graph, incidents: readonly Incident[]): void => {
  const shell = document.querySelector("#shell");
  if (!shell) return;
  const apply = (): void => {
    const route = routeFromHash(location.hash);
    const fresh = document.createElement("div");
    fresh.id = "app";
    const old = document.querySelector("#app");
    if (old) old.replaceWith(fresh);
    else shell.appendChild(fresh);
    const nav = document.querySelector("#nav");
    if (nav) nav.innerHTML = renderNav(route);
    if (route === "dashboard") mountDashboard(fresh, graph, incidents);
    else if (route === "chat") mountChat(fresh, graph, incidents);
    else mountModel(fresh, graph);
  };
  window.addEventListener("hashchange", apply);
  apply();
};
