import { formatDay } from "../core/timeline.ts";
import { defaultFilters, filtersHash } from "./incidents.ts";
import { esc, renderBadge, renderEmptyState, renderKpi, renderPanel, renderSlaBadge, type KpiDeltaView } from "./components.ts";
import { renderPeriodNotes, renderPeriodPanel, renderPeriodSwitch } from "./dashboard-period.ts";
import { historicalIndicator } from "./historical.ts";
import { periodEndingAt } from "./periods-reexport.ts";
import { hrefIncident, hrefIncidents, hrefTimeline } from "./router.ts";
import type { Overview } from "./overview.ts";

export interface DashboardInput {
  readonly overview: Overview;
  readonly days: readonly string[];
  readonly day: string;
  /** Исторический срез: показывается единый индикатор. */
  readonly historical?: boolean;
}

const daySelect = (days: readonly string[], day: string): string =>
  '<label class="hint">Срез: <select data-day-select aria-label="Дата среза">' +
  days.map((value) => '<option value="' + value + '"' + (value === day ? " selected" : "") + ">" + formatDay(value) + "</option>").join("") +
  "</select></label>";

/** Контекстная ссылка в реестр на выбранную дату: канонический URL-контракт UX-3.2.1. */
const registryHref = (overview: Overview, patch: Partial<ReturnType<typeof defaultFilters>>): string =>
  filtersHash({ ...defaultFilters(), ...patch }, overview.day);

/** Динамика KPI относительно предыдущего равного периода. */
const deltaFor = (overview: Overview, id: string): KpiDeltaView | undefined => {
  const kpi = overview.analytics.kpis.find((item) => item.id === id);
  const delta = kpi?.delta;
  if (!kpi || !delta) return undefined;
  const arrow = delta.change > 0 ? "↑ " : delta.change < 0 ? "↓ " : "→ ";
  return {
    text: arrow + delta.text,
    tone: delta.sentiment,
    title: kpi.title + ": было " + delta.previous + " → стало " + delta.current + " (" + kpi.comparison + ")",
  };
};

const kpiIcon = (glyph: string, tone: string): string =>
  '<span class="kpi-icon' + (tone === "" ? "" : " " + tone) + '" aria-hidden="true">' + glyph + "</span>";

const attentionRows = (overview: Overview): string =>
  overview.attention.length === 0
    ? '<tr><td colspan="4">' + renderEmptyState("Нет обращений, требующих внимания") + "</td></tr>"
    : overview.attention
        .map((item) =>
          '<tr class="click-row" data-attention="' + item.id + '"><td><div class="case-id">' + item.id +
          '</div><div class="case-title">' + item.title + '</div><div class="case-sub">' + item.address + "</div></td>" +
          "<td>" + renderBadge(item.priorityTitle, item.priorityTone) + "</td>" +
          "<td>" + (item.departmentName === "" ? '<span class="muted">Нет данных</span>' : item.departmentName) +
          '<div class="case-sub">' + item.nodeId + " · " + item.nodeTitle + "</div></td>" +
          "<td>" + renderSlaBadge(item.slaText, item.slaTone) + "</td>" +
          '<td><a class="panel-link" href="' + hrefIncident(item.id, overview.day) + '">Открыть →</a></td></tr>',
        )
        .join("");

const activityRows = (overview: Overview): string =>
  overview.events.length === 0
    ? renderEmptyState("Событий в этом срезе нет")
    : '<div class="activity-list">' +
      overview.events
        .map(
          (row) =>
            '<ui-activity class="activity"><span class="activity-icon" aria-hidden="true">' + row.icon + "</span>" +
            '<div><div class="activity-text"><b>' + row.id + "</b> " + row.text.replace(row.id + " ", "") +
            '</div><div class="activity-time">' + row.time + "</div></div></ui-activity>",
        )
        .join("") +
      "</div>";

const distributionRows = (overview: Overview): string =>
  '<div class="legend">' +
  overview.distribution
    .map((row) => '<div class="legend-item">' + renderBadge(row.title, row.tone) + "<b>" + row.count + "</b></div>")
    .join("") +
  "</div>" +
  (overview.org === null || overview.org.departments.length === 0
    ? ""
    : '<p class="fact-label section-gap">Ответственные подразделения</p>' +
      '<div class="legend legend-single" data-department-split>' +
      overview.org.departments
        .map(
          (row) =>
            // Подразделение — контекстная ссылка на свой список обращений на ту же дату.
            '<div class="legend-item"><a class="panel-link" data-department-link="' + row.departmentId +
            '" href="' + registryHref(overview, { department: row.departmentId }) + '" data-department="' + row.departmentId + '">' +
            esc(row.name) + "</a><b>" + row.count + "</b></div>",
        )
        .join("") +
      "</div>");

