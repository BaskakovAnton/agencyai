import { chatAt, conversationFor } from "../core/conversation.ts";
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import { ROLE_IDS } from "../data/roles.ts";
import type { Story } from "../core/story.ts";
import type { Graph, Incident, RoleId } from "../types.ts";
import { renderPhone } from "./chat-html.ts";
import { hrefChat, hrefTimeline, type Route } from "./router.ts";

const nextRole = (role: RoleId): RoleId => ROLE_IDS[(ROLE_IDS.indexOf(role) + 1) % ROLE_IDS.length] as RoleId;

/** Экран мобильного чата: заявка и дата берутся из адреса, поэтому граф и чат синхронны. */
export const mountChat = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const incidents = story.incidents;
  const hero = incidents.find((incident) => incident.id === HERO_INCIDENT_ID) ?? (incidents[0] as Incident);
  const incident = incidents.find((candidate) => candidate.id === route.incidentId) ?? hero;
  const days = story.days;
  const fallbackDay = days.at(-1) ?? "";
  let day = route.at !== "" && days.includes(route.at) ? route.at : fallbackDay;
  let override: RoleId | null = null;

  const messageDays = conversationFor(graph, incident).map((message) => message.day);
  const prevDay = (): string => [...messageDays].reverse().find((value) => value < day) ?? "";
  const nextDay = (): string => messageDays.find((value) => value > day) ?? "";

  const paint = (): void => {
    const snapshot = chatAt(graph, incident, day);
    const activeRole = override ?? snapshot.activeRole;
    const interlocutor: RoleId =
      override === null ? snapshot.interlocutor : activeRole === "resident" ? "deputy" : "resident";
    root.innerHTML =
      '<div class="chat-screen">' +
      renderPhone({
        incident,
        snapshot,
        activeRole,
        interlocutor,
        overridden: override !== null,
        backHref: hrefTimeline(day, "git"),
        nextDay: nextDay(),
        prevDay: prevDay(),
      }) +
      '<div class="chat-side">' +
      '<h2>Что происходит</h2>' +
      '<p>Заявка идёт по узлам процесса: ' + incident.nodeId + ' — текущий узел на ' + day + ".</p>" +
      '<p class="hint">Роль в переписке меняется автоматически вместе с узлом: U1 — житель, U6 — депутат-диспетчер, ' +
      "U7 — подрядчик, U19 — снова житель. Кнопка «Сменить роль» показывает диалог с другой стороны.</p>" +
      '<a class="inline-link" href="' + hrefTimeline(day, "gantt") + '">Смотреть диаграмму Ганта на эту дату →</a>' +
      "</div></div>";
    wire(activeRole);
  };

  const wire = (activeRole: RoleId): void => {
    root.querySelector('[data-action="prev-msg"]')?.addEventListener("click", () => {
      if (prevDay() !== "") location.hash = hrefChat(incident.id, prevDay());
    });
    root.querySelector('[data-action="next-msg"]')?.addEventListener("click", () => {
      if (nextDay() !== "") location.hash = hrefChat(incident.id, nextDay());
    });
    root.querySelector('[data-action="cycle-role"]')?.addEventListener("click", () => {
      override = nextRole(activeRole);
      paint();
    });
  };

  paint();
};
