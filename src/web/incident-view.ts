import type { Story } from "../core/story.ts";
import { approveCompletion, rejectCompletion, reopenIncident, submitExecution } from "../core/org/completion.ts";
import type { OrgRepository } from "../core/org/repository.ts";
import type { Graph } from "../types.ts";
import { renderIncident, renderIncidentMissing } from "./incident-html.ts";
import { buildIncidentView } from "./incident.ts";
import { ACTOR_BY_ROLE } from "./org-integration.ts";
import { isHistoricalDay, modelTimestamp } from "./historical.ts";
import { nearestDay, renderOutsideWindow, resolveDay } from "./day-window.ts";
import { hrefIncident, type Route } from "./router.ts";

export interface IncidentViewOptions {
  readonly org?: OrgRepository;
  /** Роль оператора: определяет демонстрационного пользователя для действий. */
  readonly role?: keyof typeof ACTOR_BY_ROLE;
}

/** Экран карточки обращения: дата среза и действия подтверждения синхронны с моделью. */
export const mountIncident = (
  root: HTMLElement,
  graph: Graph,
  story: Story,
  route: Route,
  options: IncidentViewOptions = {},
): void => {
  const days = story.days;
  const resolved = resolveDay(route.at, days);
  if (resolved.availability === "outside") {
    // Никаких «фантомных» этапов: на дату вне окна модели карточка не отрисовывается.
    root.innerHTML = renderOutsideWindow(route.at, days, hrefIncident(route.incidentId, nearestDay(route.at, days)));
    return;
  }
  const day = resolved.day;
  const org = options.org;
  let actorUserId: string | null = ACTOR_BY_ROLE[options.role ?? "deputy"] ?? org?.directory.users[0]?.id ?? null;

  const paint = (message: string): void => {
    const view = buildIncidentView(graph, story.incidents, route.incidentId, day, org, actorUserId);
    const historical = isHistoricalDay(day, days);
    root.innerHTML =
      view === null
        ? renderIncidentMissing(route.incidentId, day, days)
        : renderIncident(view, day, days, { historical });
    const slot = root.querySelector("[data-org-message]");
    if (slot && message !== "") slot.textContent = message;
  };
  paint("");

  root.addEventListener("change", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.matches("[data-day-select]")) {
      location.hash = "#incident/" + encodeURIComponent(route.incidentId) + "?at=" + encodeURIComponent((target as HTMLSelectElement).value);
      return;
    }
    if (target?.matches("[data-org-actor]")) {
      actorUserId = (target as HTMLSelectElement).value;
      paint("");
    }
  });

  root.addEventListener("click", (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>("[data-org-action]");
    if (!button || !org) return;
    // Защита на уровне представления: исторический срез состояние не меняет.
    if (button.hasAttribute("disabled") || isHistoricalDay(day, days)) {
      paint("Действия недоступны: выбран исторический срез");
      return;
    }
    const action = button.dataset.orgAction ?? "";
    // Действие относится к текущему дню модели: так оно попадает и в карточку, и в периодную аналитику.
    const at = modelTimestamp(day);
    const actor = actorUserId ?? "";
    const result = org.runCompletion(route.incidentId, (input) => {
      if (action === "submit") return submitExecution(input, { at, actorUserId: actor, reason: "Сдано исполнителем (демо)" });
      if (action === "approve") return approveCompletion(input, { at, actorUserId: actor, result: "Подтверждено (демо)" });
      if (action === "reject") return rejectCompletion(input, { at, actorUserId: actor, reason: "Требуется доработка (демо)" });
      return reopenIncident(input, { at, actorUserId: actor, reason: "Повторное обращение (демо)" });
    });
    paint(result.ok ? "Готово: состояние обновлено" : "Отказ модели: " + result.error);
  });
};