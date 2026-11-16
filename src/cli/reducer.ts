import type { Graph, Incident, Session } from "../types.ts";
import { moveBackward, moveForward, moveToNode } from "../core/navigation.ts";
import { buildFinalState, buildSummary, renderSummary } from "../core/report.ts";
import { renderGraphTable, renderHelp, renderIncidentCard, renderIncidentList, renderNodeCard } from "./render.ts";
import type { Command } from "./commands.ts";

/** Что нужно сделать во внешнем мире (диск) — единственные побочные эффекты. */
export type Effect = { readonly kind: "report"; readonly text: string } | { readonly kind: "state"; readonly data: unknown };

export interface StepResult {
  readonly session: Session;
  readonly output: readonly string[];
  readonly effects: readonly Effect[];
  readonly quit: boolean;
}

/** Гибкая ссылка на заявку: 5, З-5, з-5, z-5, Z-005 → З-005. */
export const normalizeRef = (ref: string): string => {
  const s = ref.trim().toUpperCase().replace(/\s+/g, "");
  const m = /^(?:З|Z)?-?0*(\d{1,3})$/.exec(s);
  if (!m) return s;
  return "З-" + String(Number.parseInt(m[1] as string, 10)).padStart(3, "0");
};

const findIncident = (session: Session, ref: string): Incident | undefined => {
  const byId = session.incidents.find((i) => i.id === normalizeRef(ref));
  if (byId) return byId;
  const num = Number.parseInt(ref, 10);
  if (Number.isFinite(num) && num >= 1 && num <= session.incidents.length) return session.incidents[num - 1];
  return undefined;
};

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
    case "node": {
      if (!graph.byId[command.nodeId]) return { ...base, output: ["неизвестный узел: " + command.nodeId] };
      return { ...base, output: [renderNodeCard(graph, command.nodeId)] };
    }
    case "show": {
      const incident = findIncident(session, command.ref);
      if (!incident) return { ...base, output: ["заявка не найдена: " + command.ref] };
      return { ...base, output: [renderIncidentCard(graph, incident)] };
    }
    case "forward": case "back": case "move": {
      const incident = findIncident(session, command.ref);
      if (!incident) return { ...base, output: ["заявка не найдена: " + command.ref] };
      const step = session.step + 1;
      const result =
        command.kind === "forward"
          ? moveForward(graph, incident, rand, step, "operator")
          : command.kind === "back"
            ? moveBackward(graph, incident, rand, step, "operator")
            : moveToNode(graph, incident, command.nodeId, step, "operator");
      if (!result.ok) return { ...base, output: ["отказ: " + result.error] };
      const moved = result.incident;
      const nextSession: Session = {
        ...replace(session, moved),
        step,
        log: [...session.log, "шаг " + step + ": " + moved.id + " " + incident.nodeId + " → " + moved.nodeId + " (" + command.kind + ")"],
      };
      return { ...base, session: nextSession, output: [renderIncidentCard(graph, moved)] };
    }
    case "sweep": {
      let current = session;
      let output: string[] = [];
      let steps = 0;
      for (let k = 0; k < 3; k += 1) {
        const step = current.step + 1;
        const moved = current.incidents.map((i) => {
          const r = moveForward(graph, i, rand, step, "auto");
          return r.ok ? r.incident : i;
        });
        const changed = moved.filter((m, idx) => m.nodeId !== current.incidents[idx]?.nodeId).length;
        if (changed === 0) break;
        steps += 1;
        current = { ...current, step, incidents: moved, log: [...current.log, "шаг " + step + ": массовый прогон, сдвинуто " + changed + " заявок"] };
        output = [renderIncidentList(graph, current.incidents)];
      }
      return { ...base, session: current, output: steps ? output : ["все заявки уже в конце процесса"] };
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
