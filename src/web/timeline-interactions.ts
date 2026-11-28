/** Обработчики экрана хронологии: выделены из timeline-view.ts (лимит 200 строк). Поведение не менялось. */
import { hrefChat, hrefTimeline, type ViewMode } from "./router.ts";
import { clearFilter, setDensity, toggleIncidentFilter, type TimelineState } from "./timeline-state.ts";
import { hideTooltip, hoveredCommit, showTooltip } from "./timeline-tooltip.ts";

interface TimelineActions {
  readonly select: (id: string) => void;
  readonly closeCard: () => void;
  readonly jumpTo: (target: string) => void;
  readonly paint: () => void;
  readonly paintBody: (focusCard?: boolean) => void;
}

/** Делегирование: обработчики живут на контейнере и переживают перерисовку блоков. */
export const createClickHandler = (state: TimelineState, actions: TimelineActions) => (event: Event): void => {
  const target = (event.target as Element | null)?.closest<HTMLElement>(
    "[data-commit],[data-bar],[data-row],[data-view],[data-density],[data-incident-filter],[data-action],[data-ruler-day],[data-card-action],[data-graph-toggle]",
  );
  if (!target) return;
  if (target.dataset.graphToggle !== undefined) { state.graphMode = !state.graphMode; actions.paintBody(); return; }
  if (target.dataset.cardAction === "close") { actions.closeCard(); return; }
  if (target.dataset.commit) { actions.select(target.dataset.commit); return; }
  if (target.dataset.bar) { location.hash = hrefChat(target.dataset.bar, target.dataset.from ?? state.day); return; }
  if (target.dataset.row) { location.hash = hrefChat(target.dataset.row, state.day); return; }
  if (target.dataset.view) {
    state.view = target.dataset.view as ViewMode;
    state.selectedId = null;
    actions.paint();
    history.replaceState(null, "", hrefTimeline(state.day, state.view));
    return;
  }
  if (target.dataset.incidentFilter) {
    toggleIncidentFilter(state, target.dataset.incidentFilter);
    actions.paintBody();
    return;
  }
  if (target.dataset.density) {
    setDensity(state, target.dataset.density);
    actions.paintBody();
    return;
  }
  if (target.dataset.rulerDay) { actions.jumpTo(target.dataset.rulerDay); return; }
  if (target.dataset.action === "clear") { clearFilter(state); actions.paintBody(); }
  else if (target.dataset.action === "jump") actions.jumpTo(target.dataset.day ?? state.day);
};

export const createKeydownHandler = (state: TimelineState, actions: TimelineActions) => (event: KeyboardEvent): void => {
  if (event.key === "Escape") {
    if (state.selectedId !== null) { event.preventDefault(); actions.closeCard(); }
    return;
  }
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = (event.target as Element | null)?.closest<HTMLElement>("[data-commit],[data-row]");
  if (!target) return;
  event.preventDefault();
  if (target.dataset.commit) actions.select(target.dataset.commit);
  else if (target.dataset.row) location.hash = hrefChat(target.dataset.row, state.day);
};

/** Наведение и фокус: показывают тултип узла, скрывают при уходе за его пределы. */
export const registerHoverHandlers = (root: HTMLElement, state: TimelineState): void => {
  root.addEventListener("mouseover", (event) => { const el = hoveredCommit(event); if (el) showTooltip(el, state.day); });
  root.addEventListener("mouseout", (event) => {
    const el = hoveredCommit(event);
    if (el && !el.contains(event.relatedTarget as Node | null)) hideTooltip();
  });
  root.addEventListener("focusin", (event) => { const el = hoveredCommit(event); if (el) showTooltip(el, state.day); });
  root.addEventListener("focusout", (event) => {
    const el = hoveredCommit(event);
    if (el && !el.contains(event.relatedTarget as Node | null)) hideTooltip();
  });
};
