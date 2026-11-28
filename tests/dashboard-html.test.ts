import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { renderDashboard } from "../src/web/dashboard-html.ts";
import { buildOverview } from "../src/web/overview.ts";
import { buildPeriodAnalytics } from "../src/core/analytics/kpi.ts";
import { renderPeriodPanel } from "../src/web/dashboard-period.ts";
import { assignments, graph as fixtureGraph, incidents as fixtureIncidents, lifecycles } from "./kpi-fixture.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const day = "2026-01-02";
const { repository } = createDemoOrgRepository(graph, 7);
const overview = buildOverview(graph, story.incidents, day, repository, 7);
const html = renderDashboard({ overview, days, day });

test("обзор собран по композиции overview.html и показывает 4 KPI", () => {
  expect(html).toContain("data-dashboard");
  expect(html).toContain("kpi-grid");
  expect((html.match(/<ui-kpi/g) ?? []).length).toBe(4);
  expect((html.match(/data-kpi=/g) ?? []).length).toBe(4);
  expect(html).toContain("Активные обращения");
  expect(html).toContain("Требуют внимания");
  expect(html).toContain("На паузе");
  expect(html).toContain("Завершено за период");
  expect(html).toContain("data-day-select");
});

test("переключатель периода показывает 7 и 30 дней и отмечает текущий", () => {
  expect(html).toContain("data-period-switch");
  expect(html).toContain('data-period-button="7"');
  expect(html).toContain('data-period-button="30"');
  expect(html).toContain('aria-pressed="true"');
  const wideOverview = buildOverview(graph, story.incidents, day, repository, 30);
  const wide = renderDashboard({ overview: wideOverview, days, day });
  expect(wide).toContain('data-period-button="30"');
  expect(wide).toContain('aria-pressed="false"');
  expect((wide.match(/data-dynamics-row=/g) ?? []).length).toBe(30);
});

test("карточки KPI несут динамику относительно предыдущего периода", () => {
  expect((html.match(/data-kpi-delta/g) ?? []).length).toBeGreaterThanOrEqual(4);
  expect(/[↑↓→]/.test(html)).toBe(true);
  expect(html).toContain("было ");
  expect(html).toContain("period-notes");
  expect(html).toContain("Как считаем");
});

test("панель динамики показывает по строке на каждый день периода", () => {
  expect(html).toContain("Динамика за период");
  expect((html.match(/data-dynamics-row=/g) ?? []).length).toBe(7);
  expect(html).toContain("data-flow-created");
  expect(html).toContain("data-backlog-delta");
  expect(html).toContain("data-in-time-share");
});

test("период карточек и панели всегда один и тот же", () => {
  const wideOverview = buildOverview(graph, story.incidents, day, repository, 30);
  const wide = renderDashboard({ overview: wideOverview, days, day });
  expect(wideOverview.analytics.period.length).toBe(30);
  expect((wide.match(/data-dynamics-row=/g) ?? []).length).toBe(30);
  expect(wide).toContain("30 дней");
});

test("без данных день показывает корректное состояние и остаётся переключаемым", () => {
  const emptyOverview = buildOverview(graph, story.incidents, "2020-01-01", repository, 7);
  const empty = renderDashboard({ overview: emptyOverview, days, day: "2020-01-01" });
  expect(empty).toContain("нет заявок");
  expect(empty).toContain("data-empty-state");
  expect(empty).toContain("data-period-switch");
  expect(emptyOverview.analytics.snapshot.hasData).toBe(false);
});

test("очередь действий стоит до KPI и ведёт в карточку на выбранную дату", () => {
  const html = renderDashboard({ overview, days, day, historical: true });
  const queueAt = html.indexOf('data-action-queue');
  const kpiAt = html.indexOf('class="kpi-grid"');
  expect(queueAt).toBeGreaterThan(-1);
  expect(queueAt).toBeLessThan(kpiAt);
  expect(html).toContain("Следующие действия");
  expect(html).toContain('data-action-item="З-009"');
  expect(html).toContain('href="#incident/%D0%97-009?at=2026-01-02"');
});

test("мобильный список внимания сворачивает второстепенные данные в раскрываемую плитку", () => {
  expect(html).toContain('class="attention-mobile"');
  expect(html).toContain('data-attention-card="З-009"');
  expect(html).toContain('data-attention-tile="З-009"');
  expect(html).toContain("ул. Школьная");
  expect(html).toContain("Назначение подрядчика");
  expect(html).toContain('href="#incident/%D0%97-009?at=2026-01-02"');
});

test("пустой поток дней даёт состояние «недостаточно данных для динамики»", () => {
  const quiet = buildPeriodAnalytics({ graph: fixtureGraph, incidents: fixtureIncidents, lifecycles, assignments }, "2026-01-16", 7);
  expect(quiet.flow.created).toBe(0);
  expect(quiet.dynamics.reduce((sum, point) => sum + point.created + point.finished, 0)).toBe(0);
  const panel = renderPeriodPanel(quiet, "10 января 2026 — 16 января 2026");
  expect(panel).toContain("Недостаточно данных для динамики");
  expect(panel).not.toContain("data-dynamics-row");
});
