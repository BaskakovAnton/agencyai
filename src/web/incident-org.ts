/** Участники обращения: выделено из incident-html.ts (лимит 200 строк). Поведение не менялось. */
import { esc, renderEmptyState } from "./components.ts";
import type { IncidentView } from "./incident.ts";

const ROLE_TYPE_TITLES: Readonly<Record<"accountable" | "participant", string>> = {
  accountable: "ответственное подразделение",
  participant: "участник",
};

/** Участники из орг-модели, если она подключена; иначе — роли узлов (прежнее поведение). */
const orgParticipantsBlock = (view: IncidentView): string => {
  const summary = view.orgSummary;
  if (summary === null) return "";
  if (summary.participants.length === 0) {
    return renderEmptyState(
      summary.status === "completed" || summary.status === "reopened"
        ? "Активных назначений нет: завершение закрыло участие, для продолжения нужно новое назначение."
        : "Назначения по этому обращению отсутствуют.",
    );
  }
  return summary.participants
    .map((participant) =>
      '<div class="assignee section-gap"><span class="avatar" aria-hidden="true">' + esc(participant.name.slice(0, 2)) + "</span>" +
      '<div><div class="assignee-name">' + esc(participant.name) + "</div>" +
      '<div class="fact-label">' + ROLE_TYPE_TITLES[participant.type] +
      (participant.employees.length === 0 ? " · сотрудник не назначен" : " · " + esc(participant.employees.join(", "))) +
      "</div></div></div>",
    )
    .join("");
};

export const participantsBlock = (view: IncidentView): string =>
  view.orgSummary !== null
    ? orgParticipantsBlock(view)
    : view.participants.length === 0
      ? '<p class="muted">Участники не определены моделью.</p>'
      : view.participants
        .map((person) =>
          '<div class="assignee section-gap"><span class="avatar" aria-hidden="true">' + esc(person.initials) + "</span>" +
          '<div><div class="assignee-name">' + esc(person.name) + "</div>" +
          '<div class="fact-label">' + esc(person.note) + "</div></div></div>",
        )
        .join("");
