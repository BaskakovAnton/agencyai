/**
 * Роли, уровни доступа, группы узлов и приоритеты — словарь модели.
 * Данные взяты из публичного прототипа deput (matrix.html).
 */
import type { AccessLevel, NodeGroup, Priority, RoleId } from "../types.ts";

export const ROLE_IDS: readonly RoleId[] = [
  "resident",
  "deputy",
  "assistant",
  "contractor",
  "system",
  "observer",
  "auditor",
];

export const ROLE_NAMES: Readonly<Record<RoleId, string>> = {
  resident: "Житель",
  deputy: "Депутат-диспетчер",
  assistant: "Помощник",
  contractor: "Подрядчик",
  system: "Система",
  observer: "Наблюдатель",
  auditor: "Аудитор",
};

export const ACCESS_MARKS: Readonly<Record<AccessLevel, string>> = {
  allow: "✓",
  subset: "⊂",
  conditional: "!",
  deny: "✕",
  na: "—",
};

export const ACCESS_TITLES: Readonly<Record<AccessLevel, string>> = {
  allow: "может",
  subset: "только в своём",
  conditional: "при условии",
  deny: "запрещено",
  na: "не участвует",
};

export const GROUP_TITLES: Readonly<Record<NodeGroup, string>> = {
  priem: "Приём",
  ispolnenie: "Исполнение",
  upravlenie: "Управление",
  zakrytie: "Закрытие",
  prosmotr: "Просмотр",
  osob: "Особые",
};

export const PRIORITY_TITLES: Readonly<Record<Priority, string>> = {
  urgent: "авария / экстренно",
  normal: "неотложное",
  routine: "обычное / сезонное",
  none: "вне SLA",
};

/** Разбор компактной записи доступа: "allow allow na ..." в порядке ROLE_IDS. */
export const toAccess = (spec: string): Readonly<Record<RoleId, AccessLevel>> => {
  const parts = spec.trim().split(/\s+/);
  if (parts.length !== ROLE_IDS.length) {
    throw new Error("toAccess: ожидалось " + ROLE_IDS.length + " уровней, получено " + parts.length);
  }
  const out: Partial<Record<RoleId, AccessLevel>> = {};
  ROLE_IDS.forEach((role, i) => {
    out[role] = parts[i] as AccessLevel;
  });
  return out as Readonly<Record<RoleId, AccessLevel>>;
};
