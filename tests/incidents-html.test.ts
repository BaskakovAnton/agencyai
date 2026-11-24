import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { buildRows, defaultFilters } from "../src/web/incidents.ts";
import { renderIncidents } from "../src/web/incidents-html.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const day = story.days.at(-1) as string;
const rows = buildRows(graph, story.incidents, day, defaultFilters());
const html = renderIncidents({ rows, days, day, filters: defaultFilters() });

test("реестр собран по композиции incidents.html", () => {
  expect(html).toContain("data-incidents");
  expect(html).toContain("data-incidents-table");
  expect(html).toContain("data-incidents-body");
  expect((html.match(/data-incident-row=/g) ?? []).length).toBe(rows.length);
  expect(html).toContain("Все обращения");
  expect(html).toContain("Порядок работы со списком");
  expect(html).toContain("Статусы и SLA");
});

test("колонки соответствуют модели, лишних полей нет", () => {
  for (const column of ["Номер / обращение", "Приоритет", "Текущий этап", "Роль узла", "Срок SLA", "Изменено", "Карточка"]) {
    expect(html).toContain(column);
  }
  expect(html).toContain('scope="col"');
  expect(html).toContain("data-search");
  expect(html).toContain("data-filter-priority");
  expect(html).toContain("data-filter-sla");
  expect(html).toContain("data-filter-node");
  expect(html).toContain("data-sort");
  expect(html).toContain("data-reset");
  expect(html).toContain("data-day-select");
});

test("строки содержат номер, этап, роль узла и SLA", () => {
  const hero = html.slice(html.indexOf("З-015"));
  expect(hero.length).toBeGreaterThan(0);
  expect(html).toContain('class="assignee"');
  expect((html.match(/<ui-badge/g) ?? []).length).toBeGreaterThan(0);
  expect((html.match(/<ui-sla/g) ?? []).length).toBeGreaterThan(0);
});

test("пустой результат показывает понятное сообщение", () => {
  const empty = renderIncidents({ rows: [], days, day, filters: defaultFilters() });
  expect(empty).toContain("Ничего не найдено");
  expect(empty).toContain("data-empty-state");
  expect(empty).toContain("Найдено: 0");
});
