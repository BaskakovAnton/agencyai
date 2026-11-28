import {
  DEMO_NOTE,
  STREAM_NOTES,
  STREAM_TITLES,
  nextStepText,
  type AppealDraft,
  type AppealStream,
  type ValidationIssue,
} from "../core/appeal.ts";
import { esc } from "./components.ts";

/** Разметка прототипа формы: выбор потока, формы двух потоков и подтверждение. */

const errorOf = (issues: readonly ValidationIssue[], field: ValidationIssue["field"]): string =>
  issues.find((issue) => issue.field === field)?.message ?? "";

const errorLine = (id: string, message: string): string =>
  message === "" ? "" : '<p class="field-error" id="' + id + '-error" role="alert">' + esc(message) + "</p>";

const attrs = (id: string, message: string): string =>
  'id="' + id + '"' + (message === "" ? "" : ' aria-invalid="true" aria-describedby="' + id + '-error"');

const textField = (id: string, label: string, value: string, message: string): string =>
  '<div class="field"><label for="' + id + '">' + label + "</label>" +
  '<input type="text" name="' + id.slice(7) + '" ' + attrs(id, message) + ' value="' + esc(value) + '">' +
  errorLine(id, message) + "</div>";

const areaField = (id: string, label: string, value: string, message: string): string =>
  '<div class="field"><label for="' + id + '">' + label + "</label>" +
  '<textarea name="text" rows="7" ' + attrs(id, message) + ">" + esc(value) + "</textarea>" +
  errorLine(id, message) + "</div>";

const checkField = (id: string, label: string, checked: boolean, message: string): string =>
  '<div class="field field-check"><input type="checkbox" name="' + id.slice(7) + '" ' + attrs(id, message) +
  (checked ? " checked" : "") + '><label for="' + id + '">' + label + "</label>" + errorLine(id, message) + "</div>";

export const renderAppealChooser = (): string =>
  '<section class="appeal" data-appeal-chooser>' +
  '<h1 class="appeal-title">Обращение к депутату</h1>' +
  '<p class="appeal-lede">Выберите поток: у официального обращения и оперативного сообщения разные правила, сроки и ожидания от ответа.</p>' +
  '<div class="appeal-cards">' +
  (["official", "operational"] as const)
    .map(
      (stream) =>
        '<a class="appeal-card" data-appeal-stream="' + stream + '" href="#appeal?stream=' + stream + '">' +
        "<b>" + STREAM_TITLES[stream] + "</b><span>" + STREAM_NOTES[stream] + "</span>" +
        '<i class="appeal-card-go">Заполнить →</i></a>',
    )
    .join("") +
  "</div>" +
  '<p class="appeal-demo">' + DEMO_NOTE + "</p></section>";

export const renderAppealForm = (
  stream: AppealStream,
  draft: AppealDraft,
  issues: readonly ValidationIssue[],
): string =>
  '<section class="appeal" data-appeal-form>' +
  '<p class="appeal-stream">Поток: <b>' + STREAM_TITLES[stream] + "</b></p>" +
  '<h1 class="appeal-title">' + STREAM_TITLES[stream] + "</h1>" +
  '<p class="appeal-lede">' + STREAM_NOTES[stream] + "</p>" +
  '<form class="appeal-form" novalidate>' +
  textField("appeal-name", "Как к вам обращаться", draft.name, errorOf(issues, "name")) +
  textField("appeal-contact", "Телефон или электронная почта для ответа", draft.contact, errorOf(issues, "contact")) +
  areaField("appeal-text", "Суть обращения", draft.text, errorOf(issues, "text")) +
  (stream === "official"
    ? checkField("appeal-identified", "Подтверждаю идентификацию отправителя (в рабочей версии — вход через ЕСИА)", draft.identified === true, errorOf(issues, "identified"))
    : "") +
  checkField("appeal-consent", "Согласен на обработку персональных данных", draft.consent, errorOf(issues, "consent")) +
  '<div class="appeal-actions"><button type="submit" class="button">Отправить</button>' +
  '<a class="panel-link" href="#appeal">← Выбрать другой поток</a></div>' +
  "</form>" +
  '<p class="appeal-demo">' + DEMO_NOTE + "</p></section>";

export const renderAppealConfirm = (stream: AppealStream, draft: AppealDraft): string =>
  '<section class="appeal" data-appeal-confirm="' + stream + '">' +
  '<h1 class="appeal-title">' + (stream === "official" ? "Обращение готово к регистрации" : "Сообщение получено как оперативное") + "</h1>" +
  '<p class="appeal-lede">' + nextStepText(stream) + "</p>" +
  (stream === "operational"
    ? '<p class="appeal-warn">Это сообщение <b>не является официальным обращением</b> по 59-ФЗ: юридические сроки на него не распространяются. ' +
      'Если нужен официальный ответ, подайте обращение в официальном потоке.</p>'
    : "") +
  '<dl class="appeal-summary"><dt>От кого</dt><dd>' + esc(draft.name) + "</dd>" +
  "<dt>Ответ куда</dt><dd>" + esc(draft.contact) + "</dd>" +
  "<dt>Текст</dt><dd>" + esc(draft.text) + "</dd></dl>" +
  '<div class="appeal-actions">' +
  (stream === "operational" ? '<a class="button" href="#appeal?stream=official">Подать официальное обращение →</a>' : "") +
  '<a class="panel-link" href="#appeal">← К выбору потока</a></div>' +
  '<p class="appeal-demo">' + DEMO_NOTE + "</p></section>";
