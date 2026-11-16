import { expect, test } from "bun:test";
import { buildGantt } from "../src/core/gantt.ts";
import { buildGitGraph } from "../src/core/gitgraph.ts";
import { hoursSince, slaPhaseAt, slaPhaseOf, slaPhaseOnDay, slaStateAt } from "../src/core/sla-at.ts";
import { startSla } from "../src/core/sla.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { SLA_PROFILES } from "../src/data/sla.ts";
import type { Incident } from "../src/types.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const hero = story.incidents.find((incident) => incident.id === "З-015") as Incident;

test("hoursSince считает часы между моментами и не уходит в минус", () => {
  expect(hoursSince("2026-01-01T09:00:00.000Z", "2026-01-02T09:00:00.000Z")).toBe(24);
  expect(hoursSince("2026-01-02T09:00:00.000Z", "2026-01-01T09:00:00.000Z")).toBe(0);
});

test("slaPhaseOf различает в срок, паузу, просрочку и отсутствие норматива", () => {
  const sla = startSla("urgent", 0);
  expect(slaPhaseOf("urgent", sla, 10)).toBe("ok");
  expect(slaPhaseOf("urgent", sla, 25)).toBe("overdue");
  expect(slaPhaseOf("urgent", { ...sla, paused: true, pauseReason: "погода" }, 100)).toBe("paused");
  expect(slaPhaseOf("none", startSla("none", 0), 100)).toBe("none");
});

test("герой — авария: 1 января в срок, 2 января уже просрочка", () => {
  expect(hero.priority).toBe("urgent");
  expect(SLA_PROFILES.urgent.resolveHours).toBe(24);
  expect(slaPhaseOnDay(hero, "2026-01-01")).toBe("ok");
  expect(slaPhaseOnDay(hero, "2026-01-02")).toBe("overdue");
  expect(slaStateAt(hero, "2026-01-01").dueAt).toBe(24);
});

test("на одну дату встречаются разные фазы SLA — метки пересчитываются", () => {
  const day = "2026-01-02";
  const phases = story.incidents.map((incident) => slaPhaseAt(incident, day + "T23:59:59.999Z"));
  expect(new Set(phases).size).toBeGreaterThan(1);
});

test("коммиты графа несут фазу SLA, часы в узле и признаки развилки и слияния", () => {
  const model = buildGitGraph(graph, story.incidents, "2026-01-02");
  expect(model.commits.every((commit) => ["ok", "paused", "overdue", "none"].includes(commit.slaPhase))).toBe(true);
  expect(model.commits.every((commit) => commit.hoursInNode > 0)).toBe(true);
  expect(model.forks).toContain("U9");
  expect(model.merges).toContain("U10");
  const heroCommits = model.commits.filter((commit) => commit.isHero);
  expect(heroCommits.map((commit) => commit.slaPhase)).toEqual(["ok", "overdue"]);
  expect(model.commits.some((commit) => commit.isFork)).toBe(true);
  expect(model.commits.some((commit) => commit.isMerge)).toBe(true);
});

test("полосы Ганта несут фазу SLA", () => {
  const model = buildGantt(graph, story.incidents, "2026-01-02");
  const heroRow = model.rows.find((row) => row.isHero);
  expect(heroRow?.segments.map((segment) => segment.slaPhase)).toEqual(["ok", "overdue"]);
  expect(model.rows.every((row) => typeof row.slaPhase === "string")).toBe(true);
});
