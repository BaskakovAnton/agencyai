/** Тултип узла хронологии: выделено из timeline-view.ts (лимит 200 строк). Поведение не менялось. */
import { formatDay } from "../core/timeline.ts";

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

export const hideTooltip = (): void => {
  document.querySelector("[data-tt]")?.classList.remove("on");
};

export const showTooltip = (element: HTMLElement, fallbackDay: string): void => {
  const tip = tooltip();
  const node = element.dataset.node ?? "";
  tip.innerHTML =
    "<b>" + (element.dataset.incident ?? "") + "</b> · " + node + " " + (element.dataset.nodeTitle ?? "") + "<br>" +
    formatDay(element.dataset.day ?? fallbackDay) + " · " + (element.dataset.role ?? "") + " · " +
    (element.dataset.sla ?? "") + "<br>" + (element.dataset.text ?? "") + " · " + (element.dataset.hours ?? "") + " ч";
  tip.classList.add("on");
  const box = element.getBoundingClientRect();
  tip.style.left = Math.min(Math.max(8, box.left), window.innerWidth - 300) + "px";
  tip.style.top = Math.max(8, box.top - 62) + "px";
};

export const commitNode = (root: HTMLElement, id: string): HTMLElement | null =>
  Array.from(root.querySelectorAll<HTMLElement>("[data-commit]")).find((node) => node.dataset.commit === id) ?? null;

/** Узел под курсором или в фокусе: только элементы графа с data-commit. */
export const hoveredCommit = (event: Event): HTMLElement | null =>
  (event.target as Element | null)?.closest<HTMLElement>("[data-commit]") ?? null;
