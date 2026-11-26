/**
 * Единое состояние выбранной даты (UX-3.2.2): одно правило доступности даты для всех экранов.
 * Даты вне окна модели не подменяются и не показываются как факт — окно сообщает о недоступности.
 */
import { formatDay } from "../core/timeline.ts";

export type DayAvailability = "inside" | "outside" | "empty";

export interface DayResolution {
  /** Дата, на которую должен отрисоваться экран: запрошенная либо значение по умолчанию. */
  readonly day: string;
  readonly availability: DayAvailability;
}

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/** Доступность даты: внутри окна модели, вне окна или окно пусто. */
export const dayWindow = (day: string, days: readonly string[]): DayAvailability => {
  if (days.length === 0) return "empty";
  if (day === "") return "inside";
  return days.includes(day) ? "inside" : "outside";
};

/**
 * Разбор адреса в дату экрана. Пустой или некорректный `at` — это отсутствие выбора,
 * поэтому берётся последний доступный день (значение по умолчанию). Корректная дата
 * вне окна возвращается как есть и помечается `outside`: автокоррекции нет.
 */
export const resolveDay = (at: string, days: readonly string[]): DayResolution => {
  if (days.length === 0) return { day: "", availability: "empty" };
  if (at === "" || !DAY_FORMAT.test(at)) return { day: days.at(-1) ?? "", availability: "inside" };
  return { day: at, availability: days.includes(at) ? "inside" : "outside" };
};

/** Ближайшая доступная дата: до окна — первая, после окна — последняя. */
export const nearestDay = (day: string, days: readonly string[]): string => {
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) return "";
  return day !== "" && day < first ? first : last;
};

/** Текст границ доступного периода: «20 декабря 2025 — 13 января 2026». */
export const daysRangeLabel = (days: readonly string[]): string => {
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) return "нет доступных дат";
  return formatDay(first) + " — " + formatDay(last);
};

/** Текст единого состояния недоступности даты. */
export const outsideWindowText = (days: readonly string[]): string =>
  "Дата вне доступного периода: " + daysRangeLabel(days) + ". Данные на эту дату не отображаются.";

/**
 * Разметка состояния «дата вне окна модели» — одна для обзора, реестра, карточки,
 * хронологии и переписки: без данных, без действий, со ссылкой на ближайшую дату.
 */
export const renderOutsideWindow = (day: string, days: readonly string[], href: string): string => {
  const nearest = nearestDay(day, days);
  return (
    '<section class="outside-window" data-outside-window>' +
    '<h1 class="page-title">Дата вне доступного периода</h1>' +
    '<p class="muted">' + outsideWindowText(days) + "</p>" +
    (nearest === ""
      ? ""
      : '<p><a class="button" href="' + href + '" data-outside-link>Открыть ' + formatDay(nearest) + "</a></p>") +
    "</section>"
  );
};
