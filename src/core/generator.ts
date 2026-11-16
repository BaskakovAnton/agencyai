import type { Graph, Incident, Situation } from "../types.ts";
import { CATEGORIES, type IncidentCategory } from "../data/categories.ts";
import { SITUATIONS } from "../data/situations.ts";
import { createIncident } from "./incident.ts";

/**
 * Генерация заявок: ровно столько, сколько узлов процесса.
 * По одной заявке на узел — часть окажется в начале процесса, часть в конце.
 */
export const generateIncidents = (
  graph: Graph,
  rand: () => number,
  categories: readonly IncidentCategory[] = CATEGORIES,
  situations: readonly Situation[] = SITUATIONS,
): readonly Incident[] =>
  graph.order.map((nodeId, index) =>
    createIncident({
      index,
      nodeId,
      categories,
      situation: situations.length > 0 ? situations[index % situations.length] : undefined,
      rand,
    }),
  );
