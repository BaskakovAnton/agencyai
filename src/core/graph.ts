import type { Branch, Graph, ProcessNode } from "../types.ts";

/**
 * Граф процесса: канонический порядок узлов, развилки и соседи.
 * `next` берётся из развилок (или из цепочки), `prev` — обратная связь от `next`,
 * поэтому прямой и обратный ход всегда симметричны.
 */
export const buildGraph = (
  nodes: readonly ProcessNode[],
  branchOverrides: Readonly<Record<string, readonly Branch[]>> = {},
): Graph => {
  const order = nodes.map((n) => n.id);
  const byId: Record<string, ProcessNode> = {};
  const next: Record<string, readonly string[]> = {};
  const branches: Record<string, readonly Branch[]> = {};

  order.forEach((id, i) => {
    byId[id] = nodes[i] as ProcessNode;
    const branch = branchOverrides[id];
    if (branch && branch.length > 0) {
      branches[id] = branch;
      next[id] = branch.map((b) => b.to);
    } else {
      next[id] = i < order.length - 1 ? [order[i + 1] as string] : [];
    }
  });

  const prev: Record<string, string[]> = {};
  order.forEach((id) => {
    prev[id] = [];
  });
  order.forEach((id) => {
    for (const to of next[id] ?? []) {
      const list = prev[to];
      if (list && !list.includes(id)) list.push(id);
    }
  });

  return { order, byId, next, prev, branches };
};

/** Соседи узла — вперёд и назад. */
export const neighborsOf = (g: Graph, id: string) => ({
  prev: g.prev[id] ?? [],
  next: g.next[id] ?? [],
});

/** Развилки узла (пустой список, если узел линейный). */
export const branchesOf = (g: Graph, id: string): readonly Branch[] => g.branches[id] ?? [];

/** Является ли узел соседним (оператор ходит только по соседям). */
export const isNeighbor = (g: Graph, from: string, to: string): boolean =>
  (g.next[from] ?? []).includes(to) || (g.prev[from] ?? []).includes(to);

export const isKnownNode = (g: Graph, id: string): boolean =>
  Object.prototype.hasOwnProperty.call(g.byId, id);

export const firstNodeId = (g: Graph): string => g.order[0] ?? "";
export const lastNodeId = (g: Graph): string => g.order[g.order.length - 1] ?? "";

/** Индекс узла в цепочке (для отчётов и сортировок). */
export const nodeIndex = (g: Graph, id: string): number => g.order.indexOf(id);
