import { formatDay, formatStamp } from "../core/timeline.ts";
import { hrefChat, hrefIncidents, hrefTimeline } from "./router.ts";
import type { IncidentView } from "./incident.ts";

const esc = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

const daySelect = (days: readonly string[], day: string): string =>
  '<label class="hint">Дата среза: <select data-day-select>' +
  days
    .map((value) => '<option value="' + value + '"' + (value === day ? " selected" : "") + ">" + formatDay(value) + "</option>")
    .join("") +
  "</select></label>";

/** Карточка обращения: read-only представление модели, без действий, которых нет в ядре. */
export const renderIncident = (view: IncidentView, day: string, days: readonly string[]): string => {
  const head =
    '<header class="detail-head">' +
    '<p class="detail-id">' + view.id + " · " + esc(view.priorityTitle) + "</p>" +
    '<p class="detail-title">' + esc(view.title) + "</p>" +
    '<p class="detail-meta">' + esc(view.address) + " · " + esc(view.reporter) + " · " + esc(view.category) +
    (view.situationTitle === "" ? "" : " · ситуация: " + esc(view.situationTitle)) + "</p>" +
    daySelect(days, day) +
    "</header>";

  const current =
    '<section class="panel" data-current><h2>Текущий этап</h2>' +
    '<p><b>' + view.nodeId + " " + esc(view.nodeTitle) + "</b>" + (view.groupTitle === "" ? "" : ' <span class="hint">' + esc(view.groupTitle) + "</span>") + "</p>" +
    (view.nodeDesc === "" ? "" : '<p class="hint">' + esc(view.nodeDesc) + "</p>") +
    (view.nodeRoleTitle === "" ? "" : '<p class="meta">Роль на узле: <b>' + esc(view.nodeRoleTitle) + "</b></p>") +
    (view.beforeCreation ? '<p class="notice">На эту дату заявки ещё не было — показан начальный узел процесса.</p>' : "") +
    "</section>";

  const sla =
    '<section class="panel" data-sla><h2>SLA</h2>' +
    '<p><span class="sla s-' + view.phase + '">' + esc(view.phaseTitle) + '</span> <span class="meta">' + esc(view.dueText) + "</span></p>" +
    '<p class="meta">Норматив: ' + esc(view.normTitle) + (view.normHours === 0 ? "" : " · " + view.normHours + " ч") + "</p>" +
    (view.paused ? '<p class="meta">Пауза: ' + esc(view.pauseReason) + "</p>" : "") +
    "</section>";

  const history =
    '<section class="panel" data-history><h2>История переходов</h2>' +
    (view.history.length === 0
      ? '<p class="hint">Переходов ещё не было.</p>'
      : '<ol class="history-list">' +
        view.history
          .map(
            (row) =>
              '<li data-history-row><b>' + row.to + " " + esc(row.toTitle) + "</b> " +
              '<span class="hint">' + (row.at === "" ? "" : formatStamp(row.at)) +
              (row.roleTitle === "" ? "" : " · " + esc(row.roleTitle)) + " · " + esc(row.actor) + "</span></li>",
          )
          .join("") +
        "</ol>") +
    "</section>";

  const next =
    '<section class="panel" data-next><h2>Следующий шаг</h2>' +
    (view.next.length === 0
      ? '<p class="hint">Процесс завершён: следующих узлов нет.</p>'
      : (view.branched
          ? '<p class="hint">Развилка: узел допускает несколько веток — это варианты модели, а не обязательный шаг.</p>'
          : "") +
        '<ul class="next-list">' +
        view.next
          .map(
            (option) =>
              "<li><b>" + option.to + "</b> " + esc(option.title) +
              (option.percent === 0 ? "" : ' <span class="hint">' + option.percent + "%</span>") + "</li>",
          )
          .join("") +
        "</ul>") +
    "</section>";

  const links =
    '<section class="panel" data-links><h2>Связанные представления</h2>' +
    '<p><a href="' + hrefTimeline(day, "git") + '">Хронология на эту дату</a> · ' +
    '<a href="' + hrefTimeline(day, "gantt") + '">Диаграмма Ганта</a> · ' +
    '<a href="' + hrefChat(view.id, day) + '">Переписка заявки</a> · ' +
    '<a href="' + hrefIncidents(day) + '">Все обращения</a></p></section>';

  return '<section class="incident-detail" data-incident-detail data-incident="' + view.id + '">' + head +
    '<div class="detail-grid">' + current + sla + history + next + links + "</div></section>";
};

/** Неизвестный id: честное сообщение и возврат к списку. */
export const renderIncidentMissing = (ref: string, day: string, days: readonly string[]): string =>
  '<section class="incident-detail" data-incident-missing>' +
  '<header class="detail-head"><p class="detail-title">Заявка не найдена</p>' +
  '<p class="detail-meta">В демонстрационной модели нет заявки «' + esc(ref) + "».</p>" + daySelect(days, day) + "</header>" +
  '<p><a href="' + hrefIncidents(day) + '">Вернуться к списку обращений</a> · <a href="#dashboard">Обзор</a></p></section>';
