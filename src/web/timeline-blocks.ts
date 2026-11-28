/** Мелкие блоки хронологии (B4): вынесены из timeline-html.ts ради лимита строк. */
import { pluralize } from "../core/text.ts";
import { formatDay } from "../core/timeline.ts";
import type { TimelinePageInput } from "./timeline-html.ts";

/** Заявки, видимые на выбранный день: строки диаграммы. */
export const visibleIds = (input: TimelinePageInput): readonly string[] =>
  input.gantt.rows.map((row) => row.incidentId);

export const renderStats = (input: TimelinePageInput): string => {
  const total = visibleIds(input).length;
  const events = input.events.filter((event) => event.day === input.day).length;
  return (
    '<div class="stats" data-stats>' + formatDay(input.day) + " · заявок на дату: " + total + " (" +
    pluralize(total, "заявка", "заявки", "заявок") + ") · событий: " + events + "</div>"
  );
};

export const renderChips = (input: TimelinePageInput): string => {
  const chips = visibleIds(input)
    .map(
      (id: string) =>
        '<button class="chip' + (input.filter === id ? " on" : "") + '" data-incident-filter="' + id + '">' + id + "</button>",
    )
    .join("");
  return '<div class="chips" data-chips role="group" tabindex="0" aria-label="Заявки на дату: прокручивается по горизонтали">' + chips + "</div>";
};
