/**
 * Порты доступа к данным организации (UX-3). Интерфейсы определены доменом,
 * реализация хранилища подключается адаптером. Backend и БД здесь не появляются.
 */
import type { CompletionInput, CompletionResult, IncidentLifecycle } from "./completion.ts";
import type { AssignmentInput, AssignmentResult } from "./assignment-types.ts";
import type { DomainEvent, IncidentAssignment, IncidentRef, OrgDirectory } from "./types.ts";
import type { OrgWorkspace } from "./workspace.ts";

/** Чтение: запросы, которыми пользуются экраны и отчёты. */
export interface OrgQuery {
  readonly organizationId: string;
  readonly directory: OrgDirectory;
  readonly incidentIds: readonly string[];
  assignmentsOf(incidentId: string): readonly IncidentAssignment[];
  activeAssignmentsOf(incidentId: string): readonly IncidentAssignment[];
  accountableOf(incidentId: string): IncidentAssignment | undefined;
  participantsOf(incidentId: string): readonly IncidentAssignment[];
  eventsOf(incidentId: string): readonly DomainEvent[];
  lifecycleOf(incidentId: string): IncidentLifecycle | undefined;
  /** Обращения, в которых подразделение участвует или отвечает (обратный индекс). */
  incidentIdsOfDepartment(departmentId: string): readonly string[];
}

/** Запись: снимок целиком. Адаптеры решают, как его сохранить. */
export interface OrgStorePort {
  load(): OrgWorkspace;
  save(workspace: OrgWorkspace): void;
}

/** Выполнение доменной операции с сохранением результата. */
export interface OrgCommandPort {
  runAssignment(incident: IncidentRef, operation: (input: AssignmentInput) => AssignmentResult): AssignmentResult;
  runCompletion(incidentId: string, operation: (input: CompletionInput) => CompletionResult): CompletionResult;
}

/** Полный репозиторий: чтение, запись и выполнение операций. */
export interface OrgRepository extends OrgQuery, OrgStorePort, OrgCommandPort {}

/** Универсальный проход по обращениям: используется и адаптером, и отчётами. */
export const incidentIdsOf = (assignments: readonly IncidentAssignment[]): readonly string[] => [
  ...new Set(assignments.map((assignment) => assignment.incidentId)),
];

export const assignmentsOfDepartment = (
  assignments: readonly IncidentAssignment[],
  departmentId: string,
): readonly string[] => [...new Set(assignments.filter((item) => item.departmentId === departmentId).map((item) => item.incidentId))];
