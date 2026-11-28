import { esc, renderEmptyState, renderPriorityBadge, renderSlaBadge } from "./components.ts";
import { hrefIncident } from "./router.ts";
import type { Overview } from "./overview.ts";

const department = (value: string): string => value === "" ? "Нет данных" : value;

const tableRows = (overview: Overview): string =>
  overview.attention.length === 0
    ? '<tr><td colspan="5">' + renderEmptyState("Нет обращений, требующих внимания", "", "✓") + "</td></tr>"
    : overview.attention.map((item) =>
      '<tr class="click-row" data-attention="' + esc(item.id) + '"><td><div class="case-id">' + esc(item.id) +
      '</div><div class="case-title">' + esc(item.title) + '</div><div class="case-sub">' + esc(item.address) + "</div></td>" +
      "<td>" + renderPriorityBadge(item.priorityTitle, item.priorityTone) + "</td><td>" + esc(department(item.departmentName)) +
      '<div class="case-sub">' + esc(item.nodeId + " · " + item.nodeTitle) + "</div></td><td>" +
      renderSlaBadge(item.slaText, item.slaTone) + '</td><td><a class="panel-link" href="' + hrefIncident(item.id, overview.day) + '">Открыть →</a></td></tr>',
    ).join("");

const cards = (overview: Overview): string =>
  overview.attention.length === 0
    ? renderEmptyState("Нет обращений, требующих внимания", "", "✓")
    : overview.attention.map((item) =>
      '<details class="attention-card" data-attention-card="' + esc(item.id) + '"><summary><span class="attention-brief"><b>' +
      esc(item.id) + " · " + esc(item.title) + '</b><span>' + esc(item.nodeId + " · " + item.nodeTitle) +
      "</span></span>" + renderSlaBadge(item.slaText, item.slaTone) + '</summary><div class="attention-tile" data-attention-tile="' +
      esc(item.id) + '"><dl><div><dt>Адрес</dt><dd>' + esc(item.address || "Нет данных") + "</dd></div><div><dt>Приоритет</dt><dd>" +
      esc(item.priorityTitle) + "</dd></div><div><dt>Подразделение</dt><dd>" + esc(department(item.departmentName)) +
      "</dd></div><div><dt>Этап</dt><dd>" + esc(item.nodeId + " · " + item.nodeTitle) + "</dd></div></dl><a class=\"panel-link\" href=\"" +
      hrefIncident(item.id, overview.day) + '">Открыть полную карточку →</a></div></details>',
    ).join("");

/** В desktop остаётся таблица, а на смартфоне раскрываемые плитки исключают горизонтальный скролл. */
export const renderAttention = (overview: Overview): string =>
  '<div class="attention-desktop table-wrap" tabindex="0" role="region" aria-label="Требуют внимания: таблица прокручивается по горизонтали">' +
  '<table class="data-table"><caption class="sr-only">Обращения, требующие внимания</caption><thead><tr>' +
  '<th scope="col">Обращение</th><th scope="col">Приоритет</th><th scope="col">Подразделение</th><th scope="col">SLA</th><th scope="col">Карточка</th>' +
  "</tr></thead><tbody>" + tableRows(overview) + "</tbody></table></div>" +
  '<div class="attention-mobile" aria-label="Обращения, требующие внимания">' + cards(overview) + "</div>";
