import { formatDay } from "../core/timeline.ts";
import type { TimelinePageInput } from "./timeline-html.ts";

export const renderTimeRuler = (input: TimelinePageInput): string => {
  const ticks = input.days
    .map(
      (day, index) =>
        '<button class="ruler-day' + (day === input.day ? " on" : "") + '" data-ruler-day="' + day +
        '" data-ruler-index="' + index + '" title="' + formatDay(day) + '" aria-label="' + day.slice(8) + " · " + formatDay(day) + '"' +
        (day === input.day ? ' aria-current="date"' : "") + ">" + day.slice(8) + "</button>",
    )
    .join("");
  const hours = Array.from({ length: 24 }, (_, hour) =>
    '<span class="ruler-hour" data-ruler-hour="' + hour + '" title="' + String(hour).padStart(2, "0") + ':00"></span>',
  ).join("");
  const share = input.days.length > 1 ? Math.round((Math.max(input.dayIndex, 0) / (input.days.length - 1)) * 100) : 0;
  return (
    '<div class="ruler" data-ruler>' +
    '<div class="ruler-head"><span class="hint">Шкала времени: сутки и часы выбранного дня</span>' +
    '<b data-ruler-label>' + formatDay(input.day) + "</b></div>" +
    '<div class="ruler-scroll"><div class="ruler-track">' +
    '<div class="ruler-days">' + ticks + "</div>" +
    '<div class="ruler-hours">' + hours + "</div>" +
    '<div class="ruler-marker" data-ruler-marker style="left:' + share + '%"></div>' +
    "</div></div>" +
    "</div>"
  );
};
