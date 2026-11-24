import { branchesOf, neighborsOf } from "../core/graph.ts";
import { normalizeRef } from "../core/refs.ts";
import { slaPhaseOnDay, slaStateAt, type SlaPhase } from "../core/sla-at.ts";
import { DEMO_ORIGIN, addHours, dayOf, formatStamp, historyUpTo, incidentAt, isVisible } from "../core/timeline.ts";
import { branchShares } from "../data/edges.ts";
import { NODE_MESSAGES } from "../data/messages.ts";
import { GROUP_TITLES, PRIORITY_TITLES, ROLE_NAMES } from "../data/roles.ts";
import { SLA_PROFILES } from "../data/sla.ts";
import { situationById } from "../data/situations.ts";
import type { Graph, Incident, Priority, RoleId } from "../types.ts";
import { PHASE_TITLES, PHASE_TONES, slaHoursLeft, type Tone } from "./overview.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import { availableOrgActions, incidentOrgSummary, type IncidentOrgSummary, type OrgActions } from "./org-integration.ts";

export interface FactRow {
  readonly label: string;
  readonly value: string;
  readonly tone?: Tone;
}

export interface StepRow {
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly caption: string;
  readonly state: "done" | "current" | "next";
  readonly fromHistory: boolean;
}

export interface Participant {
  readonly initials: string;
  readonly name: string;
  readonly note: string;
}

export interface NextOption {
  readonly to: string;
  readonly title: string;
  readonly percent: number;
}

export interface IncidentView {
  readonly id: string;
  readonly caseLabel: string;
  readonly title: string;
  readonly category: string;
  readonly createdLabel: string;
  readonly address: string;
  readonly reporter: string;
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

const ROLE_NOTES: Readonly<Record<RoleId, string>> = {
  resident: "Инициатор обращения",
  deputy: "Принятие и маршрутизация",
  contractor: "Исполнитель по заявке",
  assistant: "Подключён к работе",
  system: "Системные события",
  observer: "Наблюдение за ходом",
  auditor: "Проверка и аудит",
};

const initialsOf = (name: string): string =>
  name.split(/[\s-]+/).filter((part) => part.length > 0).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");

const participantOf = (role: RoleId): Participant => ({
  initials: initialsOf(ROLE_NAMES[role]),
  name: ROLE_NAMES[role],
  note: ROLE_NOTES[role],
});

/**
 * Карточка обращения на выбранный день. Все значения — из модели:
 * SLA берётся из `slaPhaseOnDay`/`slaStateAt`, история — из `historyUpTo`,
 * роли — из `NODE_MESSAGES`. Ничего не досчитывается заново.
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
  const left = slaHoursLeft(incident, day);

  const slaBig =
    phase === "overdue" ? "+" + Math.abs(left) + " ч" : phase === "ok" ? "Осталось " + Math.max(0, left) + " ч"
      : phase === "paused" ? "На паузе" : "Норматив не задан";
  const slaNote =
    phase === "overdue" ? "Превышение норматива" : phase === "ok" ? "В пределах норматива"
      : phase === "paused" ? "Отсчёт приостановлен" : "Норматив для приоритета не задан";

  const orgSummary = org === undefined ? null : incidentOrgSummary(org, incident.id);
  const facts: FactRow[] = [
    { label: "Текущий этап", value: nodeId + " · " + (node?.title ?? "") },
    { label: "Состояние SLA", value: PHASE_TITLES[phase], tone: PHASE_TONES[phase] },
    {
      label: orgSummary === null ? "Ответственная роль" : "Ответственное подразделение",
      value: orgSummary === null ? (roleTitle === "" ? "Нет данных" : roleTitle) : (orgSummary.accountableName === "" ? "Нет данных" : orgSummary.accountableName),
    },
    { label: "Связанная ситуация", value: situation?.title ?? "Нет данных" },
  ];
  if (orgSummary !== null) facts.push({ label: "Состояние подтверждения", value: orgSummary.statusTitle });

  const historySteps: StepRow[] = (beforeCreation ? [] : historyUpTo(incident, day)).map((move) => {
    const moveRole = NODE_MESSAGES[move.to]?.role;
    return {
      nodeId: move.to,
      nodeTitle: graph.byId[move.to]?.title ?? move.to,
      caption: (moveRole === undefined ? "" : ROLE_NAMES[moveRole] + " · ") + (move.at === undefined ? "" : formatStamp(move.at)),
      state: "done" as const,
      fromHistory: true,
    };
  });

  const currentStep: StepRow = {
    nodeId,
    nodeTitle: node?.title ?? nodeId,
    caption: beforeCreation ? "Начальный узел процесса" : "Текущий этап · SLA контролируется",
    state: "current",
    fromHistory: false,
  };
  const last = historySteps.at(-1);
  const steps: StepRow[] =
    last !== undefined && last.nodeId === nodeId
      ? [...historySteps.slice(0, -1), { ...last, caption: last.caption + " · текущий этап", state: "current" }]
      : [...historySteps, currentStep];

  const branches = branchesOf(graph, nodeId);
  const next: readonly NextOption[] =
    branches.length > 0
      ? branchShares(branches).map((share) => ({ to: share.to, title: graph.byId[share.to]?.title ?? "", percent: share.percent }))
      : neighborsOf(graph, nodeId).next.map((to) => ({ to, title: graph.byId[to]?.title ?? "", percent: 0 }));

  const roles: RoleId[] = [];
  if (role !== undefined) roles.push(role);
  for (const move of beforeCreation ? [] : historyUpTo(incident, day)) {
    const moveRole = NODE_MESSAGES[move.to]?.role;
    if (moveRole !== undefined && !roles.includes(moveRole)) roles.push(moveRole);
  }

  return {
    id: incident.id,
    caseLabel: "Обращение " + incident.id,
    title: incident.title,
    category: incident.category,
    createdLabel: incident.createdAt === undefined ? "дата неизвестна" : formatStamp(incident.createdAt),
    address: incident.address,
    reporter: incident.reporter,
    priority: incident.priority,
    priorityTitle: PRIORITY_TITLES[incident.priority],
    priorityTone: incident.priority === "urgent" ? "red" : incident.priority === "normal" ? "amber" : "gray",
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
    slaBig,
    slaNote,
    normTitle: profile.title,
    pauseText: state.paused ? "Пауза: " + state.pauseReason : "Нет активной паузы",
    steps,
    next,
    branched: branches.length > 0,
    participants: roles.map(participantOf),
    orgSummary,
    actions: org === undefined ? null : availableOrgActions(org, incident.id, actorUserId),
    actorUserId,
    actorOptions:
      org === undefined ? [] : org.directory.users.map((user) => ({ id: user.id, label: user.displayName })),
  };
};

export { addHours, dayOf, DEMO_ORIGIN, GROUP_TITLES };
