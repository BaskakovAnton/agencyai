import type { Graph, Incident, MoveResult, RoleId } from "../types.ts";
import { branchesOf, isNeighbor, neighborsOf } from "./graph.ts";
import { withMove } from "./incident.ts";
import { denyReason, roleAccess } from "./roles.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { pick, pickWeighted } from "../random.ts";

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
  const branch = branchesOf(graph, incident.nodeId);
  const target = branch.length > 0 ? pickWeighted(branch, (b) => b.weight, rand).to : pick(next, rand);
  const viaBranch = branch.length > 0 ? " (ветка)" : "";
  return { ok: true, incident: withMove(incident, target, actor, step, "шаг вперёд" + viaBranch) };
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

/** Варианты перехода, доступные роли (по правам узла назначения). */
export const allowedNext = (graph: Graph, nodeId: string, role: RoleId): readonly string[] =>
  neighborsOf(graph, nodeId).next.filter((to) => roleAccess(graph, to, role).allowed);

/** Заявка упирается в права: дальше идти некому (архив, а не удаление). */
export const isArchived = (graph: Graph, incident: Incident, role: RoleId): boolean =>
  allowedNext(graph, incident.nodeId, role).length === 0;

/** Переход на соседний узел с проверкой прав роли. */
export const moveToNodeAs = (
  graph: Graph,
  incident: Incident,
  target: string,
  step: number,
  role: RoleId,
): MoveResult => {
  if (!roleAccess(graph, target, role).allowed) {
    return { ok: false, error: denyReason(graph, target, role) };
  }
  return moveToNode(graph, incident, target, step, role === "system" ? "auto" : "operator");
};

/** Шаг вперёд с проверкой прав: выбираются только доступные роли варианты. */
export const moveForwardAs = (
  graph: Graph,
  incident: Incident,
  rand: () => number,
  step: number,
  role: RoleId,
): MoveResult => {
  const options = allowedNext(graph, incident.nodeId, role);
  if (options.length === 0) {
    return {
      ok: false,
      error: incident.id + ": узел " + incident.nodeId + " — нет доступных переходов для роли " + ROLE_NAMES[role],
    };
  }
  const branch = branchesOf(graph, incident.nodeId).filter((b) => options.includes(b.to));
  const target = branch.length > 0 ? pickWeighted(branch, (b) => b.weight, rand).to : pick(options, rand);
  const actor = role === "system" ? "auto" : "operator";
  return { ok: true, incident: withMove(incident, target, actor, step, "шаг вперёд (роль " + role + ")") };
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
