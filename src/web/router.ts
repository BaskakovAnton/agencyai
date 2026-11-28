import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { OrgRepository } from "../core/org/repository.ts";
import { isPeriodLength, type PeriodLength } from "../core/periods.ts";
import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { mountChat } from "./chat-view.ts";
import { mountDashboard } from "./dashboard-view.ts";
import { mountIncident } from "./incident-view.ts";
import { mountIncidents } from "./incidents-view.ts";
import { mountModel } from "./model-view.ts";
import { bindShell, initTheme, renderShell } from "./shell.ts";
import { mountTimeline } from "./timeline-view.ts";

export type RouteName = "dashboard" | "incidents" | "incident" | "timeline" | "chat" | "model";
export type ViewMode = "gantt";

export interface Route {
  readonly name: RouteName;
  readonly incidentId: string;
  readonly at: string;
  readonly view: ViewMode;
  /** Длина периода обзора (UX-3): 7 или 30 дней. */
  readonly period: PeriodLength;
}

/** Разбор адреса: стартовый экран — обзор, модель живёт по явному #model. */
export const parseRoute = (hash: string): Route => {
  const value = hash.replace(/^#\/?/, "");
  const path = value.split("?")[0] ?? "";
  const query = new URLSearchParams(value.split("?")[1] ?? "");
  const at = query.get("at") ?? "";
  const periodValue = Number(query.get("period") ?? "7");
  const period: PeriodLength = isPeriodLength(periodValue) ? periodValue : 7;
  // Git-граф удалён: единственный вид — диаграмма Ганта, старые ссылки view=git ведут на неё.
  const view: ViewMode = "gantt";
  if (path.startsWith("chat")) {
    return { name: "chat", incidentId: decodeURIComponent(path.slice(4).replace(/^\//, "")), at, view, period };
  }
  if (path.startsWith("timeline")) return { name: "timeline", incidentId: "", at, view, period };
  if (path.startsWith("incident/")) {
    return { name: "incident", incidentId: decodeURIComponent(path.slice("incident/".length)), at, view, period };
  }
  if (path === "incidents") return { name: "incidents", incidentId: "", at, view, period };
  if (path === "model") return { name: "model", incidentId: "", at, view, period };
  return { name: "dashboard", incidentId: "", at, view, period };
};

export const hrefDashboard = (at = "", period?: PeriodLength): string => {
  const query = new URLSearchParams();
  if (at !== "") query.set("at", at);
  if (period !== undefined && period !== 7) query.set("period", String(period));
  const suffix = query.toString();
  return suffix === "" ? "#dashboard" : "#dashboard?" + suffix;
};
export const hrefIncidents = (at = ""): string => (at === "" ? "#incidents" : "#incidents?at=" + encodeURIComponent(at));
export const hrefIncident = (id: string, at: string): string =>
  "#incident/" + encodeURIComponent(id) + "?at=" + encodeURIComponent(at);
export const hrefTimeline = (at: string, view: ViewMode = "gantt"): string =>
  "#timeline?at=" + encodeURIComponent(at) + "&view=" + view;
export const hrefChat = (incidentId: string, at: string): string =>
  "#chat/" + encodeURIComponent(incidentId) + "?at=" + encodeURIComponent(at);

const pageMeta = (route: Route): { readonly title: string; readonly subtitle: string } => {
  if (route.name === "dashboard") return { title: "Обзор", subtitle: "Сводка на выбранную дату: KPI, внимание, подразделения и сроки" };
  if (route.name === "incidents") return { title: "Обращения", subtitle: "Реестр демонстрационных заявок с фильтрами и поиском" };
  if (route.name === "incident") return { title: "Обращение " + (route.incidentId === "" ? "—" : route.incidentId), subtitle: "Контекст заявки, SLA, участники и подтверждение завершения" };
  if (route.name === "timeline") return { title: "Хронология", subtitle: "Git-граф и диаграмма Ганта на выбранную дату" };
  if (route.name === "chat") return { title: "Переписка", subtitle: "Сценарный просмотр сообщений, только чтение" };
  return { title: "Модель процесса", subtitle: "30 узлов, роли, права и SLA" };
};

/** Роутер по хэшу: оболочка перерисовывается, экран монтируется в слот #view. */
export const mountRouter = (graph: Graph, story: Story, org?: OrgRepository): void => {
  const shell = document.querySelector("#shell");
  if (!shell) return;
  initTheme();
  const apply = (): void => {
    const route = parseRoute(location.hash);
    const meta = pageMeta(route);
    shell.innerHTML = renderShell({ route, title: meta.title, subtitle: meta.subtitle, content: "" });
    bindShell(shell);
    const view = shell.querySelector("#view") as HTMLElement | null;
    if (!view) return;
    if (route.name === "timeline") mountTimeline(view, graph, story, route);
    else if (route.name === "chat") mountChat(view, graph, story, route);
    else if (route.name === "model") mountModel(view, graph);
    else if (route.name === "dashboard") mountDashboard(view, graph, story, route, org); // период берётся из route.period
    else if (route.name === "incidents") mountIncidents(view, graph, story, route, org);
    else mountIncident(view, graph, story, route, { org });
  };
  window.addEventListener("hashchange", apply);
  apply();
};

export { HERO_INCIDENT_ID };
