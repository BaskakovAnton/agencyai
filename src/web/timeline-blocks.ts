/** Мелкие блоки хронологии (B4): вынесены из timeline-html.ts ради лимита строк. */
import type { GitModel } from "../core/gitgraph.ts";
import type { GanttModel } from "../core/gantt.ts";
import { formatDay } from "../core/timeline.ts";
import { pluralize } from "../core/text.ts";
import type { TimelinePageInput } from "./timeline-html.ts";

/** Заявки, видимые в текущем виде: граф или Гант. */
export const visibleIds = (input: { readonly view: TimelinePageInput["view"]; readonly git: GitModel; readonly gantt: GanttModel }): readonly string[] =>
  input.view === "gantt" ? input.gantt.rows.map((row) => row.incidentId) : input.git.incidents;

export const renderStats = (input: TimelinePageInput): string => {
  const total = visibleIds(input).length;
  return (
    '<div class="stats" data-stats>' + formatDay(input.day) + " · заявок на дату: " + total + " (" +
    pluralize(total, "заявка", "заявки", "заявок") + ") · узлов " + input.git.columns.length + "</div>"
  );
};

export const renderChips = (input: TimelinePageInput): string => {
  const ids = visibleIds(input);
  const chips = ids
    .map(
      (id: string) =>
        '<button class="chip' + (input.filter === id ? " on" : "") + '" data-incident-filter="' + id + '">' + id + "</button>",
    )
    .join("");
  return '<div class="chips" data-chips role="group" tabindex="0" aria-label="Заявки на дату: прокручивается по горизонтали">' + chips + "</div>";
};
