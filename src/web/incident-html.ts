import { formatDay } from "../core/timeline.ts";
import { esc, renderBadge, renderEmptyState, renderPanel, renderReadOnlyNotice, renderSlaBadge } from "./components.ts";
import { hrefIncidents } from "./router.ts";
import type { IncidentView, StepRow } from "./incident.ts";
import { confirmationBlock } from "./incident-confirmation.ts";
import { participantsBlock } from "./incident-org.ts";
import { linksBlock } from "./incident-actor.ts";
import { decisionBlock } from "./incident-decision.ts";
import { durationsBlock } from "./incident-durations.ts";
import { attributionBlock } from "./incident-attribution.ts";
import { transfersBlock } from "./incident-transfers.ts";

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

/** Карточка обращения по композиции incident-detail.html (только чтение). */
export interface IncidentRenderOptions {
  /** Исторический срез: действия запрещены, показывается пояснение. */
  readonly historical?: boolean;
}

export const renderIncident = (
  view: IncidentView,
  day: string,
  days: readonly string[],
  options: IncidentRenderOptions = {},
): string =>
  '<section class="incident-detail" data-incident-detail data-incident="' + view.id + '">' +
  '<div class="toolbar">' + daySelect(days, day) + '<span class="grow"></span><a class="panel-link" href="' + hrefIncidents(day) + '">Все обращения →</a></div>' +
  '<div class="detail-grid">' +
  "<div>" +
  decisionBlock(view, day) +
  '<div class="section-gap" data-attribution-block>' + attributionBlock(view.attribution, view.orgSummary?.accountableName ?? "") + "</div>" +
  '<div class="section-gap" data-durations-block>' + durationsBlock(view.durations) + "</div>" +
  '<div class="section-gap">' +
  renderPanel({
    title: view.title,
    subtitle: view.category + " · создано " + view.createdLabel,
    actions: renderBadge(view.priorityTitle, view.priorityTone),
    body:
      '<div class="case-id">' + view.caseLabel + "</div>" + factsBlock(view) +
      '<div class="section-gap"><div class="fact-label">Описание</div><p class="muted">' + esc(view.description) + "</p></div>" +
      renderReadOnlyNotice("Режим демонстрации: сведения доступны только для просмотра"),
  }) +
  "</div>" +
  '<div class="section-gap" data-transfers-block>' + transfersBlock(view.transfers) + "</div>" +
  '<div class="section-gap">' +
  renderPanel({ title: "История прохождения", subtitle: "Временная последовательность событий заявки", body: historyBlock(view) }) +
  "</div></div>" +
  "<div>" +
  '<div data-sla>' + renderPanel({ title: "Контроль SLA", body: slaBlock(view) }) + "</div>" +
  (view.orgSummary === null
    ? ""
    : '<div class="section-gap" data-org-confirmation>' + confirmationBlock(view, options.historical === true, day) + "</div>") +
  '<div class="section-gap">' + renderPanel({ title: "Участники", body: participantsBlock(view) }) + "</div>" +
  '<div class="section-gap" data-links>' + renderPanel({ title: "Связанные представления", body: linksBlock(view, day) }) + "</div>" +
  "</div></div></section>";

/** Неизвестный id: честное сообщение и возврат к списку. */
export const renderIncidentMissing = (ref: string, day: string, days: readonly string[]): string =>
  '<section class="incident-detail" data-incident-missing>' +
  '<div class="toolbar">' + daySelect(days, day) + "</div>" +
  renderEmptyState("Заявка «" + ref + "» не найдена в демонстрационной модели.", "", "⚠") +
  '<p class="section-gap"><a class="button" href="' + hrefIncidents(day) + '">Вернуться к списку обращений</a></p></section>';
