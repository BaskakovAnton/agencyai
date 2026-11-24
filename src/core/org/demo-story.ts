/**
 * Демонстрационная орг-история (UX2-06): детерминированно достраивает к Story
 * организацию, назначения, события и жизненный цикл подтверждения.
 * Существующий Story Generator не изменяется — Story берётся как есть.
 */
import { addHours } from "../timeline.ts";
import { buildStory, type Story } from "../story.ts";
import { DEMO_ORGANIZATION_ID, ORG_DIRECTORY, departmentForCategory, employeeOfDepartment, participantForCategory } from "../../data/org-demo.ts";
import { addParticipantDepartment, assignDepartment, assignEmployee } from "./assignments.ts";
import { reassignAccountableDepartment } from "./assignment-changes.ts";
import { APPROVE_USER, DISPATCH_USER, EXECUTOR_USER, type OrgStory } from "./demo-story-types.ts";
import { approveCompletion, reopenIncident, submitExecution } from "./completion.ts";
import type { Graph, Incident } from "../../types.ts";
import type { DomainEvent, IncidentAssignment, IncidentRef, OrgDirectory } from "./types.ts";
import type { IncidentLifecycle } from "./completion.ts";

interface Step {
  readonly assignments: readonly IncidentAssignment[];
  readonly events: readonly DomainEvent[];
}

const must = <T extends { ok: boolean }>(result: T, context: string): Extract<T, { ok: true }> => {
  if (!result.ok) throw new Error("демо-сценарий (" + context + ")");
  return result as Extract<T, { ok: true }>;
};

/** Назначения обращения: ответственное, при необходимости переназначение, сотрудник и участники. */
const provision = (
  incident: Incident,
  index: number,
  ref: IncidentRef,
  assignedAt: string,
  start: Step,
): Step => {
  let step = start;
  const input = () => ({ directory: ORG_DIRECTORY, assignments: step.assignments, events: step.events, incident: ref });
  const first = must(
    assignDepartment(input(), { departmentId: departmentForCategory(incident.category), at: assignedAt, actorUserId: DISPATCH_USER, reason: "Первичное распределение (демо)" }),
    "assignDepartment " + incident.id,
  );
  step = { assignments: first.assignments, events: first.events };

  if (index % 7 === 3) {
    const moved = must(
      reassignAccountableDepartment(input(), {
        departmentId: participantForCategory(incident.category),
        at: addHours(assignedAt, 6),
        actorUserId: DISPATCH_USER,
        reason: "Демо-переназначение по нагрузке",
      }),
      "reassign " + incident.id,
    );
    step = { assignments: moved.assignments, events: moved.events };
  }

  const accountable = step.assignments.find(
    (item) => item.incidentId === incident.id && item.status === "active" && item.assignmentType === "accountable",
  );
  if (index % 2 === 0 && accountable) {
    const employeeId = employeeOfDepartment(accountable.departmentId, index);
    if (employeeId !== null) {
      const assigned = must(
        assignEmployee(input(), { assignmentId: accountable.id, employeeId, at: addHours(assignedAt, 2), actorUserId: DISPATCH_USER }),
        "assignEmployee " + incident.id,
      );
      step = { assignments: assigned.assignments, events: assigned.events };
    }
  }

  if (index % 3 === 0) {
    const participant = must(
      addParticipantDepartment(input(), {
        departmentId: participantForCategory(incident.category),
        at: addHours(assignedAt, 3),
        actorUserId: DISPATCH_USER,
        reason: "Привлечено к работе (демо)",
      }),
      "addParticipant " + incident.id,
    );
    step = { assignments: participant.assignments, events: participant.events };
  }
  return step;
};

/** Жизненный цикл: ожидание проверки, подтверждение контролёром, повторное открытие. */
const scenario = (
  index: number,
  ref: IncidentRef,
  assignedAt: string,
  step: Step,
): { readonly step: Step; readonly lifecycle: IncidentLifecycle } => {
  let lifecycle: IncidentLifecycle = { incidentId: ref.id, organizationId: ref.organizationId, status: "active", records: [] };
  const input = () => ({ directory: ORG_DIRECTORY, assignments: step.assignments, events: step.events, lifecycle });
  if (index % 5 !== 2 && index % 11 !== 4) return { step, lifecycle };

  const submitted = must(
    submitExecution(input(), { at: addHours(assignedAt, 12), actorUserId: EXECUTOR_USER, reason: "Работы выполнены (демо)" }),
    "submitExecution " + ref.id,
  );
  lifecycle = submitted.lifecycle;
  step = { assignments: submitted.assignments, events: submitted.events };
  if (index % 11 !== 4) return { step, lifecycle };

  const approved = must(
    approveCompletion(input(), { at: addHours(assignedAt, 20), actorUserId: APPROVE_USER, result: "Подтверждено контролёром (демо)" }),
    "approveCompletion " + ref.id,
  );
  lifecycle = approved.lifecycle;
  step = { assignments: approved.assignments, events: approved.events };
  if (index !== 4) return { step, lifecycle };

  const reopened = must(
    reopenIncident(input(), { at: addHours(assignedAt, 30), actorUserId: APPROVE_USER, reason: "Житель сообщил о повторной проблеме (демо)" }),
    "reopenIncident " + ref.id,
  );
  return { step: { assignments: reopened.assignments, events: reopened.events }, lifecycle: reopened.lifecycle };
};

/** Сборка орг-истории: те же 30 заявок, дополненные назначениями, событиями и проверками. */
export const buildOrgStory = (graph: Graph, seed = 7): OrgStory => {
  const story: Story = buildStory(graph, seed);
  let step: Step = { assignments: [], events: [] };
  const lifecycles: Record<string, IncidentLifecycle> = {};

  story.incidents.forEach((incident, index) => {
    const createdAt = incident.createdAt ?? story.days[0] ?? "2025-12-20T09:00:00.000Z";
    const assignedAt = addHours(createdAt, 1);
    const ref: IncidentRef = { id: incident.id, organizationId: DEMO_ORGANIZATION_ID };
    step = provision(incident, index, ref, assignedAt, step);
    const finished = scenario(index, ref, assignedAt, step);
    step = finished.step;
    lifecycles[incident.id] = finished.lifecycle;
  });

  return { story, directory: ORG_DIRECTORY as OrgDirectory, assignments: step.assignments, events: step.events, lifecycles };
};
