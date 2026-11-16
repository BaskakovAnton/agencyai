import type { Graph, Incident } from "../types.ts";
import { CATEGORIES, type IncidentCategory } from "../data/categories.ts";
import { createIncident } from "./incident.ts";

/**
 * Генерация заявок: ровно столько, сколько узлов процесса.
 * По одной заявке на узел — часть окажется в начале процесса, часть в конце.
 */
export const generateIncidents = (
  graph: Graph,
  rand: () => number,
  categories: readonly IncidentCategory[] = CATEGORIES,
): readonly Incident[] =>
  graph.order.map((nodeId, index) => createIncident({ index, nodeId, categories, rand }));
