import { ACCESS_MARKS, ACCESS_TITLES, GROUP_TITLES, ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";
import { renderPanel } from "./components.ts";
import type { Graph } from "../types.ts";

const esc = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

const LEVEL_CLASS: Readonly<Record<string, string>> = {
  allow: "allow",
  subset: "conditional",
  conditional: "conditional",
  deny: "deny",
  na: "na",
};

const groupsOf = (graph: Graph): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const id of graph.order) {
    const group = graph.byId[id]?.group ?? "";
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return counts;
};

/** Каталог узлов: карточки с идентификатором, названием и группой. */
export const renderNodeCatalog = (graph: Graph): string =>
  renderPanel({
    title: "Узлы процесса",
    subtitle: graph.order.length + " узлов модели",
    body:
      '<div class="node-grid">' +
      graph.order
        .map((id) => {
          const node = graph.byId[id];
          return '<div class="node-card" data-node-card-id="' + id + '"><div class="node-id">' + id + "</div>" +
            '<div class="node-title">' + esc(node?.title ?? "") + "</div>" +
            '<div class="node-group">' + esc(GROUP_TITLES[(node?.group ?? "") as keyof typeof GROUP_TITLES] ?? "") + "</div></div>";
        })
        .join("") +
      "</div>",
  });

/** Группы модели: навигационная группировка узлов с количеством. */
export const renderGroupPanel = (graph: Graph): string => {
  const counts = groupsOf(graph);
  return renderPanel({
    title: "Группы модели",
    subtitle: "Навигационная группировка узлов, не отдельные статусы",
    body:
      '<div class="filter-pills" data-group-legend>' +
      Object.entries(GROUP_TITLES)
        .map(([id, title]) => '<span class="filter-pill" data-group="' + id + '">' + esc(title) + " · " + (counts[id] ?? 0) + "</span>")
        .join("") +
      "</div>",
  });
};

/** Обозначения доступа: знак и расшифровка уровня. */
export const renderAccessLegend = (): string =>
  renderPanel({
    title: "Обозначения доступа",
    subtitle: "Уровни прав роли на узле",
    body:
      '<div class="legend legend-single">' +
      Object.keys(ACCESS_TITLES)
        .map((level) => {
          const mark = '<span class="permission ' + (LEVEL_CLASS[level] ?? "na") + '">' + ACCESS_MARKS[level as keyof typeof ACCESS_MARKS] + "</span>";
          return '<div class="legend-item">' + mark + "<span>" + esc(ACCESS_TITLES[level as keyof typeof ACCESS_TITLES]) + "</span></div>";
        })
        .join("") +
      "</div>",
  });

/** Матрица «роль × узел»: значения из data/roles, без пересчёта. */
export const renderPermissionMatrix = (graph: Graph): string =>
  renderPanel({
    title: "Матрица «роль × узел»",
    subtitle: "Права ролей из данных модели",
    body:
      '<div class="matrix-wrap" tabindex="0" role="region" aria-label="Матрица прав: прокручивается по горизонтали">' +
      '<table class="matrix" data-permission-matrix><caption class="sr-only">Уровни доступа ролей к узлам процесса</caption>' +
      '<thead><tr><th scope="col">Роль</th>' +
      graph.order.map((id) => '<th scope="col">' + id + "</th>").join("") +
      "</tr></thead><tbody>" +
      ROLE_IDS.map((role) => {
        const cells = graph.order
          .map((id) => {
            const level = graph.byId[id]?.access[role] ?? "na";
            return '<td><span class="permission ' + (LEVEL_CLASS[level] ?? "na") + '">' + ACCESS_MARKS[level] + "</span></td>";
          })
          .join("");
        return '<tr data-permission-row="' + role + '"><td>' + esc(ROLE_NAMES[role]) + "</td>" + cells + "</tr>";
      }).join("") +
      "</tbody></table></div>",
  });

/** Справка по модели: границы демонстрационных данных. */
export const renderModelHelp = (graph: Graph): string =>
  renderPanel({
    title: "Справка по модели",
    subtitle: "Что показывает экран",
    body:
      '<div class="stack">' +
      '<p class="muted">Узлы и группы, роли и уровни доступа берутся из данных модели (' + graph.order.length +
      " узлов, " + ROLE_IDS.length + " ролей). Переходы проверяются ядром, экран ничего не пересчитывает.</p>" +
      '<p class="muted">Заявки ниже — демонстрационные: их можно двигать по процессу, менять роль оператора и время.</p>' +
      "</div>",
  });
