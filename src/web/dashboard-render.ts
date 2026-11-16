import type { Graph, Incident } from "../types.ts";
import {
  COHORTS,
  COHORT_COLORS,
  COHORT_TITLES,
  applyFilters,
  cohortsByNode,
  tooltipFor,
  type Cohort,
  type DashboardFilters,
} from "../core/analytics.ts";
import { slaStatus } from "../core/sla.ts";
import { PRIORITY_TITLES, ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";

export const esc = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

const filtersPanel = (filters: DashboardFilters): string => {
  const roles = ["any", ...ROLE_IDS]
    .map((role) => {
      const label = role === "any" ? "Любая роль" : ROLE_NAMES[role as keyof typeof ROLE_NAMES];
      return '<option value="' + role + '"' + (filters.role === role ? " selected" : "") + ">" + label + "</option>";
    })
    .join("");
  const cohorts = ["all", ...COHORTS]
    .map((cohort) => {
      const label = cohort === "all" ? "Все когорты" : COHORT_TITLES[cohort as Cohort];
      return (
        '<label><input type="radio" name="cohort" data-cohort="' + cohort + '"' +
        (filters.cohort === cohort ? " checked" : "") + "> " + esc(label) + "</label>"
      );
    })
    .join("");
  return (
    '<aside class="filters"><h3>Роль оператора</h3>' +
    '<select data-f="role">' + roles + "</select>" +
    "<h3>Когорта срочности</h3>" + cohorts +
    '<button data-action="reset" class="btn">Сбросить фильтры</button>' +
    '<p class="hint">Клик по столбцу или узлу в полосе ниже фильтрует список заявок.</p></aside>'
  );
};

const legend = (): string =>
  '<div class="legend">' +
  COHORTS.map((cohort) => '<span><i style="background:' + COHORT_COLORS[cohort] + '"></i>' + esc(COHORT_TITLES[cohort]) + "</span>").join("") +
  "</div>";

const nodeStrip = (graph: Graph, incidents: readonly Incident[], filters: DashboardFilters): string =>
  cohortsByNode(graph, incidents)
    .map((bucket) => {
      const classes = "node-cell" + (bucket.total === 0 ? " empty" : "") + (filters.nodeId === bucket.nodeId ? " on" : "");
      return (
        '<span class="' + classes + '" data-node="' + bucket.nodeId + '" title="' + esc(tooltipFor(bucket)) + '">' +
        bucket.nodeId.replace("U", "") + (bucket.total > 0 ? "·" + bucket.total : "") + "</span>"
      );
    })
    .join("");

const incidentRows = (graph: Graph, list: readonly Incident[]): string =>
  list.length === 0
    ? '<p class="hint" data-empty="1">Под выбранные фильтры заявок нет.</p>'
    : '<ul class="incidents">' +
      list
        .map((incident) => {
          const node = graph.byId[incident.nodeId];
          const sla = slaStatus(incident, 0);
          return (
            '<li class="row" data-incident="' + incident.id + '">' +
            '<span class="id">' + incident.id + "</span>" +
            '<span class="prio p-' + incident.priority + '">' + esc(PRIORITY_TITLES[incident.priority]) + "</span>" +
            '<span class="title">' + esc(incident.situationId + " · " + incident.title) + "</span>" +
            '<span class="chip">' + incident.nodeId + " " + esc(node ? node.title : "") + "</span>" +
            '<span class="sla s-' + sla.phase + '">' + esc(sla.note) + "</span></li>"
          );
        })
        .join("") +
      "</ul>";

/** Разметка экрана «Шкала времени и когорты». */
export const renderDashboard = (graph: Graph, incidents: readonly Incident[], filters: DashboardFilters): string => {
  const list = applyFilters(graph, incidents, filters);
  return [
    '<h1 class="brand">Шкала времени и когорты</h1>',
    '<p class="hint">30 заявок по узлам процесса U1…U30, столбцы раскрашены по срочности. Под фильтрами: ' + list.length + " из " + incidents.length + "</p>",
    '<div class="dash">',
    filtersPanel(filters),
    "<section>",
    legend(),
    '<div class="chart-box"><canvas id="chart" data-chart="cohorts"></canvas><div class="tooltip" id="tt" data-tooltip="1"></div></div>',
    '<div class="node-strip" data-strip="1">' + nodeStrip(graph, incidents, filters) + "</div>",
    '<div class="dash-list" data-list="1">' + incidentRows(graph, list) + "</div>",
    "</section>",
    "</div>",
  ].join("");
};
