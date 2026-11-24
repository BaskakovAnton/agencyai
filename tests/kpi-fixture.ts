/** Фиксированные данные для проверок периодной аналитики: без зависимости от системного времени. */
import { startSla } from "../src/core/sla.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import type { Incident, Move, SlaState } from "../src/types.ts";
import type { IncidentAssignment, OrgDirectory } from "../src/core/org/types.ts";
import type { IncidentLifecycle } from "../src/core/org/completion.ts";

export const graph = buildProcessGraph();
/** Первый терминальный узел графа: заявка на нём считается завершённой. */
export const TERMINAL: string = graph.order.filter((id) => (graph.next[id] ?? []).length === 0)[0]!;
export const START = graph.order[0]!;

const move = (to: string, at: string, sla?: SlaState): Move => ({ step: 1, from: START, to, actor: "auto", note: "проверка", at, sla });

const paused: SlaState = { ...startSla("routine", 0), paused: true, pauseReason: "погода", pausedAt: 100 };

export const incidents: readonly Incident[] = [
  { id: "З-101", category: "elevator", title: "Авария подъезда", address: "ул. Тестовая, 1", reporter: "Житель дома", channel: "телефон", priority: "urgent", nodeId: "U6", situationId: "С9", sla: startSla("urgent", 0), history: [move("U6", "2026-01-01T02:00:00.000Z", startSla("urgent", 0))], createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "З-102", category: "road", title: "Яма на дороге", address: "ул. Тестовая, 2", reporter: "Старший по подъезду", channel: "сайт", priority: "normal", nodeId: START, situationId: "С12", sla: startSla("normal", 0), history: [], createdAt: "2026-01-05T00:00:00.000Z" },
  { id: "З-103", category: "water", title: "Течь в подвале", address: "ул. Тестовая, 3", reporter: "Представитель УК", channel: "почта", priority: "urgent", nodeId: TERMINAL, situationId: "С9", sla: startSla("urgent", 0), history: [move("U6", "2025-12-26T02:00:00.000Z", startSla("urgent", 0)), move(TERMINAL, "2026-01-03T10:00:00.000Z", startSla("urgent", 0))], createdAt: "2025-12-25T00:00:00.000Z" },
  { id: "З-104", category: "lighting", title: "Тёмный двор", address: "ул. Тестовая, 4", reporter: "Житель дома", channel: "мессенджер", priority: "routine", nodeId: "U14", situationId: "С20", sla: paused, history: [move("U14", "2026-01-07T05:00:00.000Z", paused)], createdAt: "2026-01-06T00:00:00.000Z" },
  { id: "З-105", category: "garbage", title: "Мусор у площадки", address: "ул. Тестовая, 5", reporter: "Анонимное сообщение", channel: "телефон", priority: "none", nodeId: START, situationId: "С30", sla: startSla("none", 0), history: [], createdAt: "2026-01-08T00:00:00.000Z" },
];

const record = (
  type: "submitted" | "approved" | "rejected" | "reopened",
  at: string,
  byUserId: string,
  accountableDepartmentId: string | null,
  reason: string | null = null,
) => ({ type, at, byUserId, reason, accountableDepartmentId });

export const lifecycles: Readonly<Record<string, IncidentLifecycle>> = {
  "З-101": { incidentId: "З-101", organizationId: "ORG-DEMO", status: "pending_review", records: [record("submitted", "2026-01-04T10:00:00.000Z", "USR-EXECUTOR", "DEP-A2")] },
  "З-103": {
    incidentId: "З-103",
    organizationId: "ORG-DEMO",
    status: "completed",
    records: [record("submitted", "2026-01-03T12:00:00.000Z", "USR-EXECUTOR", "DEP-A2"), record("approved", "2026-01-04T09:00:00.000Z", "USR-CONTROL", "DEP-A2")],
  },
  "З-104": { incidentId: "З-104", organizationId: "ORG-DEMO", status: "reopened", records: [record("reopened", "2026-01-09T09:00:00.000Z", "USR-CONTROL", "DEP-A1", "проблема повторилась")] },
};

export const assignments: readonly IncidentAssignment[] = [
  { id: "AS-0001", organizationId: "ORG-DEMO", incidentId: "З-101", departmentId: "DEP-A2", employeeId: "EMP-101", assignmentType: "accountable", status: "active", assignedAt: "2026-01-05T08:00:00.000Z", assignedByUserId: "USR-DISPATCHER", endedAt: null, endedByUserId: null, reason: null, result: null },
  { id: "AS-0002", organizationId: "ORG-DEMO", incidentId: "З-104", departmentId: "DEP-A1", employeeId: null, assignmentType: "participant", status: "completed", assignedAt: "2025-12-30T08:00:00.000Z", assignedByUserId: "USR-DISPATCHER", endedAt: "2026-01-09T08:00:00.000Z", endedByUserId: "USR-CONTROL", reason: null, result: "закрыто" },
];

export const integrationDirectory: OrgDirectory = {
  organizations: [{ id: "ORG-DEMO", name: "Демо (тест)", active: true, createdAt: "2025-12-01T09:00:00.000Z" }],
  departments: [
    { id: "DEP-A1", organizationId: "ORG-DEMO", parentId: null, name: "Диспетчерская (демо)", active: true, createdAt: "2025-12-01T09:00:00.000Z" },
    { id: "DEP-A2", organizationId: "ORG-DEMO", parentId: null, name: "ЖКХ (демо)", active: true, createdAt: "2025-12-01T09:00:00.000Z" },
  ],
  employees: [],
  users: [],
  memberships: [],
};
