import type { Graph, Incident, RoleId, Session } from "../types.ts";
import { generateIncidents } from "../core/generator.ts";
import { moveBackward, moveForwardAs, moveToNodeAs } from "../core/navigation.ts";
import { resolveIncident } from "../core/refs.ts";
import { slaStatus, withClock } from "../core/sla.ts";
import { hoursFor } from "../data/sla.ts";
import { mulberry32 } from "../random.ts";

/** Состояние страницы: граф, сессия с ролью и временем, PRNG и выбранная заявка. */
export interface WebState {
  readonly graph: Graph;
  readonly session: Session;
  readonly rand: () => number;
  readonly seed: number;
  readonly selected: string;
}

export type Action =
  | { readonly kind: "forward"; readonly ref: string }
  | { readonly kind: "back"; readonly ref: string }
  | { readonly kind: "move"; readonly ref: string; readonly nodeId: string }
  | { readonly kind: "sweep" }
  | { readonly kind: "wait"; readonly hours: number }
  | { readonly kind: "select"; readonly ref: string }
  | { readonly kind: "role"; readonly role: RoleId }
  | { readonly kind: "reset" };

export interface ActionResult {
  readonly state: WebState;
  readonly message: string;
}

export const createState = (graph: Graph, seed: number, role: RoleId = "deputy"): WebState => ({
  graph,
  session: { step: 0, role, clock: 0, incidents: generateIncidents(graph, mulberry32(seed)), log: [] },
  rand: mulberry32(seed + 1),
  seed,
  selected: "",
});

const replace = (session: Session, incident: Incident): Session => ({
  ...session,
  incidents: session.incidents.map((i) => (i.id === incident.id ? incident : i)),
});

const tickAll = (session: Session, clock: number): Session => ({
  ...session,
  clock,
  incidents: session.incidents.map((incident) => withClock(incident, clock)),
});

const move = (state: WebState, action: Action, incident: Incident): ActionResult => {
  const step = state.session.step + 1;
  const role = state.session.role;
  const clock = state.session.clock ?? 0;
  const result =
    action.kind === "forward"
      ? moveForwardAs(state.graph, incident, state.rand, step, role, clock)
      : action.kind === "back"
        ? moveBackward(state.graph, incident, state.rand, step, "operator", clock)
        : moveToNodeAs(state.graph, incident, (action as { nodeId: string }).nodeId, step, role, clock, state.rand);
  if (!result.ok) return { state: { ...state, selected: incident.id }, message: result.error };
  const moved = result.incident;
  const nextClock = clock + hoursFor(moved.nodeId);
  const status = slaStatus(moved, nextClock);
  return {
    state: {
      ...state,
      selected: moved.id,
      session: tickAll(
        { ...replace(state.session, moved), step, log: [...state.session.log, "шаг " + step + ": " + moved.id + " " + incident.nodeId + " → " + moved.nodeId] },
        nextClock,
      ),
    },
    message: moved.id + ": " + incident.nodeId + " → " + moved.nodeId + " · SLA " + status.note,
  };
};

/** Операторское действие — чистая функция: состояние + действие → новое состояние. */
export const applyAction = (state: WebState, action: Action): ActionResult => {
  if (action.kind === "reset") {
    return { state: createState(state.graph, state.seed, state.session.role), message: "состояние сброшено, seed " + state.seed };
  }
  if (action.kind === "role") {
    return { state: { ...state, session: { ...state.session, role: action.role } }, message: "роль оператора: " + action.role };
  }
  if (action.kind === "select") {
    const found = resolveIncident(state.session, action.ref);
    return found.ok ? { state: { ...state, selected: found.incident.id }, message: "" } : { state, message: found.error };
  }
  if (action.kind === "wait") {
    const clock = (state.session.clock ?? 0) + action.hours;
    const next = tickAll(state.session, clock);
    const overdue = next.incidents.filter((incident) => slaStatus(incident, clock).phase === "overdue").length;
    return { state: { ...state, session: next }, message: "прошло " + action.hours + " ч (всего " + clock + "): просрочено " + overdue };
  }
  if (action.kind === "sweep") {
    let current = state;
    let changed = 0;
    for (let i = 0; i < 3; i += 1) {
      const step = current.session.step + 1;
      const clock = current.session.clock ?? 0;
      const next = current.session.incidents.map((incident) => {
        const result = moveForwardAs(current.graph, incident, current.rand, step, "system", clock);
        return result.ok ? result.incident : incident;
      });
      const moved = next.filter((incident, index) => incident.nodeId !== current.session.incidents[index]?.nodeId);
      if (moved.length === 0) break;
      changed += moved.length;
      const hours = moved.reduce((sum, incident) => sum + hoursFor(incident.nodeId), 0);
      current = {
        ...current,
        session: tickAll(
          { ...current.session, step, incidents: next, log: [...current.session.log, "шаг " + step + ": массовый прогон, сдвинуто " + moved.length] },
          clock + hours,
        ),
      };
    }
    return { state: current, message: changed ? "массовый прогон: сдвинуто " + changed + " заявок" : "все заявки уже в архиве или в конце процесса" };
  }
  const found = resolveIncident(state.session, action.ref);
  if (!found.ok) return { state, message: found.error };
  return move(state, action, found.incident);
};
