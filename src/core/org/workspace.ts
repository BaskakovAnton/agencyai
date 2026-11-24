/**
 * Рабочее пространство организации (UX-3): неизменяемый снимок доменных данных,
 * который читают и заменяют репозитории. Операции домена остаются чистыми.
 */
import { accountableOf, activeAssignmentsOf, type CompletionInput, type CompletionResult, type IncidentLifecycle } from "./completion.ts";
import type { AssignmentInput, AssignmentResult } from "./assignment-types.ts";
import type { DomainEvent, IncidentAssignment, IncidentRef, OrgDirectory } from "./types.ts";

export interface OrgWorkspace {
  readonly directory: OrgDirectory;
  readonly assignments: readonly IncidentAssignment[];
  readonly events: readonly DomainEvent[];
  readonly lifecycles: Readonly<Record<string, IncidentLifecycle>>;
}

export const workspaceOf = (
  directory: OrgDirectory,
  assignments: readonly IncidentAssignment[] = [],
  events: readonly DomainEvent[] = [],
  lifecycles: Readonly<Record<string, IncidentLifecycle>> = {},
): OrgWorkspace => ({ directory, assignments, events, lifecycles });

/** Вход операции назначения из снимка: домен не знает, откуда пришли данные. */
export const assignmentInput = (workspace: OrgWorkspace, incident: IncidentRef): AssignmentInput => ({
  directory: workspace.directory,
  assignments: workspace.assignments,
  events: workspace.events,
  incident,
});

/** Вход операции завершения; undefined — если жизненный цикл обращения не заведён. */
export const completionInput = (workspace: OrgWorkspace, incidentId: string): CompletionInput | undefined => {
  const lifecycle = workspace.lifecycles[incidentId];
  if (!lifecycle) return undefined;
  return { directory: workspace.directory, assignments: workspace.assignments, lifecycle, events: workspace.events };
};

/** Применение результата операции назначения: неуспех не меняет снимок. */
export const applyAssignmentResult = (workspace: OrgWorkspace, result: AssignmentResult): OrgWorkspace =>
  result.ok ? { ...workspace, assignments: result.assignments, events: result.events } : workspace;

/** Применение результата операции завершения: жизненный цикл заменяется новым значением. */
export const applyCompletionResult = (workspace: OrgWorkspace, result: CompletionResult): OrgWorkspace =>
  result.ok
    ? {
        ...workspace,
        assignments: result.assignments,
        events: result.events,
        lifecycles: { ...workspace.lifecycles, [result.lifecycle.incidentId]: result.lifecycle },
      }
    : workspace;

/** Прямая замена жизненного цикла (например, при загрузке из хранилища). */
export const withLifecycle = (workspace: OrgWorkspace, lifecycle: IncidentLifecycle): OrgWorkspace => ({
  ...workspace,
  lifecycles: { ...workspace.lifecycles, [lifecycle.incidentId]: lifecycle },
});

/** Активные назначения обращения — для чтения наружу. */
export const activeAssignments = (workspace: OrgWorkspace, incidentId: string): readonly IncidentAssignment[] =>
  activeAssignmentsOf(workspace.assignments, incidentId);

export const accountableAssignment = (workspace: OrgWorkspace, incidentId: string): IncidentAssignment | undefined =>
  accountableOf(workspace.assignments, incidentId);
