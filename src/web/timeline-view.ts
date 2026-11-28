import { chatAt } from "../core/conversation.ts";
import { dayEvents } from "../core/events.ts";
import { buildGantt } from "../core/gantt.ts";
import { formatDay } from "../core/timeline.ts";
import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { renderInlineChat } from "./chat-html.ts";
import { hrefChat, hrefTimeline, type Route } from "./router.ts";
import {
  renderCanvas,
  renderChips,
  renderControls,
  renderStats,
  renderTimeRuler,
  renderTimelinePage,
  type TimelinePageInput,
} from "./timeline-html.ts";
import { renderEventList } from "./timeline-events.ts";
import { createClickHandler, createKeydownHandler } from "./timeline-interactions.ts";
import { nearestDay, renderOutsideWindow, resolveDay } from "./day-window.ts";
import { activeFilter, chatIncidentOf, initialTimelineState } from "./timeline-state.ts";

/** Экран хронологии: диаграмма Ганта с перемоткой времени, списком событий и чатом. */
export const mountTimeline = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const days = story.days;
  const resolved = resolveDay(route.at, days);
  if (resolved.availability === "outside") {
    root.innerHTML = renderOutsideWindow(route.at, days, hrefTimeline(nearestDay(route.at, days), route.view));
    return;
  }
  const state = initialTimelineState(route, days);

  const model = (): TimelinePageInput => {
    const chosen = chatIncidentOf(state, story);
    return {
      day: state.day,
      days,
      dayIndex: days.indexOf(state.day),
      view: state.view,
      density: state.density,
      graphMode: state.graphMode,
      filter: activeFilter(state),
      gantt: buildGantt(graph, story.incidents, state.day),
      events: dayEvents(graph, story.incidents, state.day),
      chat: renderInlineChat(chosen, chatAt(graph, chosen, state.day), hrefChat(chosen.id, state.day)),
    };
  };

  const paintBody = (): void => {
    const page = model();
    const parts: readonly (readonly [string, string])[] = [
      ["[data-stats]", renderStats(page)],
      ["[data-controls]", renderControls(page)],
      ["[data-chips]", renderChips(page)],
      ["[data-ruler]", renderTimeRuler(page)],
      ["[data-graph-wrap]", renderCanvas(page)],
      ["[data-event-list]", renderEventList(page)],
      ["[data-inline-chat]", page.chat],
    ];
    for (const [selector, html] of parts) {
      const element = root.querySelector(selector);
      if (element) element.outerHTML = html;
    }
    root.querySelector(".timeline")?.classList.toggle("density-compact", state.density === "compact");
    root.querySelector("[data-timeline]")?.setAttribute("data-graph-mode", String(state.graphMode));
  };

  const paint = (): void => {
    root.innerHTML =
      '<div class="timeline' + (state.density === "compact" ? " density-compact" : "") + '" data-timeline data-graph-mode="' + String(state.graphMode) +
      '">' + renderTimelinePage(model()) + "</div>";
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    slider?.addEventListener("input", () => jumpTo(days[Number(slider.value)] ?? state.day));
  };

  const jumpTo = (target: string): void => {
    state.day = target;
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    if (slider) {
      slider.value = String(days.indexOf(state.day));
      slider.setAttribute("aria-valuetext", formatDay(state.day));
    }
    const label = root.querySelector("[data-day-label]");
    if (label) label.textContent = formatDay(state.day);
    history.replaceState(null, "", hrefTimeline(state.day, state.view));
    paintBody();
  };

  const actions = { jumpTo, paint, paintBody };
  root.addEventListener("click", createClickHandler(state, actions));
  root.addEventListener("keydown", createKeydownHandler(state, actions));

  paint();
};
