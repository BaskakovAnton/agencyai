import type { Graph, Incident } from "../types.ts";
import { hoursFor } from "../data/sla.ts";
import { startSla, slaStatus } from "../core/sla.ts";
import { ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import {
  CHAT_CONTRACTOR,
  CHAT_INCIDENT_ADDRESS,
  CHAT_INCIDENT_ID,
  CHAT_INCIDENT_TITLE,
  CHAT_SCENARIO,
  activeRole,
  chatStart,
  currentStep,
  nextStep,
  prevStep,
  setRoleOverride,
  visibleMessages,
  type ChatState,
} from "./chat.ts";

const esc = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

let timer: ReturnType<typeof setInterval> | null = null;

const stopTimer = (): void => {
  if (timer) clearInterval(timer);
  timer = null;
};

/** Демо-заявка модуля: берём З-015 из модели, но по сценарию это авария «Разбита дверь подъезда». */
export const demoIncident = (incidents: readonly Incident[]): Incident | undefined => {
  const base = incidents.find((incident) => incident.id === CHAT_INCIDENT_ID);
  if (!base) return undefined;
  return { ...base, title: CHAT_INCIDENT_TITLE, address: CHAT_INCIDENT_ADDRESS, priority: "urgent", sla: startSla("urgent", 0) };
};

const incidentList = (incidents: readonly Incident[]): string =>
  '<h3>Заявки <span class="hint">(30)</span></h3>' +
  incidents
    .map(
      (incident) =>
        '<div class="inc-row' + (incident.id === CHAT_INCIDENT_ID ? " on" : "") + '" data-incident="' + incident.id + '">' +
        '<span>' + incident.id + '</span><span class="hint">' + incident.nodeId + '</span></div>',
    )
    .join("");

const stepper = (state: ChatState): string =>
  '<div class="stepper" data-stepper="1">' +
  CHAT_SCENARIO.map((step, index) => {
    const cls = index < state.step ? "done" : index === state.step ? "current" : "todo";
    return '<span class="step ' + cls + '" data-step="' + step.nodeId + '">' + step.icon + " " + step.nodeId + "</span>";
  }).join("") +
  "</div>";

const messagesPanel = (state: ChatState, role: string): string =>
  visibleMessages(CHAT_SCENARIO, state)
    .map((message) => {
      const side = message.lane === role && message.kind !== "system" ? " right" : "";
      return (
        '<div class="msg' + side + (message.kind === "system" ? " system" : "") + '" data-message="1">' +
        '<span class="who">' + esc(message.author) + "</span>" +
        '<span class="body">' + esc(message.text) + "</span></div>"
      );
    })
    .join("");

const contextCards = (state: ChatState, incident: Incident | undefined): string => {
  const step = currentStep(CHAT_SCENARIO, state);
  if (!incident) return "";
  const clock = CHAT_SCENARIO.slice(0, state.step + 1).reduce((sum, item) => sum + hoursFor(item.nodeId), 0);
  const status = slaStatus(incident, clock);
  const sla =
    '<div class="card-sla" data-card="sla"><b>SLA заявки ' + incident.id + " · авария 24 ч</b>" +
    esc(status.note) + " · время в модели: " + clock + " ч</div>";
  const contractor =
    step.nodeId === "U7" || state.step > 2
      ? '<div class="card-contractor" data-card="contractor"><b>Текущий подрядчик</b>' + esc(CHAT_CONTRACTOR) + " · выезд подтверждён</div>"
      : "";
  return sla + contractor;
};

export const renderChat = (graph: Graph, incidents: readonly Incident[], state: ChatState): string => {
  const step = currentStep(CHAT_SCENARIO, state);
  const role = activeRole(CHAT_SCENARIO, state);
  const incident = demoIncident(incidents);
  return [
    '<h1 class="brand">Переписка по ролям</h1>',
    '<p class="hint">Одна заявка идёт по маршруту U1 → U6 → U7 → U19, контекст беседы переключается по узлу.</p>',
    '<div class="chat">',
    '<aside class="pane" data-pane="list">' + incidentList(incidents) + "</aside>",
    '<section class="pane" data-pane="chat">',
    '<div class="chat-head"><span>Вы общаетесь как: <span class="role-badge role-' + role + '" data-role-badge="1">' + esc(ROLE_NAMES[role]) + "</span></span>" +
      '<button data-action="cycle-role" class="btn">Сменить роль (симуляция)</button></div>',
    '<div data-messages="1">' + messagesPanel(state, role) + "</div>",
    '<div class="chat-actions">' +
      '<button data-action="prev" class="btn">‹ Предыдущий узел</button>' +
      '<button data-action="next" class="btn btn-primary" data-action-primary="1">Следующий узел</button>' +
      '<button data-action="play" class="btn">Авто-плеер</button>' +
      "</div>",
    "</section>",
    '<aside class="pane" data-pane="passport">',
    "<h3>Паспорт заявки</h3>",
    '<p data-passport="1"><b>' + CHAT_INCIDENT_ID + "</b> · " + esc(CHAT_INCIDENT_TITLE) + '<br><span class="hint">' + esc(CHAT_INCIDENT_ADDRESS) + " · авария / экстренно</span></p>",
    stepper(state),
    '<p class="hint" data-node-status="1">Текущий узел: ' + step.nodeId + " · " + esc(step.title) + "</p>",
    contextCards(state, incident),
    "</aside>",
    "</div>",
  ].join("");
};

/** Экран «Переписка по ролям»: список заявок, чат с ролевым контекстом, степпер и контекстные карточки. */
export const mountChat = (root: HTMLElement, graph: Graph, incidents: readonly Incident[]): void => {
  let state = chatStart();
  let playing = false;

  const paint = (): void => {
    root.innerHTML = renderChat(graph, incidents, state);
  };

  const cycleRole = (): void => {
    const current = activeRole(CHAT_SCENARIO, state);
    const index = ROLE_IDS.indexOf(current);
    const next = ROLE_IDS[(index + 1) % ROLE_IDS.length] as (typeof ROLE_IDS)[number];
    state = setRoleOverride(state, next);
  };

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const action = target?.closest("[data-action]")?.getAttribute("data-action");
    if (action === "next") {
      state = nextStep(state);
      paint();
      return;
    }
    if (action === "prev") {
      state = prevStep(state);
      paint();
      return;
    }
    if (action === "cycle-role") {
      cycleRole();
      paint();
      return;
    }
    if (action === "play") {
      playing = !playing;
      stopTimer();
      if (playing) {
        timer = setInterval(() => {
          if (!root.isConnected) {
            stopTimer();
            return;
          }
          state = setRoleOverride(state, null);
          state = nextStep(state);
          paint();
          if (state.step === CHAT_SCENARIO.length - 1) {
            playing = false;
            stopTimer();
          }
        }, 1200);
      }
      return;
    }
    const row = target?.closest("[data-incident]") as HTMLElement | null;
    if (row) {
      state = setRoleOverride(state, null);
      paint();
    }
  });

  paint();
};
