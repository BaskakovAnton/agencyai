/** Исторический режим (UX-3.1.1/3.1.2): одно правило определения и общая индикация. */
import { formatDay } from "../core/timeline.ts";

export const HISTORICAL_NOTICE =
  "Вы просматриваете историческое состояние. Для выполнения действий перейдите к текущей дате.";

/** Текущая дата модели — последний день доступного среза; остальные даты исторические. */
export const isHistoricalDay = (day: string, days: readonly string[]): boolean => {
  const last = days.at(-1) ?? "";
  if (last === "" || day === "") return false;
  return day !== last;
};

/** Модельная отметка времени действия: полдень текущего дня модели (UTC), без системной даты. */
export const modelTimestamp = (day: string): string => day + "T12:00:00.000Z";

/**
 * Единый индикатор исторического режима для Dashboard и реестра.
 * На текущей модельной дате не выводится.
 */
export const historicalIndicator = (day: string, days: readonly string[]): string =>
  isHistoricalDay(day, days)
    ? '<p class="historical-indicator" data-historical-indicator role="status">' +
      "Исторический срез: <b>" + formatDay(day) + "</b> — показаны данные на выбранную дату, изменения недоступны</p>"
    : "";
