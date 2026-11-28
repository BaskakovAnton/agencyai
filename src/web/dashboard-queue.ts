import { esc, renderPanel, renderSlaBadge } from "./components.ts";
import { hrefIncident } from "./router.ts";
import type { Overview } from "./overview.ts";

const actionHint = (slaText: string): string =>
  slaText === "Просрочено" ? "Проверить следующий шаг и ответственного" : "Проверить следующий шаг";

/**
 * Оперативная очередь: те же обращения внимания из Snapshot, без нового правила приоритета.
 * Намеренно выводит только первые три записи — подробный список остаётся в реестре.
 */
export const renderActionQueue = (overview: Overview): string =>
  renderPanel({
    title: "Следующие действия",
    subtitle: "Обращения, где оператору нужно проверить следующий шаг",
    actions: '<a class="panel-link" href="#incidents?view=attention&at=' + overview.day + '">Вся очередь →</a>',
    body:
      '<div class="action-queue" data-action-queue>' +
      (overview.attention.length === 0
        ? '<p class="muted">На выбранную дату обращений для разбора нет.</p>'
        : overview.attention
            .slice(0, 3)
            .map(
              (item) =>
                '<a class="action-item" data-action-item="' + esc(item.id) + '" href="' + hrefIncident(item.id, overview.day) + '">' +
                '<span class="action-risk ' + item.slaTone + '" aria-hidden="true"></span><span class="action-copy"><b>' + esc(item.id) +
                " · " + esc(item.title) + '</b><span>' + esc(item.nodeId + " · " + item.nodeTitle) + " — " + actionHint(item.slaText) +
                '</span></span>' + renderSlaBadge(item.slaText, item.slaTone) + "</a>",
            )
            .join("")) +
      "</div>",
  });
