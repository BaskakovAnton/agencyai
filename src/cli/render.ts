import type { Graph, Incident, Priority, RoleId, Situation, SituationSection } from "../types.ts";
import { ACCESS_MARKS, GROUP_TITLES, PRIORITY_TITLES, ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { branchesOf, neighborsOf } from "../core/graph.ts";
import { roleAccess } from "../core/roles.ts";
import { slaStatus } from "../core/sla.ts";
import { SITUATIONS, SITUATION_SECTIONS, nodesForSituation, situationById } from "../data/situations.ts";
import { branchShares } from "../data/edges.ts";
import { sortIncidents } from "../core/incident.ts";

const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));

/** Строка развилки с процентами (пусто, если узел линейный). */
export const branchText = (graph: Graph, nodeId: string): string => {
  const shares = branchShares(branchesOf(graph, nodeId));
  if (shares.length === 0) return "";
  return "  развилка: " + shares.map((s) => s.to + " " + s.percent + "% — " + s.note).join("; ");
};

/** Короткие метки приоритета для табличного списка. */
const SHORT_PRIORITY: Readonly<Record<Priority, string>> = {
  urgent: "авария",
  normal: "неотложное",
  routine: "сезонное",
  none: "вне SLA",
};

/** Список всех ситуаций регламента по разделам. */
export const renderSituationsList = (situations: readonly Situation[] = SITUATIONS): string => {
  const lines: string[] = ["Ситуации регламента: " + situations.length];
  (Object.keys(SITUATION_SECTIONS) as SituationSection[]).forEach((section) => {
    const items = situations.filter((item) => item.section === section);
    lines.push("", SITUATION_SECTIONS[section] + " — " + items.length);
    items.forEach((item) => lines.push("  " + item.id + "  " + item.title + "  [" + item.priority + " · " + item.sla + "]"));
  });
  return lines.join("\n");
};

/** Карточка ситуации: шаги по ролям и связанные узлы. */
export const renderSituationCard = (situation: Situation): string => {
  const lines: string[] = [];
  lines.push(situation.id + " · " + situation.title + " [" + SITUATION_SECTIONS[situation.section] + "]");
  lines.push("  " + situation.summary);
  lines.push("  приоритет: " + situation.priority + " · SLA: " + situation.sla);
  lines.push("  узлы: " + (nodesForSituation(situation.id).join(", ") || "—"));
  lines.push("  шаги:");
  situation.steps.forEach((step, index) => lines.push("    " + (index + 1) + ". " + ROLE_NAMES[step.lane] + ": " + step.title + " — " + step.text));
  return lines.join("\n");
};

/** Строка SLA для карточки заявки. */
export const renderSlaLine = (incident: Incident, clock: number): string => {
  const status = slaStatus(incident, clock);
  const mark = status.phase === "overdue" ? "✕" : status.phase === "paused" ? "⏸" : status.phase === "none" ? "—" : "✓";
  return "  SLA: " + mark + " " + status.note + (status.escalated ? " · эскалировано в U16" : "");
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
export const renderIncidentCard = (graph: Graph, incident: Incident, role?: RoleId): string => {
  const node = graph.byId[incident.nodeId];
  const { prev, next } = neighborsOf(graph, incident.nodeId);
  const lines: string[] = [];
  lines.push(incident.id + " · " + incident.title);
  lines.push("  адрес: " + incident.address + " · канал: " + incident.reporter);
  lines.push("  приоритет: " + PRIORITY_TITLES[incident.priority] + " · категория: " + incident.category);
  const situation = situationById(incident.situationId);
  if (situation) lines.push("  ситуация: " + situation.id + " «" + situation.title + "» · " + situation.sla);
  lines.push("  узел: " + incident.nodeId + " — " + (node ? node.title : "?") + " [" + (node ? GROUP_TITLES[node.group] : "?") + "]");
  lines.push("  назад: " + (prev.join(", ") || "— начало процесса") + " · вперёд: " + (next.join(", ") || "— конец процесса"));
  const branch = branchText(graph, incident.nodeId);
  if (branch) lines.push(branch);
  if (role) {
    const access = roleAccess(graph, incident.nodeId, role);
    lines.push("  роль оператора: " + ROLE_NAMES[role] + " · на этом узле: " + access.level + " (" + access.caveat + ")" + (access.allowed ? "" : " — переходы сюда запрещены"));
  }
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
export const renderNodeCard = (graph: Graph, nodeId: string, role?: RoleId): string => {
  const node = graph.byId[nodeId];
  if (!node) return "неизвестный узел: " + nodeId;
  const { prev, next } = neighborsOf(graph, nodeId);
  const lines: string[] = [];
  lines.push(nodeId + " · " + node.title + " [" + GROUP_TITLES[node.group] + "]");
  lines.push("  " + node.desc);
  lines.push("  соседи: назад " + (prev.join(", ") || "—") + " · вперёд " + (next.join(", ") || "—"));
  const branch = branchText(graph, nodeId);
  if (branch) lines.push(branch);
  lines.push("  доступ ролей:");
  ROLE_IDS.forEach((id) => {
    const mark = id === role ? " ←" : "";
    lines.push("    " + ACCESS_MARKS[node.access[id]] + " " + pad(ROLE_NAMES[id] + " ", 18) + node.access[id] + mark);
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
    "  wait 24               — промотать время на N часов (проверка SLA)",
    "  role contractor       — роль оператора (deputy, assistant, contractor, system, resident, observer, auditor)",
    "  role                  — показать текущую роль",
    "  graph                 — список узлов процесса",
    "  node U7               — карточка узла (права ролей, соседи)",
    "  list                  — список заявок с текущими узлами",
    "  situations            — все 37 ситуаций регламента",
    "  situation С9          — карточка ситуации: шаги и узлы",
    "  show З-001            — карточка заявки",
    "  forward З-001         — шаг вперёд по соседнему узлу",
    "  back З-001            — шаг назад по соседнему узлу",
    "  move З-001 U9         — перейти на конкретный соседний узел",
    "  sweep                 — прогнать все заявки на шаг вперёд",
    "  report                — отчёт (единственная запись на диск вместе с save)",
    "  save                  — отчёт + финальное состояние в reports/",
    "  help, quit",
  ].join("\n");
