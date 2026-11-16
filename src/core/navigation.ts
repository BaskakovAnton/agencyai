import type { Graph, Incident, MoveResult, RoleId } from "../types.ts";
import { branchesOf, isNeighbor, neighborsOf } from "./graph.ts";
import { withMove } from "./incident.ts";
import { afterMove } from "./sla.ts";
import { denyReason, roleAccess } from "./roles.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { hoursFor } from "../data/sla.ts";
import { pick, pickWeighted } from "../random.ts";

export type Actor = "operator" | "auto" | "generator";

/**
 * Шаг занимает столько часов, сколько работа на узле назначения.
 * Применяются эффекты узла: пауза (U14), возобновление (U15), пересчёт (U2), просрочка.
 */
const stepTo = (
  incident: Incident,
  target: string,
  actor: Actor,
  step: number,
  note: string,
  clock: number,
  rand: () => number,
): Incident => {
  const moved = withMove(incident, target, actor, step, note);
  return afterMove(moved, target, clock + hoursFor(target), rand);
};

/** Явный переход на соседний узел (команда оператора). */
export const moveToNode = (
  graph: Graph,
  incident: Incident,
  target: string,
  step: number,
  actor: Actor = "operator",
  clock = 0,
  rand: () => number = () => 0,
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
  return { ok: true, incident: stepTo(incident, target, actor, step, "переход к соседнему узлу", clock, rand) };
};

/** Шаг вперёд — на один из следующих узлов (взвешенно, если есть развилка). */
export const moveForward = (
  graph: Graph,
  incident: Incident,
  rand: () => number,
  step: number,
  actor: Actor = "auto",
  clock = 0,
): MoveResult => {
  const { next } = neighborsOf(graph, incident.nodeId);
  if (next.length === 0) {
    return { ok: false, error: incident.id + ": узел " + incident.nodeId + " — конец процесса" };
  }
  const branch = branchesOf(graph, incident.nodeId);
  const target = branch.length > 0 ? pickWeighted(branch, (b) => b.weight, rand).to : pick(next, rand);
  const viaBranch = branch.length > 0 ? " (ветка)" : "";
  return { ok: true, incident: stepTo(incident, target, actor, step, "шаг вперёд" + viaBranch, clock, rand) };
};

/** Шаг назад — на один из предыдущих узлов. */
export const moveBackward = (
  graph: Graph,
  incident: Incident,
  rand: () => number,
  step: number,
  actor: Actor = "auto",
  clock = 0,
): MoveResult => {
  const { prev } = neighborsOf(graph, incident.nodeId);
  if (prev.length === 0) {
    return { ok: false, error: incident.id + ": узел " + incident.nodeId + " — начало процесса" };
  }
  return { ok: true, incident: stepTo(incident, pick(prev, rand), actor, step, "шаг назад", clock, rand) };
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
  clock = 0,
  rand: () => number = () => 0,
): MoveResult => {
  if (!roleAccess(graph, target, role).allowed) {
    return { ok: false, error: denyReason(graph, target, role) };
  }
  return moveToNode(graph, incident, target, step, role === "system" ? "auto" : "operator", clock, rand);
};

/** Шаг вперёд с проверкой прав: выбираются только доступные роли варианты. */
export const moveForwardAs = (
  graph: Graph,
  incident: Incident,
  rand: () => number,
  step: number,
  role: RoleId,
  clock = 0,
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
  const actor: Actor = role === "system" ? "auto" : "operator";
  return { ok: true, incident: stepTo(incident, target, actor, step, "шаг вперёд (роль " + role + ")", clock, rand) };
};

/** Прогон: каждая заявка получает один шаг вперёд, если это возможно. */
export const sweep = (
  graph: Graph,
  incidents: readonly Incident[],
  rand: () => number,
  step: number,
  clock = 0,
): { readonly incidents: readonly Incident[]; readonly moved: number } => {
  let moved = 0;
  const nextState = incidents.map((incident) => {
    if (graph.next[incident.nodeId]?.length) {
      const result = moveForward(graph, incident, rand, step, "auto", clock);
      if (result.ok) {
        moved += 1;
        return result.incident;
      }
    }
    return incident;
  });
  return { incidents: nextState, moved };
};
