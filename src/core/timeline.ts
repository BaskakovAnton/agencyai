import { hoursFor } from "../data/sla.ts";
import type { Incident, Move } from "../types.ts";

/** Начало демо-истории: с этого дня раскручивается хронология заявок. */
export const DEMO_ORIGIN = "2025-12-20T09:00:00.000Z";

/** Заявки создаются каждые 12 часов — на ползунке времени видно, как они появляются. */
export const CREATION_STEP_HOURS = 12;

export const dayOf = (iso: string): string => iso.slice(0, 10);

export const addHours = (iso: string, hours: number): string =>
  new Date(Date.parse(iso) + hours * 3_600_000).toISOString();

/** Момент создания заявки по её номеру в демо-истории. */
export const createdFor = (index: number, origin: string = DEMO_ORIGIN): string =>
  addHours(origin, index * CREATION_STEP_HOURS);

/** Сколько часов занимает шаг: по умолчанию — работа на узле назначения. */
export type GapFn = (move: Move, index: number) => number;

/** Проставляет даты переходов: шаг занимает столько часов, сколько работа на узле назначения. */
export const withTimeline = (
  incident: Incident,
  createdAt: string,
  gap: GapFn = (move) => hoursFor(move.to),
): Incident => {
  let cursor = createdAt;
  const history = incident.history.map((move, index) => {
    cursor = addHours(cursor, gap(move, index));
    return { ...move, at: cursor };
  });
  return { ...incident, createdAt, history };
};

export const lastAt = (incident: Incident): string =>
  incident.history.at(-1)?.at ?? incident.createdAt ?? DEMO_ORIGIN;

export const historyUpTo = (incident: Incident, day: string): readonly Move[] =>
  incident.history.filter((move) => (move.at === undefined ? true : dayOf(move.at) <= day));

/** Заявка, как она выглядела в конце указанного дня: узел и история обрезаны по дате. */
export const incidentAt = (incident: Incident, day: string): Incident => {
  const history = historyUpTo(incident, day);
  const last = history.at(-1);
  return last ? { ...incident, nodeId: last.to, history } : { ...incident, history };
};

export const isVisible = (incident: Incident, day: string): boolean =>
  dayOf(incident.createdAt ?? DEMO_ORIGIN) <= day;

/** Заявки, существовавшие на конец дня, в состоянии на этот день. */
export const visibleAt = (incidents: readonly Incident[], day: string): readonly Incident[] =>
  incidents.filter((incident) => isVisible(incident, day)).map((incident) => incidentAt(incident, day));

/** Все дни истории — включая пустые, чтобы ползунок шёл по каждому дню. */
export const daysRange = (incidents: readonly Incident[]): readonly string[] => {
  const days = new Set<string>();
  for (const incident of incidents) {
    days.add(dayOf(incident.createdAt ?? DEMO_ORIGIN));
    for (const move of incident.history) if (move.at) days.add(dayOf(move.at));
  }
  const sorted = [...days].sort();
  const first = sorted[0];
  const last = sorted.at(-1);
  if (first === undefined || last === undefined) return [];
  const out: string[] = [];
  let cursor = first;
  while (cursor <= last) {
    out.push(cursor);
    cursor = dayOf(addHours(cursor + "T00:00:00.000Z", 24));
  }
  return out;
};

const MONTHS: readonly string[] = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «2026-01-02» → «2 января 2026». */
export const formatDay = (day: string): string => {
  const parts = day.split("-");
  const year = parts[0] ?? "";
  const month = Number(parts[1] ?? "1");
  const date = Number(parts[2] ?? "1");
  return date + " " + (MONTHS[month - 1] ?? String(month)) + " " + year;
};

/** «2026-01-02T14:20:00.000Z» → «2 января · 14:20» — время сообщения в чате. */
export const formatStamp = (iso: string): string =>
  formatDay(dayOf(iso)).replace(/ \d{4}$/, "") + " · " + iso.slice(11, 16);
