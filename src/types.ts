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

/** Запись о перемещении заявки. */
export interface Move {
  readonly step: number;
  readonly from: string;
  readonly to: string;
  readonly actor: "generator" | "operator" | "auto";
  readonly note: string;
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
  readonly history: readonly Move[];
}

/** Граф процесса: порядок узлов и соседи каждого узла. */
export interface Graph {
  readonly order: readonly string[];
  readonly byId: Readonly<Record<string, ProcessNode>>;
  readonly next: Readonly<Record<string, readonly string[]>>;
  readonly prev: Readonly<Record<string, readonly string[]>>;
}

/** Состояние сессии целиком в оперативной памяти. */
export interface Session {
  readonly step: number;
  readonly incidents: readonly Incident[];
  readonly log: readonly string[];
}

/** Результат операции перемещения (без исключений — функциональный стиль). */
export type MoveResult =
  | { readonly ok: true; readonly incident: Incident }
  | { readonly ok: false; readonly error: string };
