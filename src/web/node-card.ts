import type { GitCommit } from "../core/gitgraph.ts";
import { SLA_PHASE_TITLES } from "../core/sla-at.ts";
import { formatStamp } from "../core/timeline.ts";
import { GROUP_TITLES, ROLE_NAMES } from "../data/roles.ts";
import { FORK_MARK, MERGE_MARK, SLA_COLORS } from "./theme.ts";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

/** Карточка узла: кто отвечает, сколько заявка здесь стоит, какой у неё SLA. */
export const renderNodeCard = (commit: GitCommit, chatHref: string): string =>
  [
    '<aside class="node-card" data-node-card tabindex="-1" data-sla="' + commit.slaPhase + '" data-node="' +
      commit.nodeId + '">',
    '<div class="node-card-head"><b>' + commit.incidentId + "</b> · " + commit.nodeId + " " +
      escapeHtml(commit.nodeTitle) + "</div>",
    '<div class="node-card-row"><span>группа</span><b>' + GROUP_TITLES[commit.group] + "</b></div>",
    '<div class="node-card-row"><span>ответственный</span><b>' + ROLE_NAMES[commit.role] + "</b></div>",
    '<div class="node-card-row"><span>время в узле</span><b>' + commit.hoursInNode + " ч</b></div>",
    '<div class="node-card-row"><span>событие</span><b>' + formatStamp(commit.at) + "</b></div>",
    '<div class="node-card-row"><span>SLA</span><b style="color:' + SLA_COLORS[commit.slaPhase] + '">' +
      SLA_PHASE_TITLES[commit.slaPhase] + "</b></div>",
    commit.isFork ? '<div class="node-card-tag">' + FORK_MARK + " развилка: отсюда заявка может уйти на другую ветку</div>" : "",
    commit.isMerge ? '<div class="node-card-tag">' + MERGE_MARK + " слияние: сюда возвращаются после переделки</div>" : "",
    '<p class="node-card-text">' + escapeHtml(commit.text) + "</p>",
    '<div class="node-card-actions">',
    '<a data-card-action="chat" href="' + chatHref + '">Открыть чат на эту дату</a>',
    '<button data-card-action="close">Закрыть</button>',
    "</div>",
    "</aside>",
  ].join("");
