/** Фикстура UX-3.1: жизненный цикл, терминальный узел и подтверждение контролёра. */
import { startSla } from "../src/core/sla.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import type { Incident, Move, Priority } from "../src/types.ts";
import type { IncidentLifecycle } from "../src/core/org/completion.ts";

export const graph = buildProcessGraph();
export const TERMINAL: string = graph.order.filter((id) => (graph.next[id] ?? []).length === 0)[0]!;
export const START = graph.order[0]!;

const move = (from: string, to: string, at: string): Move => ({ step: 1, from, to, actor: "auto", note: "тест", at, sla: startSla("normal", 0) });

const incident = (id: string, priority: Priority, history: readonly Move[]): Incident => ({
  id,
  category: "elevator",
  title: "Проверка " + id,
  address: "ул. Тестовая",
  reporter: "Житель дома",
  channel: "телефон",
  priority,
  nodeId: history.at(-1)?.to ?? START,
  situationId: "С9",
  sla: startSla(priority, 0),
  history,
  createdAt: "2026-01-01T00:00:00.000Z",
});

export const incidents: readonly Incident[] = [
  // Терминальный узел без записей жизненного цикла.
  incident("L-TERM-NONE", "normal", [move(START, TERMINAL, "2026-01-02T10:00:00.000Z")]),
  // Терминальный узел и ожидание проверки.
  incident("L-PEND-TERM", "normal", [move(START, TERMINAL, "2026-01-02T10:00:00.000Z")]),
  // Ожидание проверки на нетерминальном узле.
  incident("L-PEND-WORK", "normal", [move(START, "U6", "2026-01-02T10:00:00.000Z")]),
  // Подтверждённое завершение.
  incident("L-APPROVED", "normal", [move(START, TERMINAL, "2026-01-02T10:00:00.000Z")]),
  // Отказ контролёра — возврат в работу.
  incident("L-REJECTED", "normal", [move(START, "U6", "2026-01-02T10:00:00.000Z")]),
  // Переоткрытие после подтверждения.
  incident("L-REOPENED", "normal", [move(START, TERMINAL, "2026-01-02T10:00:00.000Z")]),
];

const record = (type: "submitted" | "approved" | "rejected" | "reopened", at: string, reason: string | null = null) => ({
  type,
  at,
  byUserId: type === "approved" || type === "rejected" || type === "reopened" ? "USR-CONTROL" : "USR-EXECUTOR",
  reason,
  accountableDepartmentId: "DEP-A1",
});

export const lifecycles: Readonly<Record<string, IncidentLifecycle>> = {
  "L-PEND-TERM": { incidentId: "L-PEND-TERM", organizationId: "ORG-DEMO", status: "pending_review", records: [record("submitted", "2026-01-04T10:00:00.000Z")] },
  "L-PEND-WORK": { incidentId: "L-PEND-WORK", organizationId: "ORG-DEMO", status: "pending_review", records: [record("submitted", "2026-01-04T10:00:00.000Z")] },
  "L-APPROVED": { incidentId: "L-APPROVED", organizationId: "ORG-DEMO", status: "completed", records: [record("submitted", "2026-01-04T10:00:00.000Z"), record("approved", "2026-01-05T09:00:00.000Z")] },
  "L-REJECTED": { incidentId: "L-REJECTED", organizationId: "ORG-DEMO", status: "active", records: [record("submitted", "2026-01-04T10:00:00.000Z"), record("rejected", "2026-01-06T09:00:00.000Z", "работы не приняты")] },
  "L-REOPENED": { incidentId: "L-REOPENED", organizationId: "ORG-DEMO", status: "reopened", records: [record("submitted", "2026-01-04T10:00:00.000Z"), record("approved", "2026-01-05T09:00:00.000Z"), record("reopened", "2026-01-07T09:00:00.000Z", "проблема повторилась")] },
};
