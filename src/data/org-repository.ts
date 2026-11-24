/**
 * Адаптер репозитория в памяти (UX-3): пока хранилища нет, снимок живёт в памяти процесса.
 * Позже на те же порты подключается адаптер с сохранением — домен менять не придётся.
 */
import { failed } from "../core/org/directory.ts";
import { buildOrgStory } from "../core/org/demo-story.ts";
import {
  accountableOf,
  activeAssignmentsOf,
  type CompletionInput,
  type CompletionResult,
  type IncidentLifecycle,
} from "../core/org/completion.ts";
import { assignmentsOfDepartment, incidentIdsOf, type OrgQuery, type OrgRepository } from "../core/org/repository.ts";
import { applyAssignmentResult, applyCompletionResult, assignmentInput, completionInput, type OrgWorkspace } from "../core/org/workspace.ts";
import { DEMO_ORGANIZATION_ID } from "./org-demo.ts";
import type { AssignmentInput, AssignmentResult } from "../core/org/assignment-types.ts";
import type { IncidentRef } from "../core/org/types.ts";
import type { Graph } from "../types.ts";

export interface DemoOrgRepository {
  readonly repository: OrgRepository;
  readonly organizationId: string;
  readonly incidentIds: readonly string[];
}

/** Репозиторий с запоминанием снимка: load/save и выполнение операций. */
export const createOrgRepository = (initial: OrgWorkspace): OrgRepository => {
  let workspace: OrgWorkspace = initial;
  const organizationId = initial.directory.organizations[0]?.id ?? "";
  const query: OrgQuery = {
    organizationId,
    directory: initial.directory,
    get incidentIds(): readonly string[] {
      return incidentIdsOf(workspace.assignments);
    },
    assignmentsOf: (incidentId) => workspace.assignments.filter((item) => item.incidentId === incidentId),
    activeAssignmentsOf: (incidentId) => activeAssignmentsOf(workspace.assignments, incidentId),
    accountableOf: (incidentId) => accountableOf(workspace.assignments, incidentId),
    participantsOf: (incidentId) =>
      activeAssignmentsOf(workspace.assignments, incidentId).filter((item) => item.assignmentType === "participant"),
    eventsOf: (incidentId) => workspace.events.filter((event) => event.entityId === incidentId),
    lifecycleOf: (incidentId): IncidentLifecycle | undefined => workspace.lifecycles[incidentId],
    incidentIdsOfDepartment: (departmentId) => assignmentsOfDepartment(workspace.assignments, departmentId),
    allLifecycles: () => workspace.lifecycles,
    allAssignments: () => workspace.assignments,
  };
  return {
    ...query,
    load: () => workspace,
    save: (next) => {
      workspace = next;
    },
    runAssignment: (incident: IncidentRef, operation: (input: AssignmentInput) => AssignmentResult): AssignmentResult => {
      const result = operation(assignmentInput(workspace, incident));
      workspace = applyAssignmentResult(workspace, result);
      return result;
    },
    runCompletion: (incidentId: string, operation: (input: CompletionInput) => CompletionResult): CompletionResult => {
      const input = completionInput(workspace, incidentId);
      if (!input) return failed("жизненный цикл обращения не заведён: " + incidentId);
      const result = operation(input);
      workspace = applyCompletionResult(workspace, result);
      return result;
    },
  };
};

/** Демо-репозиторий: те же данные, что и в орг-истории, но через порты. */
export const createDemoOrgRepository = (graph: Graph, seed = 7): DemoOrgRepository => {
  const orgStory = buildOrgStory(graph, seed);
  const repository = createOrgRepository({
    directory: orgStory.directory,
    assignments: orgStory.assignments,
    events: orgStory.events,
    lifecycles: orgStory.lifecycles,
  });
  return { repository, organizationId: DEMO_ORGANIZATION_ID, incidentIds: repository.incidentIds };
};
