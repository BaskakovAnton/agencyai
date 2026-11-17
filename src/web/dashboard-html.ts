import { formatDay } from "../core/timeline.ts";
import { hrefIncident, hrefIncidents, hrefTimeline } from "./router.ts";
import type { DayChip, Overview } from "./overview.ts";

export interface DashboardInput {
  readonly overview: Overview;
  readonly days: readonly string[];
  readonly day: string;
}

const num = (value: number): string => String(value).replace(".", ",");
const info = '<span class="info" aria-hidden="true">i</span>';

const kpi = (key: string, label: string, value: string, hint: string): string =>
  '<article class="kpi" data-kpi="' + key + '"><span class="kpi-top">' + label +
  '</span><b class="kpi-value">' + value + '</b><span class="kpi-foot">' + hint + "</span></article>";

const daySelect = (days: readonly string[], day: string): string =>
  '<label class="hint">Срез: <select data-day-select>' +
  days.map((value) => '<option value="' + value + '"' + (value === day ? " selected" : "") + ">" + formatDay(value) + "</option>").join("") +
  "</select></label>";

const dayStrip = (chips: readonly DayChip[], day: string): string =>
  '<div class="weeks" data-day-strip>' +
  chips
    .map(
      (chip) =>
        '<button class="week' + (chip.day === day ? " selected" : "") + '" data-day-chip="' + chip.day +
        '" aria-pressed="' + String(chip.day === day) + '"><span class="week-day">' + chip.label +
        '</span><span class="week-dot" aria-hidden="true"></span><b>' + chip.total +
        '</b><span class="week-sub">внимание: ' + chip.attention + "</span></button>",
    )
    .join("") +
  "</div>";

const chart = (overview: Overview): string => {
  const max = Math.max(1, ...overview.daily.map((bar) => bar.total));
  const cols = overview.daily
    .map((bar) => {
      const height = Math.round((bar.total / max) * 100);
      const overdue = bar.total === 0 ? 0 : Math.round((bar.overdue / bar.total) * 100);
      return (
        '<div class="chart-col"><div class="chart-stack" style="height:' + Math.max(6, height) + '%">' +
        (overdue > 0 ? '<div class="chart-loss" style="height:' + overdue + '%" aria-hidden="true"></div>' : "") +
        '</div><span class="chart-label">' + bar.label + '</span><b class="chart-value">' + bar.total + "</b></div>"
      );
    })
    .join("");
  return (
    '<div class="chart-legend"><span class="legend-dot chart-legend-total" aria-hidden="true"></span>всего заявок' +
    '<span class="legend-dot chart-legend-loss" aria-hidden="true"></span>из них просрочено</div>' +
    '<div class="chart-wrap" data-daily-chart role="img" aria-label="Заявки по дням: ' +
    overview.daily.map((bar) => bar.label + " — " + bar.total).join("; ") + '">' + cols + "</div>"
  );
};

const matrix = (overview: Overview): string => {
  const head =
    "<tr><th scope=\"col\">Приоритет</th><th scope=\"col\">Метрика</th>" +
    overview.days.map((chip) => '<th scope="col">' + chip.label + "</th>").join("") +
    '<th scope="col">Δ за 6 дней</th></tr>';
  const rows = overview.matrix
    .map(
      (row) =>
        '<tr data-matrix-row="' + row.id + '"><td class="metric-name">' + row.title + "</td>" +
        '<td class="muted">' + row.metric + "</td>" +
        row.values.map((value) => '<td class="metric-value">' + num(value) + "</td>").join("") +
        '<td class="' + (row.delta < 0 ? "down" : "up") + '"><span aria-hidden="true">' + (row.delta < 0 ? "↓" : "↑") +
        "</span> " + (row.delta > 0 ? "+" : "") + num(row.delta) + " п.п.</td></tr>",
    )
    .join("");
  return (
    '<div class="table-wrap" tabindex="0" role="region" aria-label="Матрица SLA: таблица прокручивается по горизонтали"><table class="matrix-table" data-sla-matrix>' +
    '<caption class="sr-only">Доля заявок в срок по приоритетам и дням среза</caption>' +
    "<thead>" + head + "</thead><tbody>" + rows + "</tbody></table></div>"
  );
};

