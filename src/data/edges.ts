import type { Branch, Graph, ProcessNode } from "../types.ts";
import { buildGraph } from "../core/graph.ts";
import { NODES } from "./nodes.ts";

/**
 * Развилки процесса — рандомные решения из спеки.
 * Веса трактуются как доли: 75/25 = 75% и 25%.
 */
export const BRANCHES: Readonly<Record<string, readonly Branch[]>> = {
  U4: [
    { to: "U5", weight: 75, note: "обычное обращение — сначала объединение однотипных" },
    { to: "U6", weight: 25, note: "срочное — сразу подрядчику, минуя объединение" },
  ],
  U9: [
    { to: "U6", weight: 45, note: "подрядчик отказался — назначаем другого" },
    { to: "U16", weight: 30, note: "отказ без альтернативы — эскалация" },
    { to: "U10", weight: 25, note: "вопрос решён на месте — работа продолжается" },
  ],
  U12: [
    { to: "U13", weight: 40, note: "результат не принят — возврат на переделку" },
    { to: "U19", weight: 60, note: "результат принят — ответ жителю" },
  ],
  U13: [
    { to: "U10", weight: 50, note: "переделка тому же подрядчику" },
    { to: "U6", weight: 30, note: "подрядчик не справляется — передаём другому" },
    { to: "U14", weight: 20, note: "нужна приостановка: доступ, погода, согласование" },
  ],
};

/** Граф процесса с развилками — рабочая конфигурация. */
export const buildProcessGraph = (nodes: readonly ProcessNode[] = NODES): Graph =>
  buildGraph(nodes, BRANCHES);

export interface BranchShare {
  readonly to: string;
  readonly percent: number;
  readonly note: string;
}

/** Развилки с процентами — для интерфейса и отчётов. */
export const branchShares = (branches: readonly Branch[]): readonly BranchShare[] => {
  const total = branches.reduce((sum, b) => sum + b.weight, 0);
  if (total <= 0) return [];
  return branches.map((b) => ({ to: b.to, percent: Math.round((b.weight / total) * 100), note: b.note }));
};
