import type { Graph, Incident, RoleId, Session } from "../types.ts";
import { moveBackward, moveForwardAs, moveToNodeAs } from "../core/navigation.ts";
import { ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { hoursFor } from "../data/sla.ts";
import { slaStatus, withClock } from "../core/sla.ts";
import { buildFinalState, buildSummary, renderSummary } from "../core/report.ts";
import { renderGraphTable, renderHelp, renderIncidentCard, renderIncidentList, renderNodeCard, renderSituationCard, renderSituationsList, renderSlaLine } from "./render.ts";
import { situationById } from "../data/situations.ts";
import type { Command } from "./commands.ts";

/** Что нужно сделать во внешнем мире (диск) — единственные побочные эффекты. */
export type Effect = { readonly kind: "report"; readonly text: string } | { readonly kind: "state"; readonly data: unknown };

export interface StepResult {
  readonly session: Session;
  readonly output: readonly string[];
  readonly effects: readonly Effect[];
  readonly quit: boolean;
}

export { normalizeRef } from "../core/refs.ts";
import { findIncidentByRef } from "../core/refs.ts";

const findIncident = (session: Session, ref: string): Incident | undefined => findIncidentByRef(session, ref);

/** Разбор роли: id, русское название или префикс. */
export const resolveRole = (input: string | null): RoleId | null => {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  const byId = ROLE_IDS.find((role) => role === value || role.startsWith(value));
  if (byId) return byId;
  const byName = ROLE_IDS.find((role) => ROLE_NAMES[role].toLowerCase().startsWith(value));
  return byName ?? null;
};

const roleOf = (session: Session): RoleId => session.role ?? "deputy";

const clockOf = (session: Session): number => session.clock ?? 0;

/** Время прошло: обновляем просрочки у всех заявок. */
const tickAll = (session: Session, clock: number): Session => ({
  ...session,
  clock,
  incidents: session.incidents.map((incident) => withClock(incident, clock)),
});

const replace = (session: Session, incident: Incident): Session => ({
  ...session,
  incidents: session.incidents.map((i) => (i.id === incident.id ? incident : i)),
});

/**
 * Чистый редьюсер: команда + состояние → новое состояние, вывод и список эффектов.
 * Ничего не пишет на диск и не читает ввод — это позволяет тестам повторять маршрут оператора.
 */
export const applyCommand = (
  graph: Graph,
  session: Session,
  command: Command,
  rand: () => number,
  now: string,
): StepResult => {
  const base: StepResult = { session, output: [], effects: [], quit: false };
  const effectReport = (): Effect => ({
    kind: "report",
    text: renderSummary(buildSummary(graph, session, now)),
  });

  switch (command.kind) {
    case "help":
      return { ...base, output: [renderHelp()] };
    case "graph":
      return { ...base, output: [renderGraphTable(graph)] };
    case "list":
      return { ...base, output: [renderIncidentList(graph, session.incidents)] };
    case "situations":
      return { ...base, output: [renderSituationsList()] };
    case "situation": {
      const situation = situationById(command.ref);
      if (!situation) return { ...base, output: ["ситуация не найдена: " + command.ref] };
      return { ...base, output: [renderSituationCard(situation)] };
    }
    case "node": {
      if (!graph.byId[command.nodeId]) return { ...base, output: ["неизвестный узел: " + command.nodeId] };
      return { ...base, output: [renderNodeCard(graph, command.nodeId)] };
    }
    case "show": {
      const incident = findIncident(session, command.ref);
      if (!incident) return { ...base, output: ["заявка не найдена: " + command.ref] };
      return { ...base, output: [renderIncidentCard(graph, incident, roleOf(session)), renderSlaLine(incident, clockOf(session))] };
    }
    case "role": {
      if (command.role === null) {
        return { ...base, output: ["роль оператора: " + ROLE_NAMES[roleOf(session)] + " (" + roleOf(session) + ")"] };
      }
      const role = resolveRole(command.role);
      if (!role) return { ...base, output: ["неизвестная роль: " + command.role + " — доступны " + ROLE_IDS.join(", ")] };
      return {
        ...base,
        session: { ...session, role },
        output: ["роль оператора: " + ROLE_NAMES[role] + " (" + role + ") — переходы проверяются по правам этой роли"],
      };
    }
    case "forward": case "back": case "move": {
      const incident = findIncident(session, command.ref);
      if (!incident) return { ...base, output: ["заявка не найдена: " + command.ref] };
      const step = session.step + 1;
      const role = roleOf(session);
      const clock = clockOf(session);
      const result =
        command.kind === "forward"
          ? moveForwardAs(graph, incident, rand, step, role, clock)
          : command.kind === "back"
            ? moveBackward(graph, incident, rand, step, "operator", clock)
            : moveToNodeAs(graph, incident, command.nodeId, step, role, clock, rand);
      if (!result.ok) return { ...base, output: ["отказ: " + result.error] };
      const moved = result.incident;
      const nextClock = clock + hoursFor(moved.nodeId);
      const nextSession = tickAll({ ...replace(session, moved), step, log: [...session.log, "шаг " + step + ": " + moved.id + " " + incident.nodeId + " → " + moved.nodeId + " (" + command.kind + ")"] }, nextClock);
      return { ...base, session: nextSession, output: [renderIncidentCard(graph, moved, role), renderSlaLine(moved, nextClock)] };
    }
    case "wait": {
      const clock = clockOf(session) + command.hours;
      const next = tickAll(session, clock);
      const overdue = next.incidents.filter((incident) => slaStatus(incident, clock).phase === "overdue").length;
      const escalated = next.incidents.filter((incident) => incident.sla.escalated).length;
      return {
        ...base,
        session: next,
        output: ["прошло " + command.hours + " ч (всего " + clock + "): просрочено " + overdue + ", эскалировано " + escalated],
      };
    }
    case "sweep": {
      let current = session;
      let output: string[] = [];
      let steps = 0;
      for (let k = 0; k < 3; k += 1) {
        const step = current.step + 1;
        const moved = current.incidents.map((i) => {
          const r = moveForwardAs(graph, i, rand, step, "system", clockOf(current));
          return r.ok ? r.incident : i;
        });
        const changed = moved.filter((m, idx) => m.nodeId !== current.incidents[idx]?.nodeId).length;
        if (changed === 0) break;
        steps += 1;
        const grown = moved.filter((m, idx) => m.nodeId !== current.incidents[idx]?.nodeId);
        const advanced = grown.reduce((sum, m) => sum + hoursFor(m.nodeId), 0);
        current = tickAll({ ...current, step, incidents: moved, log: [...current.log, "шаг " + step + ": массовый прогон, сдвинуто " + changed + " заявок"] }, clockOf(current) + advanced);
        output = [renderIncidentList(graph, current.incidents)];
      }
      return { ...base, session: current, output: steps ? output : ["все заявки уже в архиве или в конце процесса"] };
    }
    case "report":
      return { ...base, output: [renderSummary(buildSummary(graph, session, now))], effects: [effectReport()] };
    case "save": {
      const summary = buildSummary(graph, session, now);
      return {
        ...base,
        output: ["сохранение: отчёт + финальное состояние (всего заявок " + summary.total + ", переходов " + summary.moves + ")"],
        effects: [
          { kind: "report", text: renderSummary(summary) },
          { kind: "state", data: buildFinalState(graph, session, now) },
        ],
      };
    }
    case "quit":
      return { ...base, quit: true };
    case "unknown":
      return { ...base, output: ['не понял команду: "' + command.raw.trim() + '" — help для списка'] };
    default:
      return base;
  }
};
