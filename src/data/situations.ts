import type { Situation, SituationSection } from "../types.ts";
import { BEFORE_SITUATIONS } from "./situations/before.ts";
import { DURING_SITUATIONS } from "./situations/during.ts";
import { CONTRACTORS_SITUATIONS } from "./situations/contractors.ts";
import { FEEDBACK_SITUATIONS } from "./situations/feedback.ts";
import { NODE_SITUATIONS } from "./situation-nodes.ts";

/**
 * Все 37 ситуаций регламента в порядке С1…С37.
 * Файлы разделов сгенерированы скриптом `scripts/import-situations.ts` из прототипа deput;
 * этот агрегат и функции поиска —  ручной код поверх сгенерированных данных.
 */
export const SITUATIONS: readonly Situation[] = [
  ...BEFORE_SITUATIONS,
  ...DURING_SITUATIONS,
  ...CONTRACTORS_SITUATIONS,
  ...FEEDBACK_SITUATIONS,
];

export const SITUATION_SECTIONS: Readonly<Record<SituationSection, string>> = {
  before: "8.1 До принятия",
  during: "8.2 В работе",
  contractors: "8.3 Подрядчики и особые",
  feedback: "8.4 Отчётность",
};

/** Гибкая ссылка на ситуацию: 9, С9, c9, s9 → С9. */
export const normalizeSituationId = (ref: string): string => {
  const digits = /\d+/.exec(ref.trim());
  return digits ? "С" + String(Number.parseInt(digits[0] as string, 10)) : ref.trim().toUpperCase();
};

/** Поиск ситуации по id. */
export const situationById = (id: string): Situation | undefined =>
  SITUATIONS.find((item) => item.id === normalizeSituationId(id));

/** Ситуации, встречающиеся на узле процесса. */
export const situationsForNode = (nodeId: string): readonly Situation[] =>
  (NODE_SITUATIONS[nodeId] ?? []).map((id) => situationById(id)).filter((item): item is Situation => item !== undefined);

/** Узлы, на которых встречается ситуация. */
export const nodesForSituation = (id: string): readonly string[] => {
  const target = normalizeSituationId(id);
  return Object.entries(NODE_SITUATIONS)
    .filter(([, ids]) => ids.includes(target))
    .map(([nodeId]) => nodeId);
};

export { NODE_SITUATIONS };
