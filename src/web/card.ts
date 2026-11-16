import type { Incident } from "../types.ts";
import { ACCESS_MARKS, GROUP_TITLES, PRIORITY_TITLES, ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { neighborsOf } from "../core/graph.ts";
import type { WebState } from "./session.ts";

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

const btn = (label: string, action: string, ref: string, nodeId = ""): string =>
  '<button data-action="' + action + '" data-ref="' + ref + '"' + (nodeId ? ' data-node="' + nodeId + '"' : "") + ">" + label + "</button>";

const nodeChip = (state: WebState, nodeId: string): string => {
  const node = state.graph.byId[nodeId];
  return '<span class="chip">' + nodeId + " " + esc(node ? node.title : "?") + "</span>";
};

const roleList = (state: WebState, nodeId: string): string => {
  const node = state.graph.byId[nodeId];
  if (!node) return "";
  return ROLE_IDS.map((role) => {
    const level = node.access[role];
    return '<li><b class="mark">' + ACCESS_MARKS[level] + "</b> " + esc(ROLE_NAMES[role]) + " <i>" + level + "</i></li>";
  }).join("");
};

const history = (incident: Incident): string =>
  incident.history.length === 0
    ? '<p class="hint">переходов ещё не было</p>'
    : "<ol>" + incident.history.map((m) => "<li>шаг " + m.step + ": " + m.from + " → " + m.to + " <i>" + m.actor + "</i></li>").join("") + "</ol>";

/** Карточка выбранной заявки: состояние, соседи, права ролей, история. */
export const renderSelected = (state: WebState): string => {
  const incident = state.session.incidents.find((i) => i.id === state.selected);
  if (!incident) return '<p class="hint">Выберите заявку в списке.</p>';
  const node = state.graph.byId[incident.nodeId];
  const { prev, next } = neighborsOf(state.graph, incident.nodeId);
  const links = [...prev, ...next].map((id) => btn(id, "move", incident.id, id)).join(" ");
  const groupLine = node ? " " + '<span class="group">' + GROUP_TITLES[node.group] + "</span>" : "";
  return [
    "<h2>" + incident.id + " · " + esc(incident.title) + "</h2>",
    '<p class="meta">' + esc(incident.address) + " · " + esc(incident.reporter) + " · " + PRIORITY_TITLES[incident.priority] + "</p>",
    "<p>Узел: " + nodeChip(state, incident.nodeId) + groupLine + "</p>",
    '<p class="moves">' + btn("‹ назад", "back", incident.id) + " " + btn("вперёд ›", "forward", incident.id) + "</p>",
    links ? "<p>Соседние узлы: " + links + "</p>" : '<p class="hint">граница процесса</p>',
    "<h3>История</h3>" + history(incident),
    node ? '<h3>Права ролей на узле</h3><ul class="roles">' + roleList(state, incident.nodeId) + "</ul>" : "",
  ].join("");
};

export const renderList = (state: WebState): string => {
  const rows = state.session.incidents
    .map((incident) => {
      const active = incident.id === state.selected ? " active" : "";
      return (
        '<li class="row' + active + '" data-action="select" data-ref="' + incident.id + '">' +
        '<span class="id">' + incident.id + "</span>" +
        '<span class="prio p-' + incident.priority + '">' + PRIORITY_TITLES[incident.priority] + "</span>" +
        '<span class="title">' + esc(incident.title) + "</span>" +
        nodeChip(state, incident.nodeId) +
        '<span class="acts">' + btn("‹", "back", incident.id) + btn("›", "forward", incident.id) + "</span>" +
        "</li>"
      );
    })
    .join("");
  return '<h2>Заявки <span class="hint">(' + state.session.incidents.length + ')</span></h2><ul class="incidents">' + rows + "</ul>";
};