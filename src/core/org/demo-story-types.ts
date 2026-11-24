import type { Story } from "../story.ts";
import type { IncidentLifecycle } from "./completion.ts";
import type { DomainEvent, IncidentAssignment, OrgDirectory } from "./types.ts";

/** Пользователи демонстрационного сценария (тестовые, не реальные). */
export const DISPATCH_USER = "USR-DISPATCHER";
export const EXECUTOR_USER = "USR-EXECUTOR";
export const APPROVE_USER = "USR-CONTROL";

/** Орг-история: исходная Story плюс организация, назначения, события и жизненные циклы. */
export interface OrgStory {
  readonly story: Story;
  readonly directory: OrgDirectory;
  readonly assignments: readonly IncidentAssignment[];
  readonly events: readonly DomainEvent[];
  readonly lifecycles: Readonly<Record<string, IncidentLifecycle>>;
}
