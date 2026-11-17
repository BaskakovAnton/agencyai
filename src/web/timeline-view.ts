import { chatAt } from "../core/conversation.ts";
import { buildGantt } from "../core/gantt.ts";
import { buildGitGraph } from "../core/gitgraph.ts";
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { formatDay } from "../core/timeline.ts";
import { renderInlineChat } from "./chat-html.ts";
import { renderNodeCard } from "./node-card.ts";
import { hrefChat, hrefTimeline, type Route, type ViewMode } from "./router.ts";
import {
  renderCanvas,
  renderChips,
  renderControls,
  renderStats,
  renderTimeRuler,
  renderTimelinePage,
  type TimelinePageInput,
} from "./timeline-html.ts";

/** Экран хронологии: Git-граф (или Гант) с перемоткой времени, карточкой узла и чатом. */
export const mountTimeline = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const days = story.days;
  const fallbackDay = days.at(-1) ?? "";
  let day = route.at !== "" && days.includes(route.at) ? route.at : fallbackDay;
  let view: ViewMode = route.view;
  let filter = "";
  let override: string | null = null;
  let selectedId: string | null = null;
  let density: "normal" | "compact" = "normal";

  /** Заявка для панели чата: выбранная в полосе, иначе герой демонстрации. */
  const chatIncident = () =>
    story.incidents.find((incident) => incident.id === (override ?? filter)) ??
    story.incidents.find((incident) => incident.id === HERO_INCIDENT_ID) ??
    (story.incidents[0] as (typeof story.incidents)[number]);

  const model = (): TimelinePageInput => {
    const chosen = chatIncident();
    const git = buildGitGraph(graph, story.incidents, day);
    const commit = git.commits.find((item) => item.id === selectedId) ?? null;
    return {
      day,
      days,
      dayIndex: days.indexOf(day),
      view,
      density,
      filter: override ?? filter,
      git,
      gantt: buildGantt(graph, story.incidents, day),
      chat: renderInlineChat(chosen, chatAt(graph, chosen, day), hrefChat(chosen.id, day)),
      card: commit ? renderNodeCard(commit, hrefChat(commit.incidentId, day)) : "",
    };
  };

  const tooltip = (): HTMLElement => {
    const existing = document.querySelector("[data-tt]") as HTMLElement | null;
    if (existing) return existing;
    const tip = document.createElement("div");
    tip.className = "tt";
    tip.id = "tt";
    tip.setAttribute("data-tt", "");
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
    return tip;
  };

  const hideTooltip = (): void => {
    document.querySelector("[data-tt]")?.classList.remove("on");
  };

  const showTooltip = (element: HTMLElement): void => {
    const tip = tooltip();
    const node = element.dataset.node ?? "";
    tip.innerHTML =
      "<b>" + (element.dataset.incident ?? "") + "</b> · " + node + " " + (element.dataset.nodeTitle ?? "") + "<br>" +
      formatDay(element.dataset.day ?? day) + " · " + (element.dataset.role ?? "") + " · " +
      (element.dataset.sla ?? "") + "<br>" + (element.dataset.text ?? "") + " · " + (element.dataset.hours ?? "") + " ч";
    tip.classList.add("on");
    const box = element.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(8, box.left), window.innerWidth - 300) + "px";
    tip.style.top = Math.max(8, box.top - 62) + "px";
  };

  const commitNode = (id: string): HTMLElement | null =>
    Array.from(root.querySelectorAll<HTMLElement>("[data-commit]")).find((node) => node.dataset.commit === id) ?? null;

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
    root.querySelector(".timeline")?.classList.toggle("density-compact", density === "compact");
    if (focusCard) root.querySelector<HTMLElement>("[data-node-card]")?.focus();
  };

  const paint = (): void => {
    hideTooltip();
    root.innerHTML =
      '<div class="timeline' + (density === "compact" ? " density-compact" : "") + '" data-timeline>' +
      renderTimelinePage(model()) + "</div>";
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    slider?.addEventListener("input", () => jumpTo(days[Number(slider.value)] ?? day));
  };

  const jumpTo = (target: string): void => {
    day = target;
    selectedId = null;
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    if (slider) {
      slider.value = String(days.indexOf(day));
      slider.setAttribute("aria-valuetext", formatDay(day));
    }
    const label = root.querySelector("[data-day-label]");
    if (label) label.textContent = formatDay(day);
    history.replaceState(null, "", hrefTimeline(day, view));
    paintBody();
  };

  const select = (id: string): void => {
    selectedId = id;
    paintBody(true);
  };

  const closeCard = (): void => {
    const id = selectedId;
    selectedId = null;
    paintBody();
    if (id) commitNode(id)?.focus();
  };

  /** Делегирование: обработчики живут на контейнере и переживают перерисовку блоков. */
  root.addEventListener("click", (event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-commit],[data-bar],[data-row],[data-view],[data-density],[data-incident-filter],[data-action],[data-ruler-day],[data-card-action]",
    );
    if (!target) return;
    if (target.dataset.cardAction === "close") { closeCard(); return; }
    if (target.dataset.commit) { select(target.dataset.commit); return; }
    if (target.dataset.bar) { location.hash = hrefChat(target.dataset.bar, target.dataset.from ?? day); return; }
    if (target.dataset.row) { location.hash = hrefChat(target.dataset.row, day); return; }
    if (target.dataset.view) {
      view = target.dataset.view as ViewMode;
      selectedId = null;
      paint();
      history.replaceState(null, "", hrefTimeline(day, view));
      return;
    }
    if (target.dataset.incidentFilter) {
      const id = target.dataset.incidentFilter;
      override = override === id ? null : id;
      paintBody();
      return;
    }
    if (target.dataset.density) {
      density = target.dataset.density === "compact" ? "compact" : "normal";
      paintBody();
      return;
    }
    if (target.dataset.rulerDay) { jumpTo(target.dataset.rulerDay); return; }
    if (target.dataset.action === "clear") { override = null; filter = ""; paintBody(); }
    else if (target.dataset.action === "jump") jumpTo(target.dataset.day ?? day);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (selectedId !== null) { event.preventDefault(); closeCard(); }
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-commit],[data-row]");
    if (!target) return;
    event.preventDefault();
    if (target.dataset.commit) select(target.dataset.commit);
    else if (target.dataset.row) location.hash = hrefChat(target.dataset.row, day);
  });

  const hovered = (event: Event): HTMLElement | null =>
    (event.target as Element | null)?.closest<HTMLElement>("[data-commit]") ?? null;
  root.addEventListener("mouseover", (event) => { const el = hovered(event); if (el) showTooltip(el); });
  root.addEventListener("mouseout", (event) => {
    const el = hovered(event);
    if (el && !el.contains(event.relatedTarget as Node | null)) hideTooltip();
  });
  root.addEventListener("focusin", (event) => { const el = hovered(event); if (el) showTooltip(el); });
  root.addEventListener("focusout", (event) => {
    const el = hovered(event);
    if (el && !el.contains(event.relatedTarget as Node | null)) hideTooltip();
  });

  paint();
};
