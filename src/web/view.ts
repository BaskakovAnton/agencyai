import { buildSummary } from "../core/report.ts";
import { ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { renderList, renderSelected } from "./card.ts";
import { renderAccessLegend, renderGroupPanel, renderModelHelp, renderNodeCatalog, renderPermissionMatrix } from "./model-catalog.ts";
import type { WebState } from "./session.ts";

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

const roleSwitch = (state: WebState): string =>
  ROLE_IDS.map(
    (id) =>
      '<button data-action="role" data-role="' + id + '"' + (id === state.session.role ? ' class="on"' : "") + ">" +
      esc(ROLE_NAMES[id]) +
      "</button>",
  ).join(" ");

/** Полная разметка страницы — собирается из состояния целиком. */
export const renderPage = (state: WebState, message: string): string => {
  const summary = buildSummary(state.graph, state.session, "");
  return [
    '<header class="top">',
    '<div class="stats">узлов ' + state.graph.order.length + " · заявок " + summary.total + " · переходов " + summary.moves + " · дошло до конца " + summary.finished + "</div>",
    '<div class="stats">SLA: в срок ' + summary.slaOnTrack + " · просрочено " + summary.slaOverdue + " · на паузе " + summary.slaPaused + " · эскалировано " + summary.slaEscalated + " · время " + (state.session.clock ?? 0) + " ч</div>",
    '<div class="controls">' +
      '<button data-action="wait">+4 ч</button>' +
      '<button data-action="sweep">Массовый шаг вперёд</button>' +
      '<button data-action="reset">Сбросить (seed ' + state.seed + ")</button>" +
      "</div>",
    "</header>",
    '<div class="rolebar"><span class="hint">Оператор:</span> <b>' + esc(ROLE_NAMES[state.session.role]) + "</b> " + roleSwitch(state) + "</div>",
    renderGroupPanel(state.graph),
    '<div class="grid two-col section-gap">' + renderNodeCatalog(state.graph) + renderAccessLegend() + "</div>",
    '<div class="section-gap">' + renderPermissionMatrix(state.graph) + "</div>",
    '<div class="section-gap">' + renderModelHelp(state.graph) + "</div>",
    message ? '<p class="notice">' + esc(message) + "</p>" : "",
    '<main class="cols"><section class="list">' + renderList(state) + '</section><aside class="side">' + renderSelected(state) + "</aside></main>",
    '<footer class="foot">Вся логика — в этом бандле: ядро модели, данные узлов, права ролей и переходы. Без сети и сервера.</footer>',
  ].join("");
};