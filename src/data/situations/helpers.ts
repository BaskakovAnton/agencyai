import type { Priority, RoleId, Situation, SituationSection } from "../../types.ts";

/** Компактный конструктор ситуации: шаг = [лейн, заголовок, пояснение]. */
export const situation = (
  id: string,
  section: SituationSection,
  title: string,
  summary: string,
  priority: Priority,
  sla: string,
  steps: readonly (readonly [string, string, string])[],
): Situation => ({
  id,
  section,
  title,
  summary,
  priority,
  sla,
  steps: steps.map(([lane, stepTitle, text]) => ({ lane: lane as RoleId, title: stepTitle, text })),
});
