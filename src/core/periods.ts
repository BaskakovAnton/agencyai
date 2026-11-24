/**
 * Периоды отчётности (UX-3): модельные календарные дни UTC, как и весь проект.
 * Локальная тайм-зона браузера на расчёт не влияет: даты — строки вида «2026-01-10».
 */
export type PeriodLength = 7 | 30;

export const PERIOD_LENGTHS: readonly PeriodLength[] = [7, 30];

export interface Period {
  readonly length: PeriodLength;
  readonly fromDay: string;
  readonly toDay: string;
  /** Все дни периода включительно, по возрастанию. */
  readonly days: readonly string[];
}

export const isPeriodLength = (value: number): value is PeriodLength => value === 7 || value === 30;

/** Сдвиг календарного дня на дельту (может быть отрицательной). */
export const dayShift = (day: string, delta: number): string =>
  new Date(Date.parse(day + "T00:00:00.000Z") + delta * 86_400_000).toISOString().slice(0, 10);

/** Дни от `fromDay` до `toDay` включительно. */
export const daysBetween = (fromDay: string, toDay: string): readonly string[] => {
  const days: string[] = [];
  let cursor = fromDay;
  while (cursor <= toDay) {
    days.push(cursor);
    cursor = dayShift(cursor, 1);
  }
  return days;
};

/** Период длиной `length` дней, заканчивающийся выбранным днём включительно. */
export const periodEndingAt = (endDay: string, length: PeriodLength): Period => {
  const fromDay = dayShift(endDay, -(length - 1));
  return { length, fromDay, toDay: endDay, days: daysBetween(fromDay, endDay) };
};

/** Предыдущий период той же длины: вплотную перед текущим, без пересечения. */
export const previousOf = (period: Period): Period => {
  const toDay = dayShift(period.fromDay, -1);
  const fromDay = dayShift(period.fromDay, -period.length);
  return { length: period.length, fromDay, toDay, days: daysBetween(fromDay, toDay) };
};

/** Контрольная дата Snapshot предыдущего периода — день перед началом текущего. */
export const comparisonDayOf = (period: Period): string => dayShift(period.fromDay, -1);
