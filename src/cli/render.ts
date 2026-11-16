import type { Graph, Incident, Priority } from "../types.ts";
import { ACCESS_MARKS, GROUP_TITLES, PRIORITY_TITLES, ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { neighborsOf } from "../core/graph.ts";
import { sortIncidents } from "../core/incident.ts";

const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));

/** Короткие метки приоритета для табличного списка. */
const SHORT_PRIORITY: Readonly<Record<Priority, string>> = {
  urgent: "авария",
  normal: "неотложное",
  routine: "сезонное",
  none: "вне SLA",
};

/** Строка списка заявок. */
export const renderIncidentList = (graph: Graph, incidents: readonly Incident[]): string => {
  const head = pad("№", 8) + pad("узел", 6) + pad("приоритет", 12) + pad("шагов", 7) + "инцидент";
  const rows = sortIncidents(incidents).map((i) => {
    return (
      pad(i.id, 8) +
      pad(i.nodeId, 6) +
      pad(SHORT_PRIORITY[i.priority], 12) +
      pad(String(i.history.length), 7) +
      i.title + " · " + i.address
    );
  });
  return [head, "-".repeat(head.length), ...rows].join("\n");
};

/** Карточка заявки: состояние, соседи, история. */
export const renderIncidentCard = (graph: Graph, incident: Incident): string => {
  const node = graph.byId[incident.nodeId];
  const { prev, next } = neighborsOf(graph, incident.nodeId);
  const lines: string[] = [];
  lines.push(incident.id + " · " + incident.title);
  lines.push("  адрес: " + incident.address + " · канал: " + incident.reporter);
  lines.push("  приоритет: " + PRIORITY_TITLES[incident.priority] + " · категория: " + incident.category);
  lines.push("  узел: " + incident.nodeId + " — " + (node ? node.title : "?") + " [" + (node ? GROUP_TITLES[node.group] : "?") + "]");
  lines.push("  назад: " + (prev.join(", ") || "— начало процесса") + " · вперёд: " + (next.join(", ") || "— конец процесса"));
  if (incident.history.length > 0) {
    lines.push("  история:");
    incident.history.slice(-6).forEach((m) => {
      lines.push("    шаг " + m.step + ": " + m.from + " → " + m.to + " (" + m.actor + ", " + m.note + ")");
    });
    if (incident.history.length > 6) lines.push("    …ещё " + (incident.history.length - 6) + " переходов");
  } else {
    lines.push("  история: пусто (заявка создана на этом узле)");
  }
  return lines.join("\n");
};

/** Карточка узла: описание, права ролей, соседи. */
export const renderNodeCard = (graph: Graph, nodeId: string): string => {
  const node = graph.byId[nodeId];
  if (!node) return "неизвестный узел: " + nodeId;
  const { prev, next } = neighborsOf(graph, nodeId);
  const lines: string[] = [];
  lines.push(nodeId + " · " + node.title + " [" + GROUP_TITLES[node.group] + "]");
  lines.push("  " + node.desc);
  lines.push("  соседи: назад " + (prev.join(", ") || "—") + " · вперёд " + (next.join(", ") || "—"));
  lines.push("  доступ ролей:");
  ROLE_IDS.forEach((role) => {
    lines.push("    " + ACCESS_MARKS[node.access[role]] + " " + pad(ROLE_NAMES[role] + " ", 18) + node.access[role]);
  });
  return lines.join("\n");
};

/** Список всех узлов процесса. */
export const renderGraphTable = (graph: Graph): string => {
  const head = pad("узел", 6) + pad("группа", 14) + "название";
  const rows = graph.order.map((id) => {
    const n = graph.byId[id];
    if (!n) return id;
    return pad(id, 6) + pad(GROUP_TITLES[n.group], 14) + n.title;
  });
  return [head, "-".repeat(head.length), ...rows].join("\n");
};

/** Подсказка по командам. */
export const renderHelp = (): string =>
  [
    "Команды оператора:",
    "  graph                 — список узлов процесса",
    "  node U7               — карточка узла (права ролей, соседи)",
    "  list                  — список заявок с текущими узлами",
    "  show З-001            — карточка заявки",
    "  forward З-001         — шаг вперёд по соседнему узлу",
    "  back З-001            — шаг назад по соседнему узлу",
    "  move З-001 U9         — перейти на конкретный соседний узел",
    "  sweep                 — прогнать все заявки на шаг вперёд",
    "  report                — отчёт (единственная запись на диск вместе с save)",
    "  save                  — отчёт + финальное состояние в reports/",
    "  help, quit",
  ].join("\n");
