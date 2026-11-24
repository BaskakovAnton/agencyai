/** Шаги истории, следующие варианты и участники карточки: выделено из incident.ts (лимит 200 строк). */
import { branchesOf, neighborsOf } from "../core/graph.ts";
import { NODE_MESSAGES } from "../data/messages.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { branchShares } from "../data/edges.ts";
import { formatStamp, historyUpTo } from "../core/timeline.ts";
import type { Graph, Incident, RoleId } from "../types.ts";

export interface StepRow {
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly caption: string;
  readonly state: "done" | "current" | "next";
  readonly fromHistory: boolean;
}

export interface NextOption {
  readonly to: string;
  readonly title: string;
  readonly percent: number;
}

export interface Participant {
  readonly initials: string;
  readonly name: string;
  readonly note: string;
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

/** Пройденные шаги + текущий: последний переход не дублируется, а помечается текущим. */
export const buildSteps = (
  graph: Graph,
  incident: Incident,
  nodeId: string,
  nodeTitle: string,
  beforeCreation: boolean,
  day: string,
): readonly StepRow[] => {
  const history: StepRow[] = (beforeCreation ? [] : historyUpTo(incident, day)).map((move) => {
    const moveRole = NODE_MESSAGES[move.to]?.role;
    return {
      nodeId: move.to,
      nodeTitle: graph.byId[move.to]?.title ?? move.to,
      caption: (moveRole === undefined ? "" : ROLE_NAMES[moveRole] + " · ") + (move.at === undefined ? "" : formatStamp(move.at)),
      state: "done" as const,
      fromHistory: true,
    };
  });
  const current: StepRow = {
    nodeId,
    nodeTitle,
    caption: beforeCreation ? "Начальный узел процесса" : "Текущий этап · SLA контролируется",
    state: "current",
    fromHistory: false,
  };
  const last = history.at(-1);
  return last !== undefined && last.nodeId === nodeId
    ? [...history.slice(0, -1), { ...last, caption: last.caption + " · текущий этап", state: "current" }]
    : [...history, current];
};

export interface NextSteps {
  readonly options: readonly NextOption[];
  /** Есть ли у узла развилка (несколько веток с весами). */
  readonly branched: boolean;
}

/** Следующие шаги: веса развилки или обычные рёбра графа. */
export const buildNext = (graph: Graph, nodeId: string): NextSteps => {
  const branches = branchesOf(graph, nodeId);
  return branches.length > 0
    ? {
        options: branchShares(branches).map((share) => ({ to: share.to, title: graph.byId[share.to]?.title ?? "", percent: share.percent })),
        branched: true,
      }
    : {
        options: neighborsOf(graph, nodeId).next.map((to) => ({ to, title: graph.byId[to]?.title ?? "", percent: 0 })),
        branched: false,
      };
};

/** Роли, участвовавшие в обращении (резервное представление, когда орг-модель не подключена). */
export const buildParticipants = (
  role: RoleId | undefined,
  incident: Incident,
  beforeCreation: boolean,
  day: string,
): readonly Participant[] => {
  const roles: RoleId[] = [];
  if (role !== undefined) roles.push(role);
  for (const move of beforeCreation ? [] : historyUpTo(incident, day)) {
    const moveRole = NODE_MESSAGES[move.to]?.role;
    if (moveRole !== undefined && !roles.includes(moveRole)) roles.push(moveRole);
  }
  return roles.map(participantOf);
};
