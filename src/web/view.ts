import { buildSummary } from "../core/report.ts";
import { renderList, renderSelected } from "./card.ts";
import type { WebState } from "./session.ts";

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** Полная разметка страницы — собирается из состояния целиком. */
export const renderPage = (state: WebState, message: string): string => {
  const summary = buildSummary(state.graph, state.session, "");
  return [
    '<header class="top">',
    '<div class="brand">agencyai · модель процессов</div>',
    '<div class="stats">узлов ' + state.graph.order.length + " · заявок " + summary.total + " · переходов " + summary.moves + " · дошло до конца " + summary.finished + "</div>",
    '<div class="controls">' +
      '<button data-action="sweep">Массовый шаг вперёд</button>' +
      '<button data-action="reset">Сбросить (seed ' + state.seed + ")</button>" +
      "</div>",
    "</header>",
    message ? '<p class="msg">' + esc(message) + "</p>" : "",
    '<main class="cols"><section class="list">' + renderList(state) + '</section><aside class="side">' + renderSelected(state) + "</aside></main>",
    '<footer class="foot">Вся логика — в этом бандле: ядро модели, данные узлов и переходы. Без сети и сервера.</footer>',
  ].join("");
};
