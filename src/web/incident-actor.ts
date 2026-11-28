/**
 * Переходы карточки обращения к связанным представлениям.
 * Выделено из incident-html.ts (лимит 200 строк); задел под UX-3.2.5 («Действует сейчас»). Поведение не менялось.
 */
import { hrefChat, hrefIncidents, hrefTimeline } from "./router.ts";
import type { IncidentView } from "./incident.ts";

export const linksBlock = (view: IncidentView, day: string): string =>
  '<div class="stack">' +
  '<a class="button" href="' + hrefTimeline(day, "gantt") + '">Открыть в хронологии →</a>' +
  '<a class="button" href="' + hrefChat(view.id, day) + '">Открыть переписку →</a>' +
  '<a class="button" href="' + hrefIncidents(day) + '">Все обращения →</a></div>';
