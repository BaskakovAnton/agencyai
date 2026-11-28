import { validateAppeal, type AppealDraft, type AppealStream, type ValidationIssue } from "../core/appeal.ts";
import { renderAppealChooser, renderAppealConfirm, renderAppealForm } from "./appeal-html.ts";

/** Прототип формы: состояние в памяти страницы, ничего не отправляется и не сохраняется. */
const streamFromHash = (): AppealStream | null => {
  if (typeof location === "undefined") return null;
  const value = /[?&]stream=(official|operational)/.exec(location.hash)?.[1];
  return value === "official" || value === "operational" ? value : null;
};

export const mountAppeal = (root: HTMLElement): void => {
  const stream = streamFromHash();
  let draft: AppealDraft = { name: "", contact: "", text: "", consent: false, identified: false };
  let issues: readonly ValidationIssue[] = [];
  let confirmed = false;

  const read = (form: HTMLFormElement): AppealDraft => {
    const data = new FormData(form);
    return {
      name: String(data.get("name") ?? ""),
      contact: String(data.get("contact") ?? ""),
      text: String(data.get("text") ?? ""),
      consent: data.get("consent") !== null,
      identified: data.get("identified") !== null,
    };
  };

  const paint = (): void => {
    if (stream === null) { root.innerHTML = renderAppealChooser(); return; }
    root.innerHTML = confirmed ? renderAppealConfirm(stream, draft) : renderAppealForm(stream, draft, issues);
    if (issues.length > 0) {
      const first = issues[0];
      const field = root.querySelector<HTMLElement>('[name="' + (first?.field ?? "") + '"]');
      field?.focus();
    }
  };

  root.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    draft = read(form);
    issues = validateAppeal(stream ?? "operational", draft);
    if (issues.length === 0) confirmed = true;
    paint();
  });

  paint();
};
