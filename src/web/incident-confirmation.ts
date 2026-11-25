/** Панель подтверждения завершения: выделено из incident-html.ts (лимит 200 строк). Поведение не менялось. */
import { esc, renderBadge, renderPanel, renderReadOnlyNotice, type BadgeTone } from "./components.ts";
import { HISTORICAL_NOTICE } from "./historical.ts";
import type { IncidentView } from "./incident.ts";

export const ORG_STATUS_TONES: Readonly<Record<string, BadgeTone>> = {
  active: "blue",
  pending_review: "amber",
  completed: "green",
  reopened: "gray",
};

export const actionButton = (action: string, label: string, enabled: boolean, hint: string): string =>
  '<button class="button" data-org-action="' + action + '"' + (enabled ? "" : " disabled") +
  (enabled ? "" : ' title="' + esc(hint) + '"') + ">" + label + "</button>";

export const shortDay = (day: string): string => day.slice(8, 10) + "." + day.slice(5, 7);

/**
 * Панель подтверждения: действия выполняются доменом, права и статусы проверяет модель.
 * В историческом срезе действия запрещены — состояние прошлого дня менять нельзя.
 */
export const confirmationBlock = (view: IncidentView, historical: boolean, day: string): string => {
  const summary = view.orgSummary;
  const actions = view.actions;
  if (summary === null || actions === null) return "";
  const allowed = historical
    ? { submit: false, approve: false, reject: false, reopen: false }
    : actions;
  const historicalHint = "Исторический срез: действия недоступны";
  const options = view.actorOptions
    .map((option) => '<option value="' + option.id + '"' + (option.id === view.actorUserId ? " selected" : "") + ">" + esc(option.label) + "</option>")
    .join("");
  return renderPanel({
    title: "Подтверждение завершения",
    subtitle: historical
      ? "Исторический срез: состояние на " + shortDay(day) + ", действия недоступны"
      : "Исполнитель сообщает о выполнении, подтверждает контролёр; состояние — на выбранную дату",
    body:
      '<div class="sla-head"><span class="muted">Состояние</span>' +
      renderBadge(summary.statusTitle, ORG_STATUS_TONES[summary.status] ?? "gray") + "</div>" +
      (historical
        ? '<div class="section-gap" data-historical>' + renderReadOnlyNotice(HISTORICAL_NOTICE) + "</div>"
        : "") +
      '<div class="section-gap"><label class="hint">Действовать от имени: <select data-org-actor aria-label="Пользователь для действий">' +
      options + "</select></label></div>" +
      '<div class="stack section-gap">' +
      actionButton("submit", "Сообщить о выполнении", allowed.submit, historical ? historicalHint : "Доступно исполнителю, когда обращение в работе") +
      actionButton("approve", "Подтвердить завершение", allowed.approve, historical ? historicalHint : "Доступно контролёру: обращение на проверке и работу сдал другой пользователь") +
      actionButton("reject", "Отклонить с причиной", allowed.reject, historical ? historicalHint : "Доступно контролёру для обращения на проверке") +
      actionButton("reopen", "Переоткрыть", allowed.reopen, historical ? historicalHint : "Доступно контролёру для завершённого обращения") +
      "</div>" +
      '<p class="readonly" data-org-message>' +
      (historical
        ? HISTORICAL_NOTICE
        : "Действия проверяются моделью: статус, полномочия и запрет самоподтверждения.") +
      "</p>",
  });
};
