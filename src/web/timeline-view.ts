import { chatAt } from "../core/conversation.ts";
import { buildGantt } from "../core/gantt.ts";
import { buildGitGraph } from "../core/gitgraph.ts";
import { formatDay } from "../core/timeline.ts";
import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { renderInlineChat } from "./chat-html.ts";
import { renderNodeCard } from "./node-card.ts";
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
import { createClickHandler, createKeydownHandler, registerHoverHandlers } from "./timeline-interactions.ts";
import { activeFilter, chatIncidentOf, initialTimelineState } from "./timeline-state.ts";
import { commitNode, hideTooltip } from "./timeline-tooltip.ts";

/** Экран хронологии: Git-граф (или Гант) с перемоткой времени, карточкой узла и чатом. */
export const mountTimeline = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const days = story.days;
  const state = initialTimelineState(route, days);

  const model = (): TimelinePageInput => {
    const chosen = chatIncidentOf(state, story);
    const git = buildGitGraph(graph, story.incidents, state.day);
    const commit = git.commits.find((item) => item.id === state.selectedId) ?? null;
    return {
      day: state.day,
      days,
      dayIndex: days.indexOf(state.day),
      view: state.view,
      density: state.density,
      filter: activeFilter(state),
      git,
      gantt: buildGantt(graph, story.incidents, state.day),
      chat: renderInlineChat(chosen, chatAt(graph, chosen, state.day), hrefChat(chosen.id, state.day)),
      card: commit ? renderNodeCard(commit, hrefChat(commit.incidentId, state.day)) : "",
    };
  };

  const paintBody = (focusCard = false): void => {
    hideTooltip();
    const page = model();
    const parts: readonly (readonly [string, string])[] = [
      ["[data-stats]", renderStats(page)],
      ["[data-controls]", renderControls(page)],
      ["[data-chips]", renderChips(page)],
      ["[data-ruler]", renderTimeRuler(page)],
      ["[data-canvas]", renderCanvas(page)],
      ["[data-inline-chat]", page.chat],
      ["[data-node-card-slot]", '<div class="node-card-slot" data-node-card-slot>' + (page.card ?? "") + "</div>"],
    ];
    for (const [selector, html] of parts) {
      const element = root.querySelector(selector);
      if (element) element.outerHTML = html;
    }
    root.querySelector(".timeline")?.classList.toggle("density-compact", state.density === "compact");
    if (focusCard) root.querySelector<HTMLElement>("[data-node-card]")?.focus();
  };

  const paint = (): void => {
    hideTooltip();
    root.innerHTML =
      '<div class="timeline' + (state.density === "compact" ? " density-compact" : "") + '" data-timeline>' +
      renderTimelinePage(model()) + "</div>";
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    slider?.addEventListener("input", () => jumpTo(days[Number(slider.value)] ?? state.day));
  };

  const jumpTo = (target: string): void => {
    state.day = target;
    state.selectedId = null;
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

  const select = (id: string): void => {
    state.selectedId = id;
    paintBody(true);
  };

  const closeCard = (): void => {
    const id = state.selectedId;
    state.selectedId = null;
    paintBody();
    if (id) commitNode(root, id)?.focus();
  };

  const actions = { select, closeCard, jumpTo, paint, paintBody };
  root.addEventListener("click", createClickHandler(state, actions));
  root.addEventListener("keydown", createKeydownHandler(state, actions));
  registerHoverHandlers(root, state);

  paint();
};
