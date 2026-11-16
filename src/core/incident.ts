import type { Incident, Move, Priority, Situation } from "../types.ts";
import { STREETS, type IncidentCategory } from "../data/categories.ts";
import { pick, randInt } from "../random.ts";
import { startSla } from "./sla.ts";

/** Каналы, по которым житель сообщает об инциденте. */
export const CHANNELS: readonly string[] = ["телефон", "сайт", "мессенджер", "почта", "личный приём"];

/** Номер заявки: З-001, З-002, … */
export const incidentId = (index: number): string => "З-" + String(index + 1).padStart(3, "0");

export interface CreateIncidentInput {
  readonly index: number;
  readonly nodeId: string;
  readonly categories: readonly IncidentCategory[];
  readonly situation?: Situation;
  readonly rand: () => number;
}

/** Создание заявки: инцидент городской инфраструктуры от жителя. */
export const createIncident = (input: CreateIncidentInput): Incident => {
  const { index, nodeId, categories, situation, rand } = input;
  const category = pick(categories, rand);
  const title = pick(category.templates, rand);
  const street = pick(STREETS, rand);
  const house = randInt(1, 120, rand);
  const flat = randInt(1, 300, rand);
  return {
    id: incidentId(index),
    category: category.key,
    title,
    address: street + ", д. " + house + ", кв. " + flat,
    reporter: pick(CHANNELS, rand),
    priority: situation?.priority ?? category.priority,
    nodeId,
    situationId: situation?.id ?? "",
    sla: startSla(category.priority, 0),
    history: [],
  };
};

/** Перемещение заявки на узел — возвращает новую заявку (без мутаций). */
export const withMove = (
  incident: Incident,
  to: string,
  actor: Move["actor"],
  step: number,
  note = "",
): Incident => {
  const move: Move = { step, from: incident.nodeId, to, actor, note };
  return { ...incident, nodeId: to, history: [...incident.history, move] };
};

/** Заявка в терминальном состоянии: дальше двигаться некуда. */
export const isFinished = (incident: Incident, graph: { next: Readonly<Record<string, readonly string[]>> }): boolean =>
  (graph.next[incident.nodeId] ?? []).length === 0;

export const priorityRank: Readonly<Record<Priority, number>> = {
  urgent: 0,
  normal: 1,
  routine: 2,
  none: 3,
};

/** Сортировка по приоритету, затем по номеру заявки. */
export const sortIncidents = (incidents: readonly Incident[]): readonly Incident[] =>
  [...incidents].sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id),
  );
