import type { ChatSnapshot } from "../core/conversation.ts";
import { SLA_PHASE_TITLES, type SlaPhase } from "../core/sla-at.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { formatDay, formatStamp } from "../core/timeline.ts";
import type { Incident, Priority, RoleId } from "../types.ts";
import { ROLE_COLORS, ROLE_SHORT, SLA_COLORS } from "./theme.ts";

export interface PhoneInput {
  readonly incident: Incident;
  readonly snapshot: ChatSnapshot;
  readonly activeRole: RoleId;
  readonly interlocutor: RoleId;
  readonly overridden: boolean;
  readonly backHref: string;
  readonly nextDay: string;
  readonly prevDay: string;
  readonly nodeTitle: string;
  readonly slaPhase: SlaPhase;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

const PRIORITY_TITLES: Readonly<Record<Priority, string>> = {
  urgent: "авария / экстренно",
  normal: "неотложное",
  routine: "обычное",
  none: "вне SLA",
};

const initials = (name: string): string =>
  name.split(/[\s-]+/).filter((part) => part.length > 0).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");

/** Сообщения по композиции chat.html: пузыри с мини-аватаром, мета и системные пометки. */
export const renderMessages = (snapshot: ChatSnapshot, activeRole: RoleId): string => {
  if (snapshot.messages.length === 0) {
    return '<p class="empty-state" data-empty>На эту дату переписки ещё нет — заявка появится позже.</p>';
  }
  let previousDay = "";
  return snapshot.messages
    .map((message) => {
      const separator = message.day === previousDay ? "" : '<div class="day-sep">' + formatDay(message.day) + "</div>";
      previousDay = message.day;
      if (message.kind === "system") {
        return separator + '<ui-chat-message class="chat-message" data-msg data-role="system" data-day="' + message.day + '">' +
          '<div class="system-note">' + escapeHtml(message.text) + " · " + formatStamp(message.at) + "</div></ui-chat-message>";
      }
      const own = message.role === activeRole;
      const avatar = '<span class="mini-avatar" style="background:' + ROLE_COLORS[message.role] + ';color:var(--avatar-text)" aria-hidden="true">' +
        initials(ROLE_NAMES[message.role]) + "</span>";
      const bubble = '<div class="bubble"><b>' + escapeHtml(message.author) +
        ' · <span data-role-label>' + ROLE_NAMES[message.role] + "</span></b><br>" + escapeHtml(message.text) +
        '<div class="bubble-meta">' + formatStamp(message.at) + " · " + message.nodeId + " " + escapeHtml(message.day === "" ? "" : message.nodeId) + "</div></div>";
      return (
        separator +
        '<ui-chat-message class="chat-message ' + (own ? "own" : "other") + '" data-msg data-role="' + message.role + '" data-day="' + message.day +
        '" data-node="' + message.nodeId + '">' +
        '<div class="bubble-row' + (own ? " mine" : "") + '">' + avatar + bubble + "</div></ui-chat-message>"
      );
    })
    .join("");
};

/** Окно переписки: та же функциональность, оформление по chat.html. */
export const renderPhone = (input: PhoneInput): string => {
  const { incident, snapshot } = input;
  return [
    '<div class="chat-window phone" data-phone>',
    '<div class="chat-head phone-top" data-role="' + input.activeRole + '" style="--role-color:' + ROLE_COLORS[input.activeRole] + '">',
    '<a class="button" data-back href="' + input.backHref + '">‹ Хронология</a>',
    '<div class="chat-person"><span class="avatar" aria-hidden="true">' + initials(incident.id) + "</span><div>" +
      "<strong>" + incident.id + " · " + escapeHtml(incident.title) + "</strong>" +
      '<small class="muted">' + escapeHtml(incident.address) + " · " + PRIORITY_TITLES[incident.priority] +
      " · узел " + snapshot.nodeId + " " + escapeHtml(input.nodeTitle) + "</small></div></div>",
    '<span class="sla-badge" data-sla="' + input.slaPhase + '" style="color:' + SLA_COLORS[input.slaPhase] + '">SLA: ' +
      SLA_PHASE_TITLES[input.slaPhase] + "</span>",
    "</div>",
    '<div class="chat-roles phone-roles">',
    '<span class="muted">Вы общаетесь как: <b data-role-badge>' + ROLE_NAMES[input.activeRole] + "</b></span>",
    '<span class="muted">Собеседник: <b data-interlocutor>' + ROLE_NAMES[input.interlocutor] + "</b></span>",
    '<span class="muted" data-chat-date>Переписка на ' + formatDay(snapshot.day) + "</span>",
    input.overridden ? '<span class="muted" data-sim>режим симуляции: роль выбрана вручную</span>' : "",
    "</div>",
    '<p class="read-only-notice" data-readonly>Только чтение: отправка сообщений недоступна.</p>',
    '<div class="chat-body phone-body" data-messages>' + renderMessages(snapshot, input.activeRole) + "</div>",
    '<div class="chat-controls phone-actions">',
    '<button class="button" data-action="prev-msg"' + (input.prevDay === "" ? " disabled" : "") + ">‹ Реплика назад</button>",
    '<button class="button" data-action="next-msg"' + (input.nextDay === "" ? " disabled" : "") + ">Следующая реплика ›</button>",
    "</div>",
    '<p class="panel-foot muted">Демонстрация: сообщения только читаются, отправка недоступна</p>',
    "</div>",
  ].join("");
};

/** Компактная панель переписки рядом с графом. */
export const renderInlineChat = (incident: Incident, snapshot: ChatSnapshot, href: string): string =>
  '<aside class="inline-chat" data-inline-chat>' +
  '<div class="inline-head"><b>' + incident.id + "</b> " + escapeHtml(incident.title) +
  '<span class="muted"> на ' + formatDay(snapshot.day) + "</span></div>" +
  '<div class="inline-body">' + renderMessages(snapshot, snapshot.activeRole) + "</div>" +
  '<a class="panel-link" href="' + href + '">Открыть мобильный чат этой заявки →</a>' +
  "</aside>";
