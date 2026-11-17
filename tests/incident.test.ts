import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { slaPhaseOnDay } from "../src/core/sla-at.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { buildIncidentView } from "../src/web/incident.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const day = "2026-01-02";

test("карточка героя на 2 января: узел, история и SLA из модели", () => {
  const view = buildIncidentView(graph, story.incidents, "З-015", day)!;
  expect(view.id).toBe("З-015");
  expect(view.title).toBe("Разбита дверь подъезда");
  expect(view.nodeId).toBe("U6");
  expect(view.nodeTitle.length).toBeGreaterThan(0);
  expect(view.history.length).toBe(1);
  expect(view.history[0]!.to).toBe("U6");
  expect(view.history[0]!.roleTitle).toBe("Депутат-диспетчер");
  expect(view.history.every((row) => row.at !== "" && row.roleTitle !== "")).toBe(true);
  const hero = story.incidents.find((i) => i.id === "З-015")!;
  expect(view.phase).toBe(slaPhaseOnDay(hero, day));
  expect(view.normHours).toBe(24);
  expect(view.beforeCreation).toBe(false);
});

test("следующий шаг — это варианты графа, а не утверждение", () => {
  const view = buildIncidentView(graph, story.incidents, "З-015", day)!;
  expect(view.next.length).toBeGreaterThan(0);
  for (const option of view.next) expect(graph.byId[option.to]).toBeDefined();
});

test("ссылка понимает короткий ввод, а неизвестный id — null", () => {
  expect(buildIncidentView(graph, story.incidents, "15", day)!.id).toBe("З-015");
  expect(buildIncidentView(graph, story.incidents, "З-999", day)).toBeNull();
});

test("до создания заявки карточка честно говорит об этом", () => {
  const view = buildIncidentView(graph, story.incidents, "З-015", "2025-12-20")!;
  expect(view.beforeCreation).toBe(true);
  expect(view.history).toHaveLength(0);
  expect(view.phase).toBe("none");
});
