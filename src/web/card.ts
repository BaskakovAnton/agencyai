import type { Incident } from "../types.ts";
import { ACCESS_MARKS, GROUP_TITLES, PRIORITY_TITLES, ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { branchesOf, neighborsOf } from "../core/graph.ts";
import { roleAccess } from "../core/roles.ts";
import { slaStatus } from "../core/sla.ts";
import { branchShares } from "../data/edges.ts";
import { situationById } from "../data/situations.ts";
import type { WebState } from "./session.ts";

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

const btn = (label: string, action: string, ref: string, nodeId = ""): string =>
  '<button data-action="' + action + '" data-ref="' + ref + '"' + (nodeId ? ' data-node="' + nodeId + '"' : "") + ">" + label + "</button>";

/** Иконочная кнопка перехода: символ виден, смысл — в aria-label. */
const act = (symbol: string, action: string, ref: string, title: string): string =>
  '<button data-action="' + action + '" data-ref="' + ref + '" aria-label="' + title + " " + ref + '">' + symbol + "</button>";

/** Кнопка перехода: недоступные роли варианты показываются выключенными с причиной. */
const moveBtn = (state: WebState, label: string, ref: string, to: string): string => {
  const access = roleAccess(state.graph, to, state.session.role);
  const attrs = access.allowed ? "" : ' disabled title="' + access.level + ": " + access.caveat + '"';
  return '<button data-action="move" data-ref="' + ref + '" data-node="' + to + '"' + attrs + ">" + label + "</button>";
};

/** Значок SLA заявки: остаток часов, пауза, просрочка. */
const slaBadge = (state: WebState, incident: Incident): string => {
  const status = slaStatus(incident, state.session.clock ?? 0);
  const label =
    status.phase === "overdue"
      ? "просрочено"
      : status.phase === "paused"
        ? "пауза"
        : status.phase === "none"
          ? "вне SLA"
          : Math.round(status.hoursLeft) + " ч";
  return '<span class="sla s-' + status.phase + '" title="' + status.note + '">' + label + "</span>";
};

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

const branchLine = (state: WebState, nodeId: string): string => {
  const branches = branchesOf(state.graph, nodeId);
  if (branches.length === 0) return "";
  const options = branchShares(branches)
    .map((share) => moveBtn(state, share.to + " " + share.percent + "%", state.selected, share.to))
    .join(" ");
  return '<p class="branch">Развилка (рандомное решение): ' + options + "</p>";
};

/** Блок ситуации регламента: что за сценарий и как он проходится по ролям. */
const situationBlock = (incident: Incident): string => {
  const situation = situationById(incident.situationId);
  if (!situation) return "";
  const steps = situation.steps
    .map((step) => "<li><b>" + esc(ROLE_NAMES[step.lane]) + "</b> " + esc(step.title) + " — " + esc(step.text) + "</li>")
    .join("");
  return (
    '<h3>Ситуация ' + situation.id + " · " + esc(situation.title) + "</h3>" +
    '<p class="meta">' + esc(situation.sla) + " · " + situation.priority + "</p>" +
    '<ol class="steps">' + steps + "</ol>"
  );
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
  const links = [...prev, ...next].map((id) => moveBtn(state, id, incident.id, id)).join(" ");
  const access = roleAccess(state.graph, incident.nodeId, state.session.role);
  const groupLine = node ? " " + '<span class="group">' + GROUP_TITLES[node.group] + "</span>" : "";
  return [
    "<h2>" + incident.id + " · " + esc(incident.title) + "</h2>",
    '<p class="meta">' + esc(incident.address) + " · " + esc(incident.reporter) + " · " + PRIORITY_TITLES[incident.priority] + "</p>",
    "<p>Узел: " + nodeChip(state, incident.nodeId) + groupLine + "</p>",
    '<p class="meta">Права роли на этом узле: ' + access.level + " (" + access.caveat + ")</p>",
    '<p class="meta">' + slaBadge(state, incident) + " " + slaStatus(incident, state.session.clock ?? 0).note + "</p>",
    '<p class="moves">' + btn("‹ назад", "back", incident.id) + " " + btn("вперёд ›", "forward", incident.id) + "</p>",
    links ? "<p>Соседние узлы: " + links + "</p>" : '<p class="hint">граница процесса</p>',
    branchLine(state, incident.nodeId),
    situationBlock(incident),
    "<h3>История</h3>" + history(incident),
    node ? '<h3>Права ролей на узле</h3><ul class="roles">' + roleList(state, incident.nodeId) + "</ul>" : "",
  ].join("");
};

export const renderList = (state: WebState): string => {
  const rows = state.session.incidents
    .map((incident) => {
      const active = incident.id === state.selected ? " on" : "";
      return (
        '<li class="row' + active + '">' +
        '<button class="row-main" data-action="select" data-ref="' + incident.id + '">' +
        '<span class="id">' + incident.id + "</span>" +
        '<span class="prio ' + incident.priority + '">' + PRIORITY_TITLES[incident.priority] + "</span>" +
        '<span class="title">' + esc(incident.title) + "</span>" +
        nodeChip(state, incident.nodeId) +
        slaBadge(state, incident) +
        "</button>" +
        '<span class="acts">' + act("‹", "back", incident.id, "Назад:") + act("›", "forward", incident.id, "Вперёд:") + "</span>" +
        "</li>"
      );
    })
    .join("");
  return '<h2>Заявки <span class="hint">(' + state.session.incidents.length + ')</span></h2><ul class="incidents">' + rows + "</ul>";
};