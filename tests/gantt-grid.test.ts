import { expect, test } from "bun:test";
import { buildGantt } from "../src/core/gantt.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { renderGanttGrid } from "../src/web/gantt-grid.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const model = buildGantt(graph, story.incidents, "2026-01-02");

test("сетка Ганта содержит строку на каждую видимую заявку и шапку с днями", () => {
  const html = renderGanttGrid(model);
  expect((html.match(/data-row="/g) ?? []).length).toBe(model.rows.length);
  expect(html).toContain("gantt-row head");
  expect(html).toContain("grid-template-columns");
  expect((html.match(/class="gantt-cell day/g) ?? []).length).toBe(model.days.length);
});

test("полосы несут узел, даты и цвет роли", () => {
  const html = renderGanttGrid(model, "З-015");
  expect(html).toContain('data-bar="З-015"');
  expect(html).toContain('data-node="U1"');
  expect(html).toContain('data-node="U6"');
  expect(html).toContain('data-from="2026-01-01"');
  expect(html).toContain('data-to="2026-01-02"');
  expect(html).toContain("var(--role-deputy)"); // цвет роли депутата на полосе U6
});

test("строки Ганта — кнопки с клавиатурным фокусом и подписью", () => {
  const html = renderGanttGrid(model);
  expect((html.match(/role="button"/g) ?? []).length).toBe(model.rows.length);
  expect((html.match(/tabindex="0"/g) ?? []).length).toBe(model.rows.length);
  expect(html.match(/class="gantt-row/g)?.length).toBe(model.rows.length + 1); // + шапка
});

test("фильтр оставляет одну строку и герой помечен", () => {
  const html = renderGanttGrid(model, "З-015");
  expect((html.match(/data-row="/g) ?? []).length).toBe(1);
  expect(html).toContain('class="gantt-row hero"');
  expect(html).toContain("Разбита дверь подъезда");
});
