import { messageFor } from "../data/messages.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import type { Graph, Incident, RoleId } from "../types.ts";
import { dayOf } from "./timeline.ts";

export interface ChatMessage {
  readonly id: string;
  readonly incidentId: string;
  readonly nodeId: string;
  readonly at: string;
  readonly day: string;
  readonly role: RoleId;
  readonly author: string;
  readonly text: string;
  readonly kind: "message" | "system";
}

/** Системная реплика на смене роли — по спеке: «заявка передана», «подрядчик назначен». */
export const ROLE_CHANGE_TEXT: Readonly<Record<RoleId, string>> = {
  resident: "Возврат к жителю",
  deputy: "Заявка передана в работу диспетчеру",
  contractor: "Подрядчик назначен",
  assistant: "Подключён помощник",
  observer: "Подключён наблюдатель",
  auditor: "Подключён аудитор",
  system: "Системное событие",
};

/** Переписка по заявке: каждое событие истории — реплика роли, отвечающей за узел. */
export const conversationFor = (graph: Graph, incident: Incident): readonly ChatMessage[] => {
  const created = incident.createdAt ?? "";
  const events = [
    { nodeId: graph.order[0] ?? incident.nodeId, at: created },
    ...incident.history.map((move) => ({ nodeId: move.to, at: move.at ?? created })),
  ];
  const out: ChatMessage[] = [];
  let previousRole: RoleId | null = null;
  events.forEach((event, index) => {
    const message = messageFor(event.nodeId);
    const day = dayOf(event.at);
    if (previousRole !== null && previousRole !== message.role && message.role !== "system") {
      out.push({
        id: incident.id + "@" + event.nodeId + "@" + index + "#system",
        incidentId: incident.id,
        nodeId: event.nodeId,
        at: event.at,
        day,
        role: "system",
        author: ROLE_NAMES.system,
        text: ROLE_CHANGE_TEXT[message.role],
        kind: "system",
      });
    }
    out.push({
      id: incident.id + "@" + event.nodeId + "@" + index,
      incidentId: incident.id,
      nodeId: event.nodeId,
      at: event.at,
      day,
      role: message.role,
      author: ROLE_NAMES[message.role],
      text: message.text,
      kind: message.role === "system" ? "system" : "message",
    });
    previousRole = message.role;
  });
  return out;
};

/** Переписка по состоянию на конец дня: сообщения позже этой даты не показываются. */
export const messagesUpTo = (messages: readonly ChatMessage[], day: string): readonly ChatMessage[] =>
  messages.filter((message) => message.day <= day);

export interface ChatSnapshot {
  readonly messages: readonly ChatMessage[];
  readonly activeRole: RoleId;
  readonly interlocutor: RoleId;
  readonly nodeId: string;
  readonly day: string;
}

/** Состояние чата на дату: кто «вы», с кем диалог и на каком узле заявка. */
export const chatAt = (graph: Graph, incident: Incident, day: string): ChatSnapshot => {
  const messages = messagesUpTo(conversationFor(graph, incident), day);
  const replies = messages.filter((message) => message.kind === "message");
  const last = replies.at(-1);
  const activeRole: RoleId = last?.role ?? "resident";
  const previous = [...replies].reverse().find((message) => message.role !== activeRole);
  const interlocutor: RoleId = previous?.role ?? (activeRole === "resident" ? "deputy" : "resident");
  return { messages, activeRole, interlocutor, nodeId: last?.nodeId ?? graph.order[0] ?? "U1", day };
};
