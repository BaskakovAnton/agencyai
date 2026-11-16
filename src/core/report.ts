import type { Graph, Incident, Priority, Session } from "../types.ts";
import { GROUP_TITLES, PRIORITY_TITLES } from "../data/roles.ts";
import { isFinished, priorityRank } from "./incident.ts";
import { isArchived } from "./navigation.ts";

export interface Summary {
  readonly generatedAt: string;
  readonly total: number;
  readonly moves: number;
  readonly finished: number;
  readonly byPriority: Readonly<Record<Priority, number>>;
  readonly byGroup: Readonly<Record<string, number>>;
  readonly byNode: readonly { readonly nodeId: string; readonly title: string; readonly count: number }[];
}

/** Сводка по состоянию сессии — чистая функция (время передаётся снаружи). */
export const buildSummary = (graph: Graph, session: Session, generatedAt: string): Summary => {
  const byPriority: Record<Priority, number> = { urgent: 0, normal: 0, routine: 0, none: 0 };
  const byGroup: Record<string, number> = {};
  const byNodeCount = new Map<string, number>();
  let moves = 0;
  let finished = 0;

  for (const incident of session.incidents) {
    byPriority[incident.priority] += 1;
    const node = graph.byId[incident.nodeId];
    if (node) {
      byGroup[node.group] = (byGroup[node.group] ?? 0) + 1;
      byNodeCount.set(incident.nodeId, (byNodeCount.get(incident.nodeId) ?? 0) + 1);
    }
    moves += incident.history.length;
    // «дошло до конца» = край процесса либо архив: дальше не пускают права ни одной роли
    if (isFinished(incident, graph) || isArchived(graph, incident, "system")) finished += 1;
  }

  const byNode = graph.order
    .filter((id) => byNodeCount.has(id))
    .map((id) => ({ nodeId: id, title: graph.byId[id]?.title ?? "", count: byNodeCount.get(id) ?? 0 }));

  return {
    generatedAt,
    total: session.incidents.length,
    moves,
    finished,
    byPriority,
    byGroup,
    byNode,
  };
};

/** Текстовый отчёт для человека. */
export const renderSummary = (summary: Summary): string => {
  const lines: string[] = [];
  lines.push("ОТЧЁТ по модели процессов");
  lines.push("сформирован: " + summary.generatedAt);
  lines.push("");
  lines.push("Заявок всего: " + summary.total + " · переходов: " + summary.moves + " · дошло до конца: " + summary.finished);
  lines.push("");
  lines.push("По приоритетам:");
  (Object.keys(summary.byPriority) as Priority[])
    .sort((a, b) => priorityRank[a] - priorityRank[b])
    .forEach((p) => lines.push("  " + PRIORITY_TITLES[p] + ": " + summary.byPriority[p]));
  lines.push("");
  lines.push("По группам узлов:");
  Object.entries(summary.byGroup).forEach(([group, count]) =>
    lines.push("  " + (GROUP_TITLES[group as keyof typeof GROUP_TITLES] ?? group) + ": " + count),
  );
  lines.push("");
  lines.push("Где стоят заявки сейчас:");
  summary.byNode.forEach((row) => lines.push("  " + row.nodeId + " " + row.title + ": " + row.count));
  return lines.join("\n");
};

/** Финальное состояние (то, что разрешено писать на диск). */
export const buildFinalState = (graph: Graph, session: Session, generatedAt: string) => ({
  generatedAt,
  step: session.step,
  nodes: graph.order,
  incidents: session.incidents.map((i: Incident) => ({
    id: i.id,
    priority: i.priority,
    category: i.category,
    title: i.title,
    address: i.address,
    reporter: i.reporter,
    nodeId: i.nodeId,
    moves: i.history.length,
    history: i.history,
  })),
  log: session.log,
});
