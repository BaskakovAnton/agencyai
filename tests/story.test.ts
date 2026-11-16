import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { dayOf, visibleAt } from "../src/core/timeline.ts";
import { buildProcessGraph } from "../src/data/edges.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);

test("история: 30 заявок, все начинаются с U1 и получают дату создания", () => {
  expect(story.incidents.length).toBe(30);
  for (const incident of story.incidents) {
    expect(incident.createdAt).toBeDefined();
    expect(incident.history[0]?.from ?? "U1").toBe("U1");
    if (incident.history.length > 0) expect(incident.history[0]?.from).toBe("U1");
  }
});

test("история: даты переходов монотонны и не раньше создания", () => {
  for (const incident of story.incidents) {
    let previous = incident.createdAt as string;
    for (const move of incident.history) {
      expect(move.at).toBeDefined();
      expect((move.at as string) > previous).toBe(true);
      previous = move.at as string;
    }
  }
});

test("история детерминирована по seed и расходится по развилкам", () => {
  const again = buildStory(graph, 7);
  expect(again.incidents.map((i) => i.nodeId + ":" + i.history.length)).toEqual(
    story.incidents.map((i) => i.nodeId + ":" + i.history.length),
  );
  const moves = story.incidents.flatMap((incident) => incident.history);
  const targets = new Map<string, Set<string>>();
  for (const move of moves) {
    const set = targets.get(move.from) ?? new Set<string>();
    set.add(move.to);
    targets.set(move.from, set);
  }
  const branched = [...targets.values()].filter((set) => set.size > 1);
  expect(branched.length).toBeGreaterThan(0); // из одного узла заявки ушли в разные стороны
});

test("на 2 января видно подмножество заявок, будущие события скрыты", () => {
  const day = "2026-01-02";
  const visible = visibleAt(story.incidents, day);
  expect(visible.length).toBeGreaterThan(0);
  expect(visible.length).toBeLessThan(30);
  expect(story.days).toContain(day);
  for (const incident of visible) {
    expect(dayOf(incident.createdAt as string) <= day).toBe(true);
    for (const move of incident.history) expect(dayOf(move.at as string) <= day).toBe(true);
  }
});
