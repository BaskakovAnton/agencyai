/** Обработчики экрана хронологии: выделены из timeline-view.ts (лимит 200 строк). */
import { hrefChat } from "./router.ts";
import { clearFilter, setDensity, toggleIncidentFilter, type TimelineState } from "./timeline-state.ts";

interface TimelineActions {
  readonly jumpTo: (target: string) => void;
  readonly paint: () => void;
  readonly paintBody: () => void;
}

/** Делегирование: обработчики живут на контейнере и переживают перерисовку блоков. */
export const createClickHandler = (state: TimelineState, actions: TimelineActions) => (event: Event): void => {
  const target = (event.target as Element | null)?.closest<HTMLElement>(
    "[data-bar],[data-row],[data-density],[data-incident-filter],[data-action],[data-ruler-day],[data-graph-toggle]",
  );
  if (!target) return;
  if (target.dataset.graphToggle !== undefined) { state.graphMode = !state.graphMode; actions.paintBody(); return; }
  if (target.dataset.bar) { location.hash = hrefChat(target.dataset.bar, target.dataset.from ?? state.day); return; }
  if (target.dataset.row) { location.hash = hrefChat(target.dataset.row, state.day); return; }
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
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = (event.target as Element | null)?.closest<HTMLElement>("[data-row]");
  if (!target) return;
  event.preventDefault();
  location.hash = hrefChat(target.dataset.row ?? "", state.day);
};
