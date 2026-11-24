import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { buildRows, defaultFilters } from "../src/web/incidents.ts";
import { renderIncidents } from "../src/web/incidents-html.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const { repository } = createDemoOrgRepository(graph, 7);
const days = story.days;
const day = story.days.at(-1) as string;
const rows = buildRows(graph, story.incidents, day, defaultFilters(), repository);
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
  for (const column of ["Номер / обращение", "Приоритет", "Текущий этап", "Подразделение", "Срок SLA", "Изменено", "Карточка"]) {
    expect(html).toContain(column);
  }
  expect(html).not.toContain("Роль узла");
  expect(html).toContain('scope="col"');
  for (const hook of ["data-search", "data-filter-priority", "data-filter-sla", "data-filter-node", "data-sort", "data-filter-review", "data-reset", "data-day-select"]) {
    expect(html).toContain(hook);
  }
});

test("строки содержат номер, этап, подразделение и SLA", () => {
  const hero = html.slice(html.indexOf("З-015"));
  expect(hero.length).toBeGreaterThan(0);
  expect(html).toContain('class="assignee"');
  const departmentName = rows.find((row) => row.departmentName.length > 0)!.departmentName;
  expect(html).toContain(departmentName);
  expect((html.match(/<ui-badge/g) ?? []).length).toBeGreaterThan(0);
  expect((html.match(/<ui-sla/g) ?? []).length).toBeGreaterThan(0);
});

test("без орг-модели подразделение честно показывает «Нет данных»", () => {
  const plainRows = buildRows(graph, story.incidents, day, defaultFilters());
  expect(plainRows.every((row) => row.departmentName === "")).toBe(true);
  const plain = renderIncidents({ rows: plainRows, days, day, filters: defaultFilters() });
  expect(plain).toContain("Нет данных");
});

test("фильтр «ждут подтверждения» оставляет только обращения на проверке", () => {
  const pending = buildRows(graph, story.incidents, day, { ...defaultFilters(), review: "pending" }, repository);
  expect(pending.length).toBeGreaterThan(0);
  expect(pending.every((row) => repository.lifecycleOf(row.id)?.status === "pending_review")).toBe(true);
  expect(pending.length).toBeLessThan(rows.length);
});

test("пустой результат показывает понятное сообщение", () => {
  const empty = renderIncidents({ rows: [], days, day, filters: defaultFilters() });
  expect(empty).toContain("Ничего не найдено");
  expect(empty).toContain("data-empty-state");
  expect(empty).toContain("Найдено: 0");
});
