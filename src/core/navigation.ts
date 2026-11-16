import type { Graph, Incident, MoveResult } from "../types.ts";
import { isNeighbor, neighborsOf } from "./graph.ts";
import { withMove } from "./incident.ts";
import { pick } from "../random.ts";

export type Actor = "operator" | "auto" | "generator";

/** Явный переход на соседний узел (команда оператора). */
export const moveToNode = (
  graph: Graph,
  incident: Incident,
  target: string,
  step: number,
  actor: Actor = "operator",
): MoveResult => {
  if (!graph.byId[target]) return { ok: false, error: "неизвестный узел: " + target };
  if (incident.nodeId === target) return { ok: false, error: incident.id + " уже на узле " + target };
  if (!isNeighbor(graph, incident.nodeId, target)) {
    const { prev, next } = neighborsOf(graph, incident.nodeId);
    const list = [...prev, ...next].join(", ") || "нет";
    return {
      ok: false,
      error: "узел " + target + " не соседний для " + incident.nodeId + " (соседи: " + list + ")",
    };
  }
  return { ok: true, incident: withMove(incident, target, actor, step, "переход к соседнему узлу") };
};

/** Шаг вперёд — на один из следующих узлов. */
export const moveForward = (
  graph: Graph,
  incident: Incident,
  rand: () => number,
  step: number,
  actor: Actor = "auto",
): MoveResult => {
  const { next } = neighborsOf(graph, incident.nodeId);
  if (next.length === 0) {
    return { ok: false, error: incident.id + ": узел " + incident.nodeId + " — конец процесса" };
  }
  return { ok: true, incident: withMove(incident, pick(next, rand), actor, step, "шаг вперёд") };
};

/** Шаг назад — на один из предыдущих узлов. */
export const moveBackward = (
  graph: Graph,
  incident: Incident,
  rand: () => number,
  step: number,
  actor: Actor = "auto",
): MoveResult => {
  const { prev } = neighborsOf(graph, incident.nodeId);
  if (prev.length === 0) {
    return { ok: false, error: incident.id + ": узел " + incident.nodeId + " — начало процесса" };
  }
  return { ok: true, incident: withMove(incident, pick(prev, rand), actor, step, "шаг назад") };
};

/** Прогон: каждая заявка получает один шаг вперёд, если это возможно. */
export const sweep = (
  graph: Graph,
  incidents: readonly Incident[],
  rand: () => number,
  step: number,
): { readonly incidents: readonly Incident[]; readonly moved: number } => {
  let moved = 0;
  const nextState = incidents.map((incident) => {
    if (graph.next[incident.nodeId]?.length) {
      const result = moveForward(graph, incident, rand, step);
      if (result.ok) {
        moved += 1;
        return result.incident;
      }
    }
    return incident;
  });
  return { incidents: nextState, moved };
};
