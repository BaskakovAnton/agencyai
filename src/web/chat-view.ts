import { chatAt, conversationFor } from "../core/conversation.ts";
import { SLA_PHASE_TITLES, slaPhaseOnDay } from "../core/sla-at.ts";
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import { ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { ROLE_COLORS } from "./theme.ts";
import type { Story } from "../core/story.ts";
import type { Graph, Incident, RoleId } from "../types.ts";
import { renderBadge, renderPanel } from "./components.ts";
import { renderPhone } from "./chat-html.ts";
import { nearestDay, renderOutsideWindow, resolveDay } from "./day-window.ts";
import { hrefChat, hrefTimeline, type Route } from "./router.ts";

const nextRole = (role: RoleId): RoleId => ROLE_IDS[(ROLE_IDS.indexOf(role) + 1) % ROLE_IDS.length] as RoleId;

/** Экран мобильного чата: заявка и дата берутся из адреса, поэтому граф и чат синхронны. */
export const mountChat = (root: HTMLElement, graph: Graph, story: Story, route: Route): void => {
  const incidents = story.incidents;
  const hero = incidents.find((incident) => incident.id === HERO_INCIDENT_ID) ?? (incidents[0] as Incident);
  const incident = incidents.find((candidate) => candidate.id === route.incidentId) ?? hero;
  const days = story.days;
  const resolved = resolveDay(route.at, days);
  if (resolved.availability === "outside") {
    root.innerHTML = renderOutsideWindow(route.at, days, hrefChat(incident.id, nearestDay(route.at, days)));
    return;
  }
  let day = resolved.day;
  let override: RoleId | null = null;

  const messageDays = conversationFor(graph, incident)
    .filter((message) => message.kind === "message")
    .map((message) => message.day);
  const prevDay = (): string => [...messageDays].reverse().find((value) => value < day) ?? "";
  const nextDay = (): string => messageDays.find((value) => value > day) ?? "";

  const paint = (): void => {
    const snapshot = chatAt(graph, incident, day);
    const activeRole = override ?? snapshot.activeRole;
    const phase = slaPhaseOnDay(incident, day);
    const phaseTitle = SLA_PHASE_TITLES[phase];
    const phaseTone = phase === "ok" ? "green" : phase === "paused" ? "amber" : phase === "overdue" ? "red" : "gray";
    const roleChips = ROLE_IDS.map(
      (role) =>
        '<div class="role-chip"><i class="role-color" style="background:' + ROLE_COLORS[role] + '" aria-hidden="true"></i> ' +
        ROLE_NAMES[role] + "</div>",
    ).join("");
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
        backHref: hrefTimeline(day, "gantt"),
        nextDay: nextDay(),
        prevDay: prevDay(),
        nodeTitle: graph.byId[snapshot.nodeId]?.title ?? "",
        slaPhase: slaPhaseOnDay(incident, day),
      }) +
      '<aside class="chat-side">' +
      renderPanel({
        title: "Параметры просмотра",
        body:
          '<div class="fact-label">Выбранный участник</div>' +
          '<div class="role-chip section-gap"><i class="role-color" style="background:' + ROLE_COLORS[activeRole] + '" aria-hidden="true"></i> ' +
          ROLE_NAMES[activeRole] + "</div>" +
          '<div class="fact-label section-gap">Состояние</div>' +
          '<div class="section-gap">' + renderBadge("SLA: " + phaseTitle, phaseTone) + "</div>" +
          '<button class="button section-gap" data-action="cycle-role" style="width:100%">Сменить роль (симуляция)</button>' +
          '<p class="readonly">Переключение роли идёт через текущую модель переписки, отправка сообщений не реализована.</p>',
      }) +
      renderPanel({
        title: "Участники сценария",
        body:
          '<div class="stack">' +
          roleChips +
          "</div>",
      }) +
      "</aside></div>";
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