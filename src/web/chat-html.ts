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
  /** Название текущего узла — по спеке в шапке «U1 Подача обращения». */
  readonly nodeTitle: string;
  /** Фаза SLA на выбранную дату. */
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

/** Пузыри переписки: свои сообщения справа, чужие слева, системные — по центру. */
export const renderMessages = (snapshot: ChatSnapshot, activeRole: RoleId): string => {
  if (snapshot.messages.length === 0) {
    return '<p class="hint" data-empty>На эту дату переписки ещё нет — заявка появится позже.</p>';
  }
  let previousDay = "";
  return snapshot.messages
    .map((message) => {
      const separator = message.day === previousDay ? "" : '<div class="day-sep">' + formatDay(message.day) + "</div>";
      previousDay = message.day;
      if (message.kind === "system") {
        return separator + '<div class="msg system" data-msg data-role="system" data-day="' + message.day + '">' +
          '<div class="bubble">' + escapeHtml(message.text) + "</div></div>";
      }
      const own = message.role === activeRole;
      return (
        separator +
        '<div class="msg ' + (own ? "own" : "other") + '" data-msg data-role="' + message.role +
        '" data-day="' + message.day + '" data-node="' + message.nodeId + '">' +
        '<span class="avatar" style="background:' + ROLE_COLORS[message.role] + '">' + ROLE_SHORT[message.role] + "</span>" +
        '<div class="bubble"><span class="author">' + escapeHtml(message.author) + "</span>" +
        '<span class="text">' + escapeHtml(message.text) + "</span>" +
        '<span class="time">' + formatStamp(message.at) + "</span></div></div>"
      );
    })
    .join("");
};

/** Мобильный чат: макет телефона, без полей ввода — переписка только читается. */
export const renderPhone = (input: PhoneInput): string => {
  const { incident, snapshot } = input;
  return [
    '<div class="phone" data-phone>',
    '<div class="phone-top" data-role="' + input.activeRole + '" style="--role-color:' + ROLE_COLORS[input.activeRole] + '">',
    '<a class="phone-back" data-back href="' + input.backHref + '">‹ Хронология</a>',
    '<div class="phone-inc"><b>' + incident.id + "</b> " + escapeHtml(incident.title) + "</div>",
    '<div class="phone-sub">' + escapeHtml(incident.address) + " · " + PRIORITY_TITLES[incident.priority] +
      " · узел " + snapshot.nodeId + " " + escapeHtml(input.nodeTitle) + "</div>",
    '<div class="phone-date" data-chat-date>Переписка на ' + formatDay(snapshot.day) + "</div>",
    "</div>",
    '<div class="phone-roles">',
    '<span>Вы общаетесь как: <b data-role-badge>' + ROLE_NAMES[input.activeRole] + "</b></span>",
    '<span>Собеседник: <b data-interlocutor>' + ROLE_NAMES[input.interlocutor] + "</b></span>",
    '<span class="sla-badge" data-sla="' + input.slaPhase + '" style="color:' + SLA_COLORS[input.slaPhase] +
      '">SLA: ' + SLA_PHASE_TITLES[input.slaPhase] + "</span>",
    input.overridden ? '<span class="hint" data-sim>режим симуляции: роль выбрана вручную</span>' : "",
    "</div>",
    '<div class="phone-body" data-messages>' + renderMessages(snapshot, input.activeRole) + "</div>",
    '<div class="phone-actions">',
    '<button data-action="prev-msg"' + (input.prevDay === "" ? " disabled" : "") + ">‹ Реплика назад</button>",
    '<button data-action="next-msg"' + (input.nextDay === "" ? " disabled" : "") + ">Следующая реплика ›</button>",
    '<button data-action="cycle-role">Сменить роль (симуляция)</button>',
    "</div>",
    '<div class="phone-foot">Демонстрация: сообщения только читаются, отправка недоступна</div>',
    "</div>",
  ].join("");
};

/** Компактная панель чата рядом с графом на широком экране. */
export const renderInlineChat = (incident: Incident, snapshot: ChatSnapshot, href: string): string =>
  '<aside class="inline-chat" data-inline-chat>' +
  '<div class="inline-head"><b>' + incident.id + "</b> " + escapeHtml(incident.title) +
  '<span class="hint"> на ' + formatDay(snapshot.day) + "</span></div>" +
  '<div class="inline-body">' + renderMessages(snapshot, snapshot.activeRole) + "</div>" +
  '<a class="inline-link" href="' + href + '">Открыть мобильный чат этой заявки →</a>' +
  "</aside>";
