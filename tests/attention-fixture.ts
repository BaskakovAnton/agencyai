/** Фикстура UX-3.1: внимание и просрочка — разные множества. */
import { startSla } from "../src/core/sla.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import type { Incident, Priority } from "../src/types.ts";

export const graph = buildProcessGraph();
const START = graph.order[0]!;

const incident = (id: string, priority: Priority, createdAt: string): Incident => ({
  id,
  category: "elevator",
  title: "Внимание " + id,
  address: "ул. Тестовая",
  reporter: "Житель дома",
  channel: "телефон",
  priority,
  nodeId: START,
  situationId: "С9",
  sla: startSla(priority, 0),
  history: [],
  createdAt,
});

export const incidents: readonly Incident[] = [
  incident("A-OVERDUE-URGENT", "urgent", "2025-12-20T00:00:00.000Z"), // просрочена с 21 декабря
  incident("B-URGENT-OK", "urgent", "2026-01-05T00:00:00.000Z"), // 5 января в срок, но срочная → внимание
  incident("C-ROUTINE-OK", "routine", "2025-12-20T00:00:00.000Z"), // норматив 720 ч → ни просрочки, ни внимания
  incident("D-OVERDUE-NORMAL", "normal", "2025-12-20T00:00:00.000Z"), // просрочена с 23 декабря
];