const slaRows = (overview: Overview): string =>
  overview.sla
    .map(
      (row) =>
        '<div class="sla-row"><div class="sla-row-head"><span class="muted">' + row.title + "</span><b>" + row.share +
        '%</b></div><div class="progress" role="img" aria-label="' + row.title + ": " + row.share + '%"><span class="progress-' +
        row.id + '" style="width:' + row.share + '%"></span></div></div>',
    )
    .join("") +
  (overview.org === null
    ? ""
    // Счётчик = число строк view=review на ту же дату; значение ведёт в очередь.
    : '<div class="sla-row-head section-gap"><span class="muted">Ждут подтверждения</span>' +
      '<a class="panel-link" data-waiting-review href="' + registryHref(overview, { view: "review" }) + '">' +
      overview.org.waitingForReview + "</a></div>") +
  '<p class="readonly">Формулы: «активные» — незавершённые заявки среза, «требуют внимания» — просроченный SLA или срочная незавершённая, «в срок» — доля без просрочки и паузы. Считаются только из модели.</p>';

/** Экран «Обзор» по композиции overview.html. */
export const renderDashboard = (input: DashboardInput): string => {
  const { overview } = input;
  // Период берётся только из аналитики: карточки и график не могут расходиться.
  const period = overview.analytics.period.length;
  if (overview.kpi.total === 0) {
    return (
      '<section class="dashboard" data-dashboard>' +
      '<div class="toolbar">' + daySelect(input.days, input.day) + renderPeriodSwitch(period) + "</div>" +
      (input.historical === true ? historicalIndicator(input.day, input.days) : "") +
      renderEmptyState("В этом срезе нет заявок — выберите другую дату.") +
      "</section>"
    );
  }

  const kpis =
    '<div class="kpi-grid">' +
    renderKpi("Активные обращения", String(overview.kpi.active), "не завершены в срезе", kpiIcon("▤", ""), "active", deltaFor(overview, "active"), registryHref(overview, { view: "active" })) +
    renderKpi(
      "Требуют внимания",
      String(overview.kpi.attention),
      "в том числе " + overview.atRisk + " с риском SLA",
      kpiIcon("!", "danger"),
      "attention",
      deltaFor(overview, "attention"),
      registryHref(overview, { view: "attention" }),
    ) +
    renderKpi("На паузе", String(overview.kpi.paused), "ожидают условия возобновления", kpiIcon("Ⅱ", "warning"), "paused", deltaFor(overview, "paused"), registryHref(overview, { view: "paused" })) +
    renderKpi(
      "Завершено за период",
      String(overview.analytics.flow.finished),
      "подтверждено " + overview.analytics.flow.approved,
      kpiIcon("✓", "success"),
      "completed",
      deltaFor(overview, "finished"),
    ) +
    "</div>";

  const attention =
    '<div class="table-wrap" tabindex="0" role="region" aria-label="Требуют внимания: таблица прокручивается по горизонтали">' +
    '<table class="data-table"><caption class="sr-only">Обращения, требующие внимания</caption><thead><tr>' +
    '<th scope="col">Обращение</th><th scope="col">Приоритет</th><th scope="col">Подразделение</th><th scope="col">SLA</th><th scope="col">Карточка</th>' +
    "</tr></thead><tbody>" + attentionRows(overview) + "</tbody></table></div>";

  return (
    '<section class="dashboard" data-dashboard>' +
    '<div class="toolbar">' + daySelect(input.days, input.day) + renderPeriodSwitch(period) +
    '<span class="grow"></span><span class="count">' + overview.kpi.total + " обращений в срезе</span>" +
    '<a class="panel-link" href="' + hrefIncidents(input.day) + '">Все обращения →</a>' +
    '<a class="panel-link" href="' + hrefTimeline(input.day, "git") + '">Хронология →</a></div>' +
    (input.historical === true ? historicalIndicator(input.day, input.days) : "") +
    kpis +
    renderPanel({
      title: "Требуют внимания",
      subtitle: "Обращения, по которым нужно проверить следующий шаг",
      // Переход сохраняет контекст панели: список именно требующих внимания.
      actions: '<a class="panel-link" href="' + registryHref(overview, { view: "attention" }) + '">Все обращения →</a>',
      body: attention,
    }) +
    '<div class="two-col section-gap">' +
    renderPanel({ title: "Последние события", subtitle: "Переходы по узлам в выбранном срезе", body: activityRows(overview) }) +
    renderPanel({ title: "Распределение обращений", subtitle: "По приоритетам", body: distributionRows(overview) }) +
    "</div>" +
    '<div class="section-gap">' +
    renderPanel({ title: "Контроль сроков", subtitle: "SLA по открытым обращениям", body: slaRows(overview) }) +
    "</div>" +
    '<div class="section-gap">' +
    renderPeriodPanel(
      overview.analytics,
      formatDay(overview.analytics.period.fromDay) + " — " + formatDay(overview.analytics.period.toDay),
    ) +
    renderPeriodNotes(overview.analytics) +
    "</div>" +
    "</section>"
  );
};