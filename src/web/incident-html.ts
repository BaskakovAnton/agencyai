import { formatDay } from "../core/timeline.ts";
import { esc, renderBadge, renderEmptyState, renderPanel, renderReadOnlyNotice, renderSlaBadge, type BadgeTone } from "./components.ts";
import { hrefChat, hrefIncidents, hrefTimeline } from "./router.ts";
import type { IncidentView, StepRow } from "./incident.ts";

const daySelect = (days: readonly string[], day: string): string =>
  '<label class="hint">Дата среза: <select data-day-select aria-label="Дата среза">' +
  days.map((value) => '<option value="' + value + '"' + (value === day ? " selected" : "") + ">" + formatDay(value) + "</option>").join("") +
  "</select></label>";

const stepRow = (step: StepRow, history: boolean): string =>
  '<div class="step ' + step.state + '"' + (history ? " data-history-row" : "") + ">" +
  '<span class="step-mark" aria-hidden="true"></span><div>' +
  '<div class="step-title">' + step.nodeId + " · " + esc(step.nodeTitle) + "</div>" +
  '<div class="step-caption">' + esc(step.caption) + "</div></div></div>";

const factsBlock = (view: IncidentView): string =>
  '<div class="detail-facts">' +
  view.facts
    .map((fact) =>
      '<div class="fact"' + (fact.label === "Текущий этап" ? " data-current" : "") + ">" +
      '<div class="fact-label">' + esc(fact.label) + "</div>" +
      '<div class="fact-value"' + (fact.tone === undefined ? "" : ' data-tone="' + fact.tone + '"') + ">" +
      esc(fact.value) + "</div></div>",
    )
    .join("") +
  "</div>";

const historyBlock = (view: IncidentView): string =>
  '<div class="step-list">' +
  view.steps.map((step) => stepRow(step, step.fromHistory)).join("") +
  "</div>" +
  '<div class="section-gap" data-next><div class="fact-label">Следующий шаг</div>' +
  (view.next.length === 0
    ? '<p class="muted">Процесс завершён: следующих узлов нет.</p>'
    : (view.branched ? '<p class="muted">Развилка: допустимо несколько веток — это варианты модели.</p>' : "") +
      '<ul class="next-list">' +
      view.next
        .map((option) => "<li><b>" + option.to + "</b> " + esc(option.title) + (option.percent === 0 ? "" : ' <span class="muted">' + option.percent + "%</span>") + "</li>")
        .join("") +
      "</ul>") +
  "</div>";

const slaBlock = (view: IncidentView): string =>
  '<div class="sla-head"><span class="muted">Текущий статус</span>' + renderSlaBadge(view.phaseTitle, view.slaTone) + "</div>" +
  '<div class="summary-big" data-tone="' + view.slaTone + '">' + esc(view.slaBig) + "</div>" +
  '<div class="fact-label">' + esc(view.slaNote) + "</div>" +
  '<div class="section-gap"><div class="fact-label">Норматив по приоритету</div><div class="fact-value">' + esc(view.normTitle) + "</div></div>" +
  '<div class="section-gap"><div class="fact-label">Паузы SLA</div><div class="fact-value">' + esc(view.pauseText) + "</div></div>";

const ROLE_TYPE_TITLES: Readonly<Record<"accountable" | "participant", string>> = {
  accountable: "ответственное подразделение",
  participant: "участник",
};

/** Участники из орг-модели, если она подключена; иначе — роли узлов (прежнее поведение). */
const orgParticipantsBlock = (view: IncidentView): string => {
  const summary = view.orgSummary;
  if (summary === null) return "";
  if (summary.participants.length === 0) {
    return renderEmptyState(
      summary.status === "completed" || summary.status === "reopened"
        ? "Активных назначений нет: завершение закрыло участие, для продолжения нужно новое назначение."
        : "Назначения по этому обращению отсутствуют.",
    );
  }
  return summary.participants
    .map((participant) =>
      '<div class="assignee section-gap"><span class="avatar" aria-hidden="true">' + esc(participant.name.slice(0, 2)) + "</span>" +
      '<div><div class="assignee-name">' + esc(participant.name) + "</div>" +
      '<div class="fact-label">' + ROLE_TYPE_TITLES[participant.type] +
      (participant.employees.length === 0 ? " · сотрудник не назначен" : " · " + esc(participant.employees.join(", "))) +
      "</div></div></div>",
    )
    .join("");
};

const participantsBlock = (view: IncidentView): string =>
  view.orgSummary !== null
    ? orgParticipantsBlock(view)
    : view.participants.length === 0
      ? '<p class="muted">Участники не определены моделью.</p>'
      : view.participants
        .map((person) =>
          '<div class="assignee section-gap"><span class="avatar" aria-hidden="true">' + esc(person.initials) + "</span>" +
          '<div><div class="assignee-name">' + esc(person.name) + "</div>" +
          '<div class="fact-label">' + esc(person.note) + "</div></div></div>",
        )
        .join("");

