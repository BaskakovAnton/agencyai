import { NODE_HOURS } from "../data/sla.ts";
import { esc, renderPanel } from "./components.ts";
import { hrefTimeline } from "./router.ts";
import type { IncidentView } from "./incident.ts";

/** Верх карточки: объясняет роль и допустимый следующий переход, не добавляя новых действий в модель. */
export const decisionBlock = (view: IncidentView, day: string): string =>
  renderPanel({
    title: "Следующий шаг по модели",
    subtitle: "Сначала решение оператора, затем полная история",
    actions: '<a class="panel-link" href="' + hrefTimeline(day, "gantt") + '">Хронология →</a>',
    body:
      '<div class="decision-card" data-decision-card><div><div class="fact-label">Текущий этап</div><b>' + esc(view.nodeId + " · " + view.nodeTitle) +
      '</b></div><div data-current-role><div class="fact-label">Ответственная роль</div><b>' + esc(view.nodeRoleTitle || "Нет данных") +
      "</b></div></div>" +
      '<div class="decision-next"><div class="fact-label">Допустимые переходы</div>' +
      (view.next.length === 0
        ? '<p class="muted">Процесс завершён: следующих узлов нет.</p>'
        : '<ul class="next-list">' + view.next
          .map(
            (option) =>
              "<li><b>" + option.to + "</b> " + esc(option.title) + (option.percent === 0 ? "" : ' <span class="muted">' + option.percent + "%</span>") +
              ' <span class="muted" data-next-norm>срок: ' +
              (NODE_HOURS[option.to] === undefined ? "Нет данных" : NODE_HOURS[option.to] + " ч") +
              "</span></li>",
          )
          .join("") +
        "</ul>") +
      "</div>",
  });
