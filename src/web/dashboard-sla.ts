import { esc } from "./components.ts";
import { renderRing, ringShares } from "./radial-ring.ts";
import type { Overview } from "./overview-types.ts";

/** Тело панели «Контроль сроков»: кольцо фаз SLA и текстовая легенда (вариант A, вместо полос). */
export const renderSlaControl = (overview: Overview, reviewHref: string): string => {
  const segments = overview.sla.map((row) => ({ id: row.id, title: row.title, value: row.count }));
  const shares = ringShares(segments);
  const legend =
    '<ul class="ring-legend" data-sla-legend>' +
    shares
      .map(
        (item) =>
          '<li data-sla-seg="' + item.id + '"><span class="dot dot-' + item.id + '"></span>' +
          '<span class="ring-legend-title">' + esc(item.title) + "</span>" +
          '<span class="ring-legend-count" data-sla-count="' + item.id + '">' + item.value + "</span>" +
          '<span class="ring-legend-share">' + item.share + "%</span></li>",
      )
      .join("") +
    "</ul>";
  return (
    '<div class="sla-control">' +
    renderRing({ segments, centerValue: String(overview.kpi.total), centerLabel: "в срезе" }) +
    legend +
    "</div>" +
    (overview.org === null
      ? ""
      : '<div class="sla-row-head section-gap"><span class="muted">Ждут подтверждения</span>' +
        '<a class="panel-link" data-waiting-review href="' + reviewHref + '">' + overview.org.waitingForReview + "</a></div>") +
    '<p class="readonly">Формулы: «активные» — незавершённые заявки среза, «требуют внимания» — просроченный SLA или срочная незавершённая, «в срок» — доля без просрочки и паузы. Считаются только из модели.</p>'
  );
};
