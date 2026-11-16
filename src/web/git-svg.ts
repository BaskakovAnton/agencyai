import type { GitCommit, GitModel } from "../core/gitgraph.ts";
import { formatDay } from "../core/timeline.ts";
import { FORK_MARK, MERGE_MARK, SLA_COLORS } from "./theme.ts";

export interface GitSvgOptions {
  readonly columnWidth?: number;
  readonly rowHeight?: number;
  readonly labelWidth?: number;
  readonly slotStep?: number;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

const cellKey = (commit: GitCommit): string => commit.day + "|" + commit.nodeId;

/**
 * SVG-разметка Git-графа: колонки — узлы процесса, строки — дни, точки — коммиты заявок.
 * Коммиты одной ячейки (день + узел) раскладываются по слотам, поэтому не перекрываются.
 */
export const renderGitSvg = (model: GitModel, filter = "", options: GitSvgOptions = {}): string => {
  const columnWidth = options.columnWidth ?? 44;
  const baseRow = options.rowHeight ?? 26;
  const labelWidth = options.labelWidth ?? 86;
  const slotStep = options.slotStep ?? 17;
  const top = 34;
  const commits = filter === "" ? model.commits : model.commits.filter((commit) => commit.incidentId === filter);

  const perCell = new Map<string, number>();
  for (const commit of model.commits) perCell.set(cellKey(commit), (perCell.get(cellKey(commit)) ?? 0) + 1);

  const rowHeight = (day: string): number => {
    let max = 1;
    for (const column of model.columns) max = Math.max(max, perCell.get(day + "|" + column.nodeId) ?? 0);
    return Math.max(baseRow, 14 + (max - 1) * slotStep + 12);
  };
  const rowTops: number[] = [];
  let cursor = top;
  for (const day of model.days) {
    rowTops.push(cursor);
    cursor += rowHeight(day);
  }
  const height = cursor + 12;
  const width = labelWidth + model.columns.length * columnWidth + 16;

  const x = (nodeIndex: number): number => labelWidth + nodeIndex * columnWidth + columnWidth / 2;
  const rowOf = (day: string): number => Math.max(model.days.indexOf(day), 0);
  const slotOf = (commit: GitCommit): number => {
    let slot = 0;
    for (const other of model.commits) {
      if (other.id === commit.id) break;
      if (cellKey(other) === cellKey(commit)) slot += 1;
    }
    return slot;
  };
  const y = (commit: GitCommit): number => rowTops[rowOf(commit.day)] + 11 + slotOf(commit) * slotStep;

  const grid: string[] = [];
  model.columns.forEach((column) => {
    grid.push('<line class="grid-v" x1="' + x(column.index) + '" y1="' + top + '" x2="' + x(column.index) + '" y2="' + (height - 12) + '"></line>');
    grid.push('<text class="col-label" x="' + x(column.index) + '" y="' + (top - 12) + '">' + column.nodeId + "</text>");
    const mark = column.isFork ? FORK_MARK : column.isMerge ? MERGE_MARK : "";
    if (mark !== "") {
      grid.push('<text class="col-mark" x="' + x(column.index) + '" y="' + (top - 24) + '">' + mark + "</text>");
    }
  });
  model.days.forEach((day, index) => {
    const rowTop = rowTops[index] as number;
    const rowBottom = rowTop + rowHeight(day);
    grid.push('<line class="grid-h" x1="' + labelWidth + '" y1="' + rowBottom + '" x2="' + (width - 16) + '" y2="' + rowBottom + '"></line>');
    grid.push(
      '<text class="row-label" x="' + (labelWidth - 10) + '" y="' + (rowTop + rowHeight(day) / 2 + 4) + '">' +
      formatDay(day) + "</text>",
    );
  });

  const visible = new Set(commits.map((commit) => commit.id));
  const links = model.links
    .filter((link) => visible.has(link.from) && visible.has(link.to))
    .map((link) => {
      const from = commits.find((commit) => commit.id === link.from) as GitCommit;
      const to = commits.find((commit) => commit.id === link.to) as GitCommit;
      const x1 = x(from.nodeIndex);
      const x2 = x(to.nodeIndex);
      const y1 = y(from);
      const y2 = y(to);
      return (
        '<polyline class="link' + (to.isHero ? " hero" : "") + '" data-sla="' + to.slaPhase +
        '" points="' + x1 + "," + y1 + " " + x2 + "," + y1 + " " + x2 + "," + y2 +
        '" stroke="' + SLA_COLORS[to.slaPhase] + '"></polyline>'
      );
    })
    .join("");

  // группа-коммит = только точка: так её зона попадания не перекрывает соседей,
  // а подпись живёт отдельным текстом и не мешает кликам
  const dots = commits
    .map((commit) => {
      const cx = x(commit.nodeIndex);
      const cy = y(commit);
      const attributes =
        'data-commit="' + commit.id + '" data-incident="' + commit.incidentId + '" data-node="' + commit.nodeId +
        '" data-node-title="' + escapeHtml(commit.nodeTitle) + '" data-day="' + commit.day +
        '" data-role="' + commit.role + '" data-sla="' + commit.slaPhase + '" data-hours="' + commit.hoursInNode +
        '" data-text="' + escapeHtml(commit.text) + '" tabindex="0"';
      const forkMark = commit.isFork
        ? '<polygon class="fork" points="' + (cx - 5) + "," + (cy - 16) + " " + cx + "," + (cy - 22) + " " +
          (cx + 5) + "," + (cy - 16) + " " + cx + "," + (cy - 10) + '" fill="#4da3ff"></polygon>'
        : "";
      const mergeMark = commit.isMerge
        ? '<polygon class="merge" points="' + (cx - 5) + "," + (cy + 16) + " " + cx + "," + (cy + 22) + " " +
          (cx + 5) + "," + (cy + 16) + " " + cx + "," + (cy + 10) + '" fill="#f472b6"></polygon>'
        : "";
      return (
        '<g class="commit' + (commit.isHero ? " hero" : "") + '" ' + attributes + ">" +
        '<rect class="hit" x="' + (cx - 9) + '" y="' + (cy - 8) + '" width="18" height="16" fill="transparent"></rect>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + SLA_COLORS[commit.slaPhase] + '"></circle>' +
        forkMark + mergeMark +
        "</g>" +
        '<text class="dot-label' + (commit.isHero ? " hero" : "") + '" x="' + (cx + 9) + '" y="' + (cy + 4) + '">' +
        commit.incidentId + "</text>"
      );
    })
    .join("");

  return (
    '<svg class="git" data-graph viewBox="0 0 ' + width + " " + height + '" width="' + width + '" height="' + height + '" role="img">' +
    '<g class="grid">' + grid.join("") + "</g>" +
    '<g class="links">' + links + "</g>" +
    '<g class="dots">' + dots + "</g>" +
    "</svg>"
  );
};
