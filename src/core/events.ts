import { messageFor } from "../data/messages.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { hoursFor } from "../data/sla.ts";
import type { Graph, Incident, NodeGroup, RoleId, SlaState } from "../types.ts";
import { slaPhaseAtEvent, type SlaPhase } from "./sla-at.ts";
import { dayOf, visibleAt } from "./timeline.ts";

/** Событие процесса: создание заявки или переход на узел. */
export interface DayEvent {
  readonly id: string;
  readonly incidentId: string;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly group: NodeGroup;
  readonly at: string;
  readonly day: string;
  readonly role: RoleId;
  readonly roleName: string;
  readonly text: string;
  readonly hoursInNode: number;
  readonly slaPhase: SlaPhase;
}

/**
 * События процесса до выбранного дня включительно: раньше это делала модель Git-графа,
 * после её удаления список событий считается прямо по истории заявок.
 */
export const dayEvents = (
  graph: Graph,
  incidents: readonly Incident[],
  day: string,
  filter = "",
): readonly DayEvent[] => {
  const events: DayEvent[] = [];
  for (const incident of visibleAt(incidents, day)) {
    if (filter !== "" && incident.id !== filter) continue;
    const steps: readonly { nodeId: string; at: string; sla: SlaState | undefined }[] = [
      { nodeId: graph.order[0] ?? incident.nodeId, at: incident.createdAt ?? "", sla: undefined },
      ...incident.history.map((move) => ({ nodeId: move.to, at: move.at ?? "", sla: move.sla })),
    ];
    steps.forEach((step, index) => {
      if (step.at === "" || dayOf(step.at) > day) return;
      const node = graph.byId[step.nodeId];
      const message = messageFor(step.nodeId);
      events.push({
        id: incident.id + "#" + index,
        incidentId: incident.id,
        nodeId: step.nodeId,
        nodeTitle: node?.title ?? "",
        group: (node?.group ?? "priem") as NodeGroup,
        at: step.at,
        day: dayOf(step.at),
        role: message.role,
        roleName: ROLE_NAMES[message.role],
        text: message.text,
        hoursInNode: hoursFor(step.nodeId),
        slaPhase: slaPhaseAtEvent(incident, step.at, step.sla),
      });
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at) || a.incidentId.localeCompare(b.incidentId));
};
