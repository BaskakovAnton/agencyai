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

test("карточка собрана по композиции incident-detail.html", () => {
  expect(html).toContain("data-incident-detail");
  expect(html).toContain("З-015");
  expect(html).toContain("Разбита дверь подъезда");
  expect(html).toContain("detail-facts");
  expect(html).toContain("История прохождения");
  expect(html).toContain("Контроль SLA");
  expect(html).toContain("Участники");
  expect(html).toContain("Связанные представления");
  expect((html.match(/<ui-panel/g) ?? []).length).toBeGreaterThanOrEqual(5);
});

test("факты, шаги и участники взяты из модели", () => {
  expect(html).toContain("data-current");
  expect(html).toContain("data-sla");
  expect(html).toContain("Ответственная роль");
  expect((html.match(/class="step /g) ?? []).length).toBe(view.steps.length);
  expect((html.match(/data-history-row/g) ?? []).length).toBe(view.steps.filter((step) => step.fromHistory).length);
  expect(html).toContain("data-next");
  expect((html.match(/class="avatar"/g) ?? []).length).toBe(view.participants.length);
});

test("связанные представления ведут в хронологию, чат и реестр с датой", () => {
  expect(html).toContain("data-links");
  expect(html).toContain('href="#timeline?at=' + day);
  expect(html).toContain("#chat/" + encodeURIComponent("З-015"));
  expect(html).toContain('href="#incidents');
  expect(html).toContain("data-day-select");
  expect(html).toContain("data-read-only");
});

test("карточка выводит решение оператора перед полной историей", () => {
  const html = renderIncident(view, day, days, { historical: true });
  const decisionAt = html.indexOf("data-decision-card");
  const historyAt = html.indexOf("История прохождения");
  expect(decisionAt).toBeGreaterThan(-1);
  expect(decisionAt).toBeLessThan(historyAt);
  expect(html).toContain("Следующий шаг по модели");
  expect(html).toContain('data-current-role');
  expect(html).toContain("Депутат-диспетчер");
});

test("неизвестный id: понятное сообщение и возврат к списку", () => {
  const missing = renderIncidentMissing("З-999", day, days);
  expect(missing).toContain("data-incident-missing");
  expect(missing).toContain("не найдена");
  expect(missing).toContain('href="#incidents');
  expect(missing).toContain("data-day-select");
});
