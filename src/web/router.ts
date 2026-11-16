import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { mountChat } from "./chat-view.ts";
import { mountModel } from "./model-view.ts";
import { mountTimeline } from "./timeline-view.ts";

export type RouteName = "model" | "timeline" | "chat";
export type ViewMode = "git" | "gantt";

export interface Route {
  readonly name: RouteName;
  readonly incidentId: string;
  readonly at: string;
  readonly view: ViewMode;
}

/** Разбор адреса: #chat/З-015?at=2026-01-02 → маршрут чата с заявкой и датой. */
export const parseRoute = (hash: string): Route => {
  const value = hash.replace(/^#\/?/, "");
  const path = value.split("?")[0] ?? "";
  const query = new URLSearchParams(value.split("?")[1] ?? "");
  const at = query.get("at") ?? "";
  const view: ViewMode = query.get("view") === "gantt" ? "gantt" : "git";
  if (path.startsWith("chat")) {
    const incidentId = decodeURIComponent(path.slice(4).replace(/^\//, ""));
    return { name: "chat", incidentId, at, view };
  }
  if (path.startsWith("timeline")) return { name: "timeline", incidentId: "", at, view };
  return { name: "model", incidentId: "", at, view };
};

export const hrefTimeline = (at: string, view: ViewMode = "git"): string =>
  "#timeline?at=" + encodeURIComponent(at) + "&view=" + view;

export const hrefChat = (incidentId: string, at: string): string =>
  "#chat/" + encodeURIComponent(incidentId) + "?at=" + encodeURIComponent(at);

export const renderNav = (route: Route): string => {
  const items: readonly (readonly [RouteName, string, string])[] = [
    ["model", "#", "Модель процессов"],
    ["timeline", hrefTimeline(""), "Хронология · Git-граф"],
    ["chat", hrefChat(HERO_INCIDENT_ID, ""), "Мобильный чат"],
  ];
  return items
    .map(
      ([id, href, title]) =>
        '<a class="nav-link' + (id === route.name ? " on" : "") + '" href="' + href + '" data-route="' + id + '">' +
        title + "</a>",
    )
    .join("");
};

/** Роутер по хэшу: контейнер #app каждый раз создаётся заново, обработчики не накапливаются. */
export const mountRouter = (graph: Graph, story: Story): void => {
  const shell = document.querySelector("#shell");
  if (!shell) return;
  const apply = (): void => {
    const route = parseRoute(location.hash);
    const fresh = document.createElement("div");
    fresh.id = "app";
    const old = document.querySelector("#app");
    if (old) old.replaceWith(fresh);
    else shell.appendChild(fresh);
    const nav = document.querySelector("#nav");
    if (nav) nav.innerHTML = renderNav(route);
    if (route.name === "timeline") mountTimeline(fresh, graph, story, route);
    else if (route.name === "chat") mountChat(fresh, graph, story, route);
    else mountModel(fresh, graph);
  };
  window.addEventListener("hashchange", apply);
  apply();
};
