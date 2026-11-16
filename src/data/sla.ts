import type { Priority } from "../types.ts";

/** Норматив SLA по приоритету: реакция и устранение в часах. */
export interface SlaProfile {
  readonly reactHours: number;
  readonly resolveHours: number;
  readonly title: string;
}

export const SLA_PROFILES: Readonly<Record<Priority, SlaProfile>> = {
  urgent: { reactHours: 1, resolveHours: 24, title: "авария: реакция 1 ч, устранение 24 ч" },
  normal: { reactHours: 24, resolveHours: 72, title: "неотложное: реакция 24 ч, устранение 72 ч" },
  routine: { reactHours: 72, resolveHours: 720, title: "сезонное: реакция 72 ч, устранение 720 ч" },
  none: { reactHours: 0, resolveHours: 0, title: "вне SLA" },
};

/** Причины законной приостановки SLA (узел U14). */
export const PAUSE_REASONS: readonly string[] = [
  "погода",
  "нет доступа к объекту",
  "согласование с администрацией",
  "не решён вопрос финансирования",
];

/** Сколько часов заявка проводит на узле (по умолчанию 4 ч). */
export const NODE_HOURS: Readonly<Record<string, number>> = {
  U1: 1,
  U2: 24,
  U3: 2,
  U12: 8,
  U13: 72,
  U14: 0,
  U15: 0,
  U19: 2,
  U20: 1,
};

export const DEFAULT_NODE_HOURS = 4;

/** Длительность шага: время на узле, куда заявка пришла. */
export const hoursFor = (nodeId: string): number => NODE_HOURS[nodeId] ?? DEFAULT_NODE_HOURS;

/** Узлы, которые пересчитывают норматив (уточнение у жителя). */
export const RECALC_HOURS: Readonly<Record<string, number>> = { U2: 24 };

/** Узел приостановки и узел возобновления SLA. */
export const PAUSE_NODE = "U14";
export const RESUME_NODE = "U15";
