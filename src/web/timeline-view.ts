import { chatAt } from "../core/conversation.ts";
import { buildGantt } from "../core/gantt.ts";
import { buildGitGraph, type GitCommit } from "../core/gitgraph.ts";
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { formatDay } from "../core/timeline.ts";
import { renderInlineChat } from "./chat-html.ts";
import { renderNodeCard } from "./node-card.ts";
import { hrefChat, hrefTimeline, type Route, type ViewMode } from "./router.ts";
import {
  renderBody,
  renderCanvas,
  renderChips,
  renderLegends,
  renderStats,
  renderTimeRuler,
  renderTimelineFooter,
  renderTimelineHeader,
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
      filter: override ?? filter,
      git,
      gantt: buildGantt(graph, story.incidents, day),
      chat: renderInlineChat(chosen, chatAt(graph, chosen, day), hrefChat(chosen.id, day)),
      card: commit ? renderNodeCard(commit, hrefChat(commit.incidentId, day)) : "",
    };
  };

  const paintBody = (): void => {
    const page = model();
    const parts: readonly (readonly [string, string])[] = [
      ["[data-stats]", renderStats(page)],
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
    wireBody();
    wireRuler();
  };

  const paint = (): void => {
    root.innerHTML = '<div class="timeline">' + renderTimelinePage(model()) + "</div>";
    wireAll();
  };

  const tooltip = (): HTMLElement => {
    const existing = document.querySelector("[data-tt]") as HTMLElement | null;
    if (existing) return existing;
    const tip = document.createElement("div");
    tip.className = "tt";
    tip.id = "tt";
    tip.setAttribute("data-tt", "");
    document.body.appendChild(tip);
    return tip;
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

  const hideTooltip = (): void => {
    document.querySelector("[data-tt]")?.classList.remove("on");
  };

  const wireBody = (): void => {
    root.querySelectorAll("[data-commit]").forEach((element) => {
      const node = element as HTMLElement;
      // клик по коммиту открывает карточку узла (роль-ответственный, время в узле, SLA)
      node.addEventListener("click", () => {
        selectedId = node.dataset.commit ?? null;
        paintBody();
      });
      node.addEventListener("mouseenter", () => showTooltip(node));
      node.addEventListener("focus", () => showTooltip(node));
      node.addEventListener("mouseleave", hideTooltip);
      node.addEventListener("blur", hideTooltip);
    });
    // клик по сегменту Ганта открывает чат на дату начала сегмента — роль совпадёт с сегментом
    root.querySelectorAll("[data-bar]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        const bar = element as HTMLElement;
        location.hash = hrefChat(bar.dataset.bar ?? "", bar.dataset.from ?? day);
      });
    });
    root.querySelectorAll("[data-row]").forEach((element) => {
      element.addEventListener("click", () => {
        location.hash = hrefChat((element as HTMLElement).dataset.row ?? "", day);
      });
    });
    root.querySelectorAll('[data-card-action="close"]').forEach((element) => {
      element.addEventListener("click", () => {
        selectedId = null;
        paintBody();
      });
    });
  };

  const wireRuler = (): void => {
    root.querySelectorAll("[data-ruler-day]").forEach((element) => {
      element.addEventListener("click", () => {
        jumpTo((element as HTMLElement).dataset.rulerDay ?? day);
      });
    });
  };

  const jumpTo = (target: string): void => {
    day = target;
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    if (slider) slider.value = String(days.indexOf(day));
    const label = root.querySelector("[data-day-label]");
    if (label) label.textContent = formatDay(day);
    paintBody();
  };

  const wireAll = (): void => {
    wireBody();
    wireRuler();
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    if (slider) {
      slider.addEventListener("input", () => jumpTo(days[Number(slider.value)] ?? day));
      slider.addEventListener("change", () => history.replaceState(null, "", hrefTimeline(day, view)));
    }
    root.querySelectorAll("[data-view]").forEach((element) => {
      element.addEventListener("click", () => {
        view = ((element as HTMLElement).dataset.view ?? "git") as ViewMode;
        selectedId = null;
        paint();
      });
    });
    root.querySelectorAll("[data-incident-filter]").forEach((element) => {
      element.addEventListener("click", () => {
        const id = (element as HTMLElement).dataset.incidentFilter ?? "";
        override = override === id ? null : id;
        paintBody();
      });
    });
    root.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", () => {
        const action = (element as HTMLElement).dataset.action;
        if (action === "clear") {
          override = null;
          filter = "";
          paintBody();
        }
        if (action === "jump") jumpTo((element as HTMLElement).dataset.day ?? day);
      });
    });
  };

  paint();
};