/** Экран «Обзор»: композиция эталона DarkStore, данные — из модели процессов. */
export const renderDashboard = (input: DashboardInput): string => {
  const { overview } = input;
  if (overview.kpi.total === 0) {
    return (
      '<section class="dashboard" data-dashboard>' +
      '<div class="dashboard-head">' + daySelect(input.days, input.day) +
      '<a href="' + hrefIncidents(input.day) + '">Все обращения →</a></div>' +
      '<p class="hint">В этом срезе нет заявок — выберите другую дату.</p>' +
      "</section>"
    );
  }

  const kpis =
    '<div class="kpis">' +
    kpi("total", "Всего заявок", String(overview.kpi.total), "в срезе на " + formatDay(overview.day)) +
    kpi("attention", "Требуют внимания", String(overview.kpi.attention), "просрочка или срочная") +
    kpi("paused", "На паузе SLA", String(overview.kpi.paused), "ожидают внешних условий") +
    kpi("overdue", "Просрочено", String(overview.kpi.overdue), "выход за норматив") +
    "</div>";

  const okShare = Math.round((overview.kpi.ok / overview.kpi.total) * 100);
  const summary =
    '<div class="summary-list" data-summary>' +
    overview.summary
      .map((item) => '<div class="summary-item"><span class="check" aria-hidden="true">✓</span>' + item + "</div>")
      .join("") +
    "</div>" +
    '<div class="progress-head"><span>В срок</span><b>' + okShare + '%</b></div>' +
    '<div class="progress" role="img" aria-label="Доля заявок в срок: ' + okShare + '%"><span style="width:' + okShare + '%"></span></div>';

  const attention =
    overview.attention.length === 0
      ? '<p class="hint">Нет заявок, требующих внимания.</p>'
      : '<ul class="attention-list" data-attention>' +
        overview.attention
          .map(
            (item) =>
              '<li><a href="' + hrefIncident(item.id, input.day) + '"><b>' + item.id + "</b> " + item.title + "</a>" +
              '<span class="hint">' + item.nodeId + " " + item.nodeTitle + " · " + item.reason + "</span></li>",
          )
          .join("") +
        "</ul>";

  const groups =
    '<div class="operations" data-group-tiles>' +
    overview.groups
      .map(
        (group) =>
          '<a class="op" data-group-tile="' + group.id + '" href="' + hrefIncidents(input.day) + '">' +
          '<span class="op-icon" aria-hidden="true">◆</span><span class="op-body"><b>' + group.title + "</b>" +
          '<span class="op-sub">' + group.nodes + " узлов · заявок: " + group.incidents + "</span></span></a>",
      )
      .join("") +
    "</div>";

  const workflow =
    '<div class="workflow" data-workflow>' +
    overview.workflow
      .map(
        (step) =>
          '<div class="workflow-step' + (step.current ? " step-current" : "") + '">' +
          '<span class="step-number" aria-hidden="true">' + step.n + "</span>" +
          "<span><b>" + step.title + '</b><span class="step-detail">' + step.detail + "</span></span>" +
          '<span class="count">' + step.count + "</span></div>",
      )
      .join("") +
    "</div>";

  return (
    '<section class="dashboard" data-dashboard>' +
    '<div class="dashboard-head">' + daySelect(input.days, input.day) +
    '<a href="' + hrefIncidents(input.day) + '">Все обращения →</a>' +
    '<a href="' + hrefTimeline(input.day, "git") + '">Хронология на эту дату →</a></div>' +

    '<div class="grid overview-row">' +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">Обзор среза ' + info +
    '</h2><span class="footnote">' + formatDay(overview.day) + "</span></div>" + kpis + "</article>" +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">Шесть дней среза ' + info +
    '</h2><a class="text-link" href="' + hrefIncidents(input.day) + '">Подробнее →</a></div>' +
    dayStrip(overview.days, overview.day) +
    '<p class="footnote">Окно анализа заканчивается выбранной датой</p></article>' +
    "</div>" +

    '<div class="grid middle-row section-gap">' +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">Направления процесса ' + info +
    "</h2></div>" + groups + "</article>" +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">Заявки по дням ' + info +
    "</h2></div>" + chart(overview) + "</article>" +
    "</div>" +

    '<div class="grid matrix-row section-gap">' +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">Матрица SLA ' + info +
    "</h2></div>" + matrix(overview) + "</article>" +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">' +
    '<span class="title-glyph" aria-hidden="true">▥</span> Сводка результатов</h2></div>' + summary + "</article>" +
    "</div>" +

    '<div class="grid bottom-row section-gap">' +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">Ход процесса ' + info +
    "</h2></div>" + workflow + "</article>" +
    '<article class="card card-pad"><div class="card-head"><h2 class="card-title">Требуют внимания ' + info +
    "</h2></div>" + attention + "</article>" +
    '<article class="card card-pad project-card"><div class="card-head"><h2 class="card-title">' +
    '<span class="title-glyph" aria-hidden="true">▱</span> Правила и данные</h2></div>' +
    '<div class="project-meta"><span>Нормативы: авария 1/24 ч · неотложное 24/72 ч · сезонное до 720 ч</span>' +
    "<span>Пауза SLA: погода, нет доступа, согласования, финансы</span>" +
    "<span>Архив закрытых обращений — 5 лет, удаление запрещено</span>" +
    "<span>Права ролей проверяются на каждом переходе</span></div>" +
    '<p class="footnote">Демонстрационные данные модели процессов</p></article>' +
    "</div>" +
    "</section>"
  );
};
