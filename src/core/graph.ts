import type { Graph, ProcessNode } from "../types.ts";

/** Переопределение соседей для узла (если процесс ветвится). */
export interface EdgeOverride {
  readonly next?: readonly string[];
  readonly prev?: readonly string[];
}

/**
 * Граф процесса: канонический порядок узлов + соседи.
 * По умолчанию это цепочка U1 → U2 → … → U30; ветвления задаются переопределениями.
 */
export const buildGraph = (
  nodes: readonly ProcessNode[],
  overrides: Readonly<Record<string, EdgeOverride>> = {},
): Graph => {
  const order = nodes.map((n) => n.id);
  const byId: Record<string, ProcessNode> = {};
  const next: Record<string, readonly string[]> = {};
  const prev: Record<string, readonly string[]> = {};

  order.forEach((id, i) => {
    byId[id] = nodes[i] as ProcessNode;
    const chainNext = i < order.length - 1 ? [order[i + 1] as string] : [];
    const chainPrev = i > 0 ? [order[i - 1] as string] : [];
    next[id] = overrides[id]?.next ?? chainNext;
    prev[id] = overrides[id]?.prev ?? chainPrev;
  });

  return { order, byId, next, prev };
};

/** Соседи узла — вперёд и назад. */
export const neighborsOf = (g: Graph, id: string) => ({
  prev: g.prev[id] ?? [],
  next: g.next[id] ?? [],
});

/** Является ли узел соседним (оператор ходит только по соседям). */
export const isNeighbor = (g: Graph, from: string, to: string): boolean =>
  (g.next[from] ?? []).includes(to) || (g.prev[from] ?? []).includes(to);

export const isKnownNode = (g: Graph, id: string): boolean =>
  Object.prototype.hasOwnProperty.call(g.byId, id);

export const firstNodeId = (g: Graph): string => g.order[0] ?? "";
export const lastNodeId = (g: Graph): string => g.order[g.order.length - 1] ?? "";

/** Индекс узла в цепочке (для отчётов и сортировок). */
export const nodeIndex = (g: Graph, id: string): number => g.order.indexOf(id);
