import type { DurationReport } from "../core/analytics/durations.ts";
import { renderPanel } from "./components.ts";

const format = (hours: number | null): string => (hours === null ? "Нет данных" : hours + " ч");

/** Длительности обращения: два независимых потока времени (UX-3.2.5, DEC-06). */
export const durationsBlock = (report: DurationReport): string =>
  renderPanel({
    title: "Длительности",
    subtitle: "Этапы процесса и жизненный цикл подтверждения считаются раздельно",
    body:
      '<div class="durations" data-durations>' +
      '<div class="fact" data-duration-stage><div class="fact-label">Время по этапам процесса</div><b>' + format(report.stageHours) +
      "</b>" +
      (report.stage.hours === null
        ? '<div class="muted">Часть переходов без времени — итог не считается.</div>'
        : '<div class="muted">Интервалов: ' + report.stage.intervals.length + "</div>") +
      "</div>" +
      '<div class="fact" data-duration-lifecycle><div class="fact-label">Время жизненного цикла</div><b>' + format(report.lifecycleHours) +
      "</b>" +
      (report.lifecycle.hours === null
        ? '<div class="muted">Журнал короче двух записей — интервал не определён.</div>'
        : '<div class="muted">Записей журнала: ' + (report.lifecycle.intervals.length + 1) + "</div>") +
      "</div></div>",
  });
