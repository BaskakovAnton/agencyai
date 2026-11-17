import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { renderIncident, renderIncidentMissing } from "../src/web/incident-html.ts";
import { buildIncidentView } from "../src/web/incident.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const day = "2026-01-02";
const days = story.days;
const view = buildIncidentView(graph, story.incidents, "З-015", day)!;
const html = renderIncident(view, day, days);

test("карточка показывает номер, приоритет, узел, SLA и историю", () => {
  expect(html).toContain("data-incident-detail");
  expect(html).toContain("З-015");
  expect(html).toContain("Разбита дверь подъезда");
  expect(html).toContain("data-current");
  expect(html).toContain("data-sla");
  expect(html).toContain("data-history");
  expect((html.match(/data-history-row/g) ?? []).length).toBe(view.history.length);
  expect(html).toContain("SLA");
});

test("следующий шаг показан как варианты модели", () => {
  expect(html).toContain("data-next");
  expect(html).toContain(view.next[0]!.to);
});

test("ссылки ведут в хронологию, чат и обращения с датой и id", () => {
  expect(html).toContain('href="#timeline?at=' + day);
  expect(html).toContain("#chat/" + encodeURIComponent("З-015"));
  expect(html).toContain('href="#incidents');
  expect(html).toContain("data-day-select");
});

test("неизвестный id: понятное сообщение и возврат к списку", () => {
  const missing = renderIncidentMissing("З-999", day, days);
  expect(missing).toContain("data-incident-missing");
  expect(missing).toContain("не найдена");
  expect(missing).toContain('href="#incidents');
});
