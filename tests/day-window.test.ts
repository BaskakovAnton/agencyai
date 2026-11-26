/** UX-3.2.2: единое правило доступности выбранной даты. */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { dayWindow, daysRangeLabel, nearestDay, outsideWindowText, renderOutsideWindow, resolveDay } from "../src/web/day-window.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;

test("доступность даты: внутри окна, вне окна, пустое окно", () => {
  expect(dayWindow(days[0]!, days)).toBe("inside");
  expect(dayWindow(days.at(-1)!, days)).toBe("inside");
  expect(dayWindow("2020-01-01", days)).toBe("outside");
  expect(dayWindow("2026-06-01", days)).toBe("outside");
  expect(dayWindow("", days)).toBe("inside");
  expect(dayWindow("2020-01-01", [])).toBe("empty");
});

test("resolveDay: пустая и некорректная дата — значение по умолчанию, дата вне окна не подменяется", () => {
  expect(resolveDay("", days)).toEqual({ day: days.at(-1)!, availability: "inside" });
  expect(resolveDay("abc", days)).toEqual({ day: days.at(-1)!, availability: "inside" });
  expect(resolveDay("01-01-2026", days)).toEqual({ day: days.at(-1)!, availability: "inside" });
  expect(resolveDay(days[2]!, days)).toEqual({ day: days[2]!, availability: "inside" });
  // Ключевое требование: автокоррекции нет, дата возвращается как запрошена.
  expect(resolveDay("2020-01-01", days)).toEqual({ day: "2020-01-01", availability: "outside" });
  expect(resolveDay("2020-01-01", [])).toEqual({ day: "", availability: "empty" });
});

test("доступность из dayWindow совпадает с resolveDay (одно правило)", () => {
  for (const probe of [days[0]!, days[3]!, "2020-01-01", "2026-06-01", ""]) {
    expect(resolveDay(probe, days).availability).toBe(dayWindow(probe === "" ? "" : resolveDay(probe, days).day, days));
  }
});

test("ближайшая дата: до окна — первая, после окна — последняя", () => {
  expect(nearestDay("2020-01-01", days)).toBe(days[0]!);
  expect(nearestDay("2026-06-01", days)).toBe(days.at(-1)!);
  expect(nearestDay("", [])).toBe("");
});

test("текст границ и состояние вне окна содержат период и ссылку", () => {
  expect(daysRangeLabel(days)).toContain("20 декабря 2025");
  expect(daysRangeLabel(days)).toContain("13 января 2026");
  const html = renderOutsideWindow("2020-01-01", days, "#dashboard?at=" + days[0]!);
  expect(html).toContain("data-outside-window");
  expect(html).toContain("Дата вне доступного периода");
  expect(html).toContain(daysRangeLabel(days));
  expect(html).toContain('href="#dashboard?at=' + days[0]! + '"');
  expect(html).toContain("data-outside-link");
  expect(outsideWindowText(days)).toBe(html.split('<p class="muted">')[1]!.split("</p>")[0]);
});

test("состояние вне окна не содержит признаков данных других экранов", () => {
  const html = renderOutsideWindow("2026-06-01", days, "#incidents?at=" + days.at(-1)!);
  for (const marker of ["data-dashboard", "data-incident-detail", "data-org-confirmation", "data-incidents-table", "data-timeline", "data-chat"]) {
    expect({ marker, present: html.includes(marker) }).toEqual({ marker, present: false });
  }
});
