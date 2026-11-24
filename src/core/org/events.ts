import { EVENT_SCHEMA_VERSION, type DomainEvent, type DomainEventType, type EntityType } from "./types.ts";

export interface EventInput {
  readonly id: string;
  readonly organizationId: string;
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly eventType: DomainEventType;
  readonly occurredAt: string;
  readonly actorUserId?: string | null;
  readonly payload?: Readonly<Record<string, string | number | null>>;
}

/** Фабрика события: единый формат и версия схемы для всей истории. */
export const makeEvent = (input: EventInput): DomainEvent => ({
  id: input.id,
  organizationId: input.organizationId,
  entityId: input.entityId,
  entityType: input.entityType,
  eventType: input.eventType,
  occurredAt: input.occurredAt,
  actorUserId: input.actorUserId ?? null,
  payload: input.payload ?? {},
  schemaVersion: EVENT_SCHEMA_VERSION,
});

/** Append-only: история только дополняется, прежние события не изменяются. */
export const appendEvents = (
  history: readonly DomainEvent[],
  added: readonly DomainEvent[],
): readonly DomainEvent[] => [...history, ...added];

/** Последовательный идентификатор события: EV-0001, EV-0002, … — детерминированно. */
export const nextEventId = (history: readonly DomainEvent[]): string =>
  "EV-" + String(history.length + 1).padStart(4, "0");

/** Последовательный идентификатор назначения: AS-0001, AS-0002, … */
export const nextAssignmentId = (assignments: readonly { readonly id: string }[]): string => {
  let max = 0;
  for (const assignment of assignments) {
    const parsed = Number(assignment.id.replace(/[^0-9]/g, ""));
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }
  return "AS-" + String(max + 1).padStart(4, "0");
};

/** События одного обращения в порядке появления. */
export const eventsFor = (history: readonly DomainEvent[], entityId: string): readonly DomainEvent[] =>
  history.filter((event) => event.entityId === entityId);

/** События заданного типа (для отчётов и проверок). */
export const eventsOfType = (history: readonly DomainEvent[], type: DomainEventType): readonly DomainEvent[] =>
  history.filter((event) => event.eventType === type);
