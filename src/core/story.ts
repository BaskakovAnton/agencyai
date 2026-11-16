import { HERO_ADDRESS, HERO_GAPS, HERO_INCIDENT_ID, HERO_PRIORITY, HERO_ROUTE, HERO_START, HERO_TITLE } from "../data/hero.ts";
import { hoursFor } from "../data/sla.ts";
import { mulberry32, pick, pickWeighted } from "../random.ts";
import type { Graph, Incident, Move } from "../types.ts";
import { branchesOf, neighborsOf } from "./graph.ts";
import { generateIncidents } from "./generator.ts";
import { withMove } from "./incident.ts";
import { afterMove, startSla } from "./sla.ts";
import { hoursSince } from "./sla-at.ts";
import { DEMO_ORIGIN, addHours, createdFor, daysRange, lastAt } from "./timeline.ts";

/** Сколько массовых шагов делает демо-история: 5 шагов дают ветки и разные исходы. */
export const STORY_SWEEPS = 5;

/** Множитель часов: реальный шаг занимает около суток, поэтому даты в переписке различимы. */
export const STORY_HOURS_FACTOR = 6;

/**
 * Шаг по узлу: дата, часы на узле и состояние SLA записываются в переход.
 * Часы накапливаются от создания заявки, поэтому просрочка наступает там, где должна.
 */
const moveAlong = (
  incident: Incident,
  target: string,
  step: number,
  stepHours: number,
  rand: () => number,
  note: string,
): Incident => {
  const at = lastAt(incident);
  const clock = hoursSince(incident.createdAt ?? at, at) + stepHours;
  const moved = afterMove(withMove(incident, target, "auto", step, note), target, clock, rand);
  const history: readonly Move[] = moved.history.map((move, index) =>
    index === moved.history.length - 1 ? { ...move, at: addHours(at, stepHours), sla: moved.sla } : move,
  );
  return { ...moved, history };
};

/** Один массовый шаг: заявка идёт вперёд по развилке (веса) или по обычному ребру. */
const advance = (graph: Graph, incident: Incident, rand: () => number, step: number): Incident => {
  const next = neighborsOf(graph, incident.nodeId).next;
  if (next.length === 0) return incident;
  const branch = branchesOf(graph, incident.nodeId);
  const target = branch.length > 0 ? pickWeighted(branch, (item) => item.weight, rand).to : pick(next, rand);
  return moveAlong(incident, target, step, hoursFor(target) * STORY_HOURS_FACTOR, rand, "шаг вперёд");
};

/** Герой идёт по маршруту спеки: U1 → U6 → U7 → U19 с датами из HERO_GAPS. */
const heroIncident = (incident: Incident): Incident => {
  let current: Incident = {
    ...incident,
    title: HERO_TITLE,
    address: HERO_ADDRESS,
    priority: HERO_PRIORITY,
    nodeId: "U1",
    history: [],
    createdAt: HERO_START,
    sla: startSla(HERO_PRIORITY, 0),
  };
  HERO_ROUTE.forEach((to, index) => {
    current = moveAlong(current, to, index + 1, HERO_GAPS[index] ?? 24, () => 0.5, "сценарий демонстрации");
  });
  return current;
};

export interface Story {
  readonly incidents: readonly Incident[];
  readonly days: readonly string[];
  readonly origin: string;
}

/** Демо-история: все заявки начинаются с U1 (общий корень) и расходятся по развилкам. */
export const buildStory = (graph: Graph, seed = 7, sweeps = STORY_SWEEPS, origin = DEMO_ORIGIN): Story => {
  const rand = mulberry32(seed);
  const root = graph.order[0] ?? "U1";
  const born = generateIncidents(graph, rand).map((incident, index) => ({
    ...incident,
    nodeId: root,
    history: [],
    createdAt: createdFor(index, origin),
    sla: startSla(incident.priority, 0),
  }));
  let incidents: readonly Incident[] = born.map((incident) =>
    incident.id === HERO_INCIDENT_ID ? heroIncident(incident) : incident,
  );
  for (let step = 1; step <= sweeps; step += 1) {
    incidents = incidents.map((incident) =>
      incident.id === HERO_INCIDENT_ID ? incident : advance(graph, incident, rand, step),
    );
  }
  return { incidents, days: daysRange(incidents), origin };
};
