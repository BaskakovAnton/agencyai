import { normalizeRef } from "../core/refs.ts";
import { slaPhaseOnDay, slaStateAt, type SlaPhase } from "../core/sla-at.ts";
import { addHours, dayOf, DEMO_ORIGIN, formatStamp, incidentAt, isVisible } from "../core/timeline.ts";
import { NODE_MESSAGES } from "../data/messages.ts";
import { GROUP_TITLES, PRIORITY_TITLES, ROLE_NAMES } from "../data/roles.ts";
import { SLA_PROFILES } from "../data/sla.ts";
import { situationById } from "../data/situations.ts";
import type { Graph, Incident, Priority } from "../types.ts";
import { PHASE_TITLES, PHASE_TONES, slaHoursLeft, type Tone } from "./overview.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import { availableOrgActions, incidentOrgSummary, type IncidentOrgSummary, type OrgActions } from "./org-integration.ts";
import { buildNext, buildParticipants, buildSteps } from "./incident-steps.ts";

export type { NextOption, NextSteps, Participant, StepRow } from "./incident-steps.ts";
import type { NextOption, Participant, StepRow } from "./incident-steps.ts";

export interface FactRow {
  readonly label: string;
  readonly value: string;
  readonly tone?: Tone;
}

export interface IncidentView {
  readonly id: string;
  readonly caseLabel: string;
  readonly title: string;
  readonly category: string;
  readonly createdLabel: string;
  readonly address: string;
  readonly reporter: string;
  readonly channel: string;
  readonly priority: Priority;
  readonly priorityTitle: string;
  readonly priorityTone: Tone;
  readonly situationTitle: string;
  readonly description: string;
  readonly beforeCreation: boolean;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly nodeRoleTitle: string;
  readonly facts: readonly FactRow[];
  readonly phase: SlaPhase;
  readonly phaseTitle: string;
  readonly slaTone: Tone;
  readonly slaBig: string;
  readonly slaNote: string;
  readonly normTitle: string;
  readonly pauseText: string;
  readonly steps: readonly StepRow[];
  readonly next: readonly NextOption[];
  readonly branched: boolean;
  readonly participants: readonly Participant[];
  /** Орг-модель (UX-4): ответственное подразделение, участники и состояние подтверждения. */
  readonly orgSummary: IncidentOrgSummary | null;
  /** Доступные операции подтверждения для выбранного пользователя. */
  readonly actions: OrgActions | null;
  /** Текущий пользователь действий и список демонстрационных пользователей. */
  readonly actorUserId: string | null;
  readonly actorOptions: readonly { readonly id: string; readonly label: string }[];
}

/** Крупное значение и пояснение SLA на выбранную дату. */
const slaHeadline = (phase: SlaPhase, left: number): { readonly big: string; readonly note: string } => {
  if (phase === "overdue") return { big: "+" + Math.abs(left) + " ч", note: "Превышение норматива" };
  if (phase === "ok") return { big: "Осталось " + Math.max(0, left) + " ч", note: "В пределах норматива" };
  if (phase === "paused") return { big: "На паузе", note: "Отсчёт приостановлен" };
  return { big: "Норматив не задан", note: "Норматив для приоритета не задан" };
};

const priorityToneFor = (priority: Priority): Tone =>
  priority === "urgent" ? "red" : priority === "normal" ? "amber" : "gray";

/**
 * Карточка обращения на выбранный день. Все значения — из модели:
 * SLA — из slaPhaseOnDay и slaStateAt, история — из historyUpTo, роли — из NODE_MESSAGES.
 */
export const buildIncidentView = (
  graph: Graph,
  incidents: readonly Incident[],
  ref: string,
  day: string,
  org?: OrgQuery,
  actorUserId: string | null = null,
): IncidentView | null => {
  const id = normalizeRef(ref);
  const incident = incidents.find((item) => item.id === id);
  if (!incident) return null;

  const beforeCreation = !isVisible(incident, day);
  const asOf = beforeCreation ? incident : incidentAt(incident, day);
  const nodeId = beforeCreation ? incident.history[0]?.to ?? graph.order[0] ?? "U1" : asOf.nodeId;
  const node = graph.byId[nodeId];
  const situation = situationById(incident.situationId);
  const state = slaStateAt(incident, day);
  const phase: SlaPhase = beforeCreation ? "none" : slaPhaseOnDay(incident, day);
  const profile = SLA_PROFILES[incident.priority];
  const role = NODE_MESSAGES[nodeId]?.role;
  const roleTitle = role === undefined ? "" : ROLE_NAMES[role];
  const headline = slaHeadline(phase, slaHoursLeft(incident, day));
  const orgSummary = org === undefined ? null : incidentOrgSummary(org, incident.id);
  const next = buildNext(graph, nodeId);

  const facts: FactRow[] = [
    { label: "Текущий этап", value: nodeId + " · " + (node?.title ?? "") },
    { label: "Состояние SLA", value: PHASE_TITLES[phase], tone: PHASE_TONES[phase] },
    {
      label: orgSummary === null ? "Ответственная роль" : "Ответственное подразделение",
      value:
        orgSummary === null
          ? roleTitle === "" ? "Нет данных" : roleTitle
          : orgSummary.accountableName === "" ? "Нет данных" : orgSummary.accountableName,
    },
    { label: "Связанная ситуация", value: situation?.title ?? "Нет данных" },
  ];
  const channel = incident.channel ?? "";
  if (channel !== "") facts.push({ label: "Канал обращения", value: channel });
  if (orgSummary !== null) facts.push({ label: "Состояние подтверждения", value: orgSummary.statusTitle });

  return {
    id: incident.id,
    caseLabel: "Обращение " + incident.id,
    title: incident.title,
    category: incident.category,
    createdLabel: incident.createdAt === undefined ? "дата неизвестна" : formatStamp(incident.createdAt),
    address: incident.address,
    reporter: incident.reporter,
    channel,
    priority: incident.priority,
    priorityTitle: PRIORITY_TITLES[incident.priority],
    priorityTone: priorityToneFor(incident.priority),
    situationTitle: situation?.title ?? "",
    description: (situation?.summary ?? "") === "" ? (node?.desc ?? "Нет данных") : situation!.summary,
    beforeCreation,
    nodeId,
    nodeTitle: node?.title ?? "",
    nodeRoleTitle: roleTitle,
    facts,
    phase,
    phaseTitle: PHASE_TITLES[phase],
    slaTone: PHASE_TONES[phase],
    slaBig: headline.big,
    slaNote: headline.note,
    normTitle: profile.title,
    pauseText: state.paused ? "Пауза: " + state.pauseReason : "Нет активной паузы",
    steps: buildSteps(graph, incident, nodeId, node?.title ?? nodeId, beforeCreation, day),
    next: next.options,
    branched: next.branched,
    participants: buildParticipants(role, incident, beforeCreation, day),
    orgSummary,
    actions: org === undefined ? null : availableOrgActions(org, incident.id, actorUserId),
    actorUserId,
    actorOptions: org === undefined ? [] : org.directory.users.map((user) => ({ id: user.id, label: user.displayName })),
  };
};

export { addHours, dayOf, DEMO_ORIGIN, GROUP_TITLES };
