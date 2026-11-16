import { HERO_ADDRESS, HERO_GAPS, HERO_INCIDENT_ID, HERO_START, HERO_TITLE, heroMoves } from "../data/hero.ts";
import { hoursFor } from "../data/sla.ts";
import { mulberry32 } from "../random.ts";
import type { Graph, Incident, Move } from "../types.ts";
import { generateIncidents } from "./generator.ts";
import { moveForward } from "./navigation.ts";
import { DEMO_ORIGIN, addHours, createdFor, daysRange, withTimeline } from "./timeline.ts";

/** Сколько массовых шагов делает демо-история: 5 шагов дают ветки и разные исходы. */
export const STORY_SWEEPS = 5;

/** Множитель часов: реальный шаг занимает около суток, поэтому даты в переписке различимы. */
export const STORY_HOURS_FACTOR = 6;

const stampLast = (incident: Incident): Incident => {
  const last = incident.history.at(-1);
  if (!last || last.at !== undefined) return incident;
  const previous = incident.history.at(-2)?.at ?? incident.createdAt ?? DEMO_ORIGIN;
  const at = addHours(previous, hoursFor(last.to) * STORY_HOURS_FACTOR);
  const history: readonly Move[] = incident.history.map((move, index) =>
    index === incident.history.length - 1 ? { ...move, at } : move,
  );
  return { ...incident, history };
};

/** Один массовый шаг: каждая заявка, которой есть куда идти, делает шаг вперёд. */
const sweepOnce = (graph: Graph, incidents: readonly Incident[], rand: () => number, step: number): readonly Incident[] =>
  incidents.map((incident) => {
    if (incident.id === HERO_INCIDENT_ID) return incident; // герой идёт по сценарию спеки
    const result = moveForward(graph, incident, rand, step);
    return result.ok ? stampLast(result.incident) : incident;
  });

/** Герой: даты и маршрут из спеки (U1 → U6 → U7 → U19), заголовок про разбитую дверь. */
const withHero = (incidents: readonly Incident[]): readonly Incident[] =>
  incidents.map((incident) =>
    incident.id === HERO_INCIDENT_ID
      ? withTimeline(
          { ...incident, title: HERO_TITLE, address: HERO_ADDRESS, nodeId: "U19", history: heroMoves() },
          HERO_START,
          (_move, index) => HERO_GAPS[index] ?? 24,
        )
      : incident,
  );

export interface Story {
  readonly incidents: readonly Incident[];
  readonly days: readonly string[];
  readonly origin: string;
}

/** Демо-история: все заявки начинаются с U1 (общий корень) и расходятся по развилкам. */
export const buildStory = (graph: Graph, seed = 7, sweeps = STORY_SWEEPS, origin = DEMO_ORIGIN): Story => {
  const rand = mulberry32(seed);
  const root = graph.order[0] ?? "U1";
  const born = generateIncidents(graph, rand).map((incident, index) =>
    withTimeline({ ...incident, nodeId: root, history: [] }, createdFor(index, origin)),
  );
  let incidents: readonly Incident[] = withHero(born);
  for (let step = 1; step <= sweeps; step += 1) incidents = sweepOnce(graph, incidents, rand, step);
  return { incidents, days: daysRange(incidents), origin };
};
