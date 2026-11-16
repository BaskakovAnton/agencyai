/**
 * Доменные типы терминальной модели «Бюро».
 * Модуль намеренно не зависит от среды исполнения (ни Node, ни Bun, ни DOM) —
 * чтобы ядро потом без правок собралось в бандл для демо на GitHub Pages.
 */

/** Роли процесса (из референса deput). */
export type RoleId =
  | "resident"
  | "deputy"
  | "assistant"
  | "contractor"
  | "system"
  | "observer"
  | "auditor";

/** Уровень доступа роли к узлу процесса. */
export type AccessLevel = "allow" | "subset" | "conditional" | "deny" | "na";

/** Группы узлов процесса. */
export type NodeGroup =
  | "priem"
  | "ispolnenie"
  | "upravlenie"
  | "zakrytie"
  | "prosmotr"
  | "osob";

/** Приоритет обращения. */
export type Priority = "urgent" | "normal" | "routine" | "none";

/** Узел процесса. */
export interface ProcessNode {
  readonly id: string;
  readonly group: NodeGroup;
  readonly title: string;
  readonly desc: string;
  readonly access: Readonly<Record<RoleId, AccessLevel>>;
}

/** Состояние SLA заявки: дедлайн, пауза, просрочка, эскалация. */
export interface SlaState {
  readonly dueAt: number;
  readonly paused: boolean;
  readonly pauseReason: string;
  readonly pausedAt: number;
  readonly breached: boolean;
  readonly escalated: boolean;
}

/** Раздел регламента, к которому относится ситуация. */
export type SituationSection = "before" | "during" | "contractors" | "feedback";

/** Шаг ситуации: кто действует и что делает. */
export interface SituationStep {
  readonly lane: RoleId;
  readonly title: string;
  readonly text: string;
}

/** Типовая ситуация регламента (С1…С37) со шагами по ролям. */
export interface Situation {
  readonly id: string;
  readonly section: SituationSection;
  readonly title: string;
  readonly summary: string;
  readonly priority: Priority;
  readonly sla: string;
  readonly steps: readonly SituationStep[];
}

/** Запись о перемещении заявки. */
export interface Move {
  readonly step: number;
  readonly from: string;
  readonly to: string;
  readonly actor: "generator" | "operator" | "auto";
  readonly note: string;
  /** Когда произошёл переход (ISO). Заполняется демо-историей для перемотки времени. */
  readonly at?: string;
}

/** Заявка по инциденту городской инфраструктуры. */
export interface Incident {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly address: string;
  readonly reporter: string;
  readonly priority: Priority;
  readonly nodeId: string;
  /** Ситуация регламента, которую проигрывает заявка (С1…С37). */
  readonly situationId: string;
  readonly sla: SlaState;
  readonly history: readonly Move[];
  /** Когда заявка создана (ISO). Заполняется демо-историей. */
  readonly createdAt?: string;
}

/** Ветка процесса: куда можно уйти и с каким весом (для рандомного решения). */
export interface Branch {
  readonly to: string;
  readonly weight: number;
  readonly note: string;
}

/** Граф процесса: порядок узлов, соседи и развилки каждого узла. */
export interface Graph {
  readonly order: readonly string[];
  readonly byId: Readonly<Record<string, ProcessNode>>;
  readonly next: Readonly<Record<string, readonly string[]>>;
  readonly prev: Readonly<Record<string, readonly string[]>>;
  readonly branches: Readonly<Record<string, readonly Branch[]>>;
}

/** Состояние сессии целиком в оперативной памяти. */
export interface Session {
  readonly step: number;
  /** Роль оператора: её права проверяются при переходах. */
  readonly role: RoleId;
  /** Часы с начала прогона: время двигают шаги процесса и команда wait. */
  readonly clock: number;
  readonly incidents: readonly Incident[];
  readonly log: readonly string[];
}

/** Результат операции перемещения (без исключений — функциональный стиль). */
export type MoveResult =
  | { readonly ok: true; readonly incident: Incident }
  | { readonly ok: false; readonly error: string };