const ORG_STATUS_TONES: Readonly<Record<string, BadgeTone>> = {
  active: "blue",
  pending_review: "amber",
  completed: "green",
  reopened: "gray",
};

const actionButton = (action: string, label: string, enabled: boolean, hint: string): string =>
  '<button class="button" data-org-action="' + action + '"' + (enabled ? "" : " disabled") +
  (enabled ? "" : ' title="' + esc(hint) + '"') + ">" + label + "</button>";

/** Панель подтверждения: действия выполняются доменом, права и статусы проверяет модель. */
const confirmationBlock = (view: IncidentView): string => {
  const summary = view.orgSummary;
  const actions = view.actions;
  if (summary === null || actions === null) return "";
  const options = view.actorOptions
    .map((option) => '<option value="' + option.id + '"' + (option.id === view.actorUserId ? " selected" : "") + ">" + esc(option.label) + "</option>")
    .join("");
  return renderPanel({
    title: "Подтверждение завершения",
    subtitle: "Исполнитель сообщает о выполнении, подтверждает контролёр",
    body:
      '<div class="sla-head"><span class="muted">Состояние</span>' +
      renderBadge(summary.statusTitle, ORG_STATUS_TONES[summary.status] ?? "gray") + "</div>" +
      '<div class="section-gap"><label class="hint">Действовать от имени: <select data-org-actor aria-label="Пользователь для действий">' +
      options + "</select></label></div>" +
      '<div class="stack section-gap">' +
      actionButton("submit", "Сообщить о выполнении", actions.submit, "Доступно исполнителю, когда обращение в работе") +
      actionButton("approve", "Подтвердить завершение", actions.approve, "Доступно контролёру: обращение на проверке и работу сдал другой пользователь") +
      actionButton("reject", "Отклонить с причиной", actions.reject, "Доступно контролёру для обращения на проверке") +
      actionButton("reopen", "Переоткрыть", actions.reopen, "Доступно контролёру для завершённого обращения") +
      "</div>" +
      '<p class="readonly" data-org-message>Действия проверяются моделью: статус, полномочия и запрет самоподтверждения.</p>',
  });
};

const linksBlock = (view: IncidentView, day: string): string =>
  '<div class="stack">' +
  '<a class="button" href="' + hrefTimeline(day, "git") + '">Открыть в хронологии →</a>' +
  '<a class="button" href="' + hrefTimeline(day, "gantt") + '">Посмотреть сроки в Ганте →</a>' +
  '<a class="button" href="' + hrefChat(view.id, day) + '">Открыть переписку →</a>' +
  '<a class="button" href="' + hrefIncidents(day) + '">Все обращения →</a></div>';

/** Карточка обращения по композиции incident-detail.html (только чтение). */
export const renderIncident = (view: IncidentView, day: string, days: readonly string[]): string =>
  '<section class="incident-detail" data-incident-detail data-incident="' + view.id + '">' +
  '<div class="toolbar">' + daySelect(days, day) + '<span class="grow"></span><a class="panel-link" href="' + hrefIncidents(day) + '">Все обращения →</a></div>' +
  '<div class="detail-grid">' +
  "<div>" +
  renderPanel({
    title: view.title,
    subtitle: view.category + " · создано " + view.createdLabel,
    actions: renderBadge(view.priorityTitle, view.priorityTone),
    body:
      '<div class="case-id">' + view.caseLabel + "</div>" + factsBlock(view) +
      '<div class="section-gap"><div class="fact-label">Описание</div><p class="muted">' + esc(view.description) + "</p></div>" +
      renderReadOnlyNotice("Режим демонстрации: сведения доступны только для просмотра"),
  }) +
  '<div class="section-gap">' +
  renderPanel({ title: "История прохождения", subtitle: "Временная последовательность событий заявки", body: historyBlock(view) }) +
  "</div></div>" +
  "<div>" +
  '<div data-sla>' + renderPanel({ title: "Контроль SLA", body: slaBlock(view) }) + "</div>" +
  (view.orgSummary === null ? "" : '<div class="section-gap" data-org-confirmation>' + confirmationBlock(view) + "</div>") +
  '<div class="section-gap">' + renderPanel({ title: "Участники", body: participantsBlock(view) }) + "</div>" +
  '<div class="section-gap" data-links>' + renderPanel({ title: "Связанные представления", body: linksBlock(view, day) }) + "</div>" +
  "</div></div></section>";

/** Неизвестный id: честное сообщение и возврат к списку. */
export const renderIncidentMissing = (ref: string, day: string, days: readonly string[]): string =>
  '<section class="incident-detail" data-incident-missing>' +
  '<div class="toolbar">' + daySelect(days, day) + "</div>" +
  '<div class="empty-state">Заявка «' + esc(ref) + '» не найдена в демонстрационной модели.</div>' +
  '<p class="section-gap"><a class="button" href="' + hrefIncidents(day) + '">Вернуться к списку обращений</a></p></section>';
