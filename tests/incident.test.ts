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
  expect(view.caseLabel).toBe("Обращение З-015");
  expect(view.nodeId).toBe("U6");
  expect(view.facts.find((fact) => fact.label === "Текущий этап")!.value).toContain("U6");
  expect(view.facts.find((fact) => fact.label === "Ответственная роль")!.value.length).toBeGreaterThan(0);
  expect(view.steps.filter((step) => step.fromHistory)).toHaveLength(1);
  expect(view.steps.filter((step) => step.state === "current")).toHaveLength(1);
  expect(view.steps.every((step) => step.caption.length > 0)).toBe(true);
  const hero = story.incidents.find((incident) => incident.id === "З-015")!;
  expect(view.phase).toBe(slaPhaseOnDay(hero, day));
  expect(view.normTitle).toContain("авария");
  expect(view.slaBig.length).toBeGreaterThan(0);
  expect(view.slaNote.length).toBeGreaterThan(0);
  expect(view.beforeCreation).toBe(false);
});

test("участники собраны из ролей модели, без вымышленных имён", () => {
  const view = buildIncidentView(graph, story.incidents, "З-015", day)!;
  expect(view.participants.length).toBeGreaterThan(0);
  expect(view.participants.map((person) => person.name)).toContain("Депутат-диспетчер");
  for (const person of view.participants) {
    expect(person.initials.length).toBeGreaterThan(0);
    expect(person.note.length).toBeGreaterThan(0);
  }
});

test("следующий шаг — варианты графа, а не утверждение", () => {
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
  expect(view.steps.filter((step) => step.fromHistory)).toHaveLength(0);
  expect(view.phase).toBe("none");
  expect(view.slaBig).toBe("Норматив не задан");
});
