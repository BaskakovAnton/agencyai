import { chatAt } from "../core/conversation.ts";
import { buildGantt } from "../core/gantt.ts";
import { buildGitGraph } from "../core/gitgraph.ts";
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { Story } from "../core/story.ts";
import type { Graph } from "../types.ts";
import { formatDay } from "../core/timeline.ts";
import { hrefChat, hrefTimeline, type Route, type ViewMode } from "./router.ts";
import { renderInlineChat } from "./chat-html.ts";
import { renderBody, renderCanvas, renderChips, renderStats, renderTimelineFooter, renderTimelineHeader, type TimelinePageInput } from "./timeline-html.ts";

/** Экран хронологии: Git-граф (или Гант) с перемоткой времени и переходом в чат заявки. */
export const mountTimeline = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const days = story.days;
  const fallbackDay = days.at(-1) ?? "";
  let day = route.at !== "" && days.includes(route.at) ? route.at : fallbackDay;
  let view: ViewMode = route.view;
  let filter = "";
  let override: string | null = null;

  /** Заявка для панели чата: выбранная в полосе, иначе герой демонстрации. */
  const chatIncident = () =>
    story.incidents.find((incident) => incident.id === (override ?? filter)) ??
    story.incidents.find((incident) => incident.id === HERO_INCIDENT_ID) ??
    (story.incidents[0] as (typeof story.incidents)[number]);

  const input = (): TimelinePageInput => {
    const selected = chatIncident();
    return {
      day,
      days,
      dayIndex: days.indexOf(day),
      view,
      filter: override ?? filter,
      git: buildGitGraph(graph, story.incidents, day),
      gantt: buildGantt(graph, story.incidents, day),
      chat: renderInlineChat(selected, chatAt(graph, selected, day), hrefChat(selected.id, day)),
    };
  };

  const paintBody = (): void => {
    const page = input();
    const stats = root.querySelector("[data-stats]");
    if (stats) stats.outerHTML = renderStats(page);
    const chips = root.querySelector("[data-chips]");
    if (chips) chips.outerHTML = renderChips(page);
    const canvas = root.querySelector("[data-canvas]");
    if (canvas) canvas.outerHTML = renderCanvas(page);
    const chat = root.querySelector("[data-inline-chat]");
    if (chat) chat.outerHTML = page.chat;
    wireBody();
  };

  const paint = (): void => {
    root.innerHTML =
      '<div class="timeline">' + renderTimelineHeader(input()) + renderBody(input()) + renderTimelineFooter() + "</div>";
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
    const title = graph.byId[node]?.title ?? "";
    const when = element.dataset.day ?? day;
    tip.innerHTML =
      "<b>" + (element.dataset.incident ?? "") + "</b> · " + node + " " + title + "<br>" + formatDay(when) + " · " +
      (element.dataset.role ?? "") + "<br>" + (element.dataset.text ?? "");
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
      node.addEventListener("click", () => {
        location.hash = hrefChat(node.dataset.incident ?? "", day);
      });
      node.addEventListener("mouseenter", () => showTooltip(node));
      node.addEventListener("focus", () => showTooltip(node));
      node.addEventListener("mouseleave", hideTooltip);
      node.addEventListener("blur", hideTooltip);
    });
    root.querySelectorAll("[data-row]").forEach((element) => {
      element.addEventListener("click", () => {
        location.hash = hrefChat((element as HTMLElement).dataset.row ?? "", day);
      });
    });
  };

  const wireAll = (): void => {
    wireBody();
    const slider = root.querySelector("[data-slider]") as HTMLInputElement | null;
    if (slider) {
      slider.addEventListener("input", () => {
        day = days[Number(slider.value)] ?? day;
        const label = root.querySelector("[data-day-label]");
        if (label) label.textContent = formatDay(day);
        paintBody();
      });
      slider.addEventListener("change", () => {
        history.replaceState(null, "", hrefTimeline(day, view));
      });
    }
    root.querySelectorAll("[data-view]").forEach((element) => {
      element.addEventListener("click", () => {
        view = ((element as HTMLElement).dataset.view ?? "git") as ViewMode;
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
        if (action === "jump") {
          day = (element as HTMLElement).dataset.day ?? day;
          const slider2 = root.querySelector("[data-slider]") as HTMLInputElement | null;
          if (slider2) slider2.value = String(days.indexOf(day));
          const label = root.querySelector("[data-day-label]");
          if (label) label.textContent = formatDay(day);
          paintBody();
        }
      });
    });
  };

  paint();
};
