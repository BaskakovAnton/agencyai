import type { Graph } from "../types.ts";
import { applyAction, createState, type Action } from "./session.ts";
import { renderPage } from "./view.ts";

/** Seed из адреса страницы: `?seed=7`. */
export const readSeed = (): number => {
  if (typeof location === "undefined") return 42;
  const raw = new URLSearchParams(location.search).get("seed");
  const value = Number.parseInt(raw ?? "42", 10);
  return Number.isFinite(value) ? value : 42;
};

const actionOf = (element: HTMLElement): Action | null => {
  const kind = element.dataset.action;
  const ref = element.dataset.ref ?? "";
  const nodeId = element.dataset.node ?? "";
  const role = element.dataset.role ?? "";
  if (kind === "forward" || kind === "back") return { kind, ref };
  if (kind === "select") return { kind: "select", ref };
  if (kind === "move") return { kind: "move", ref, nodeId };
  if (kind === "role") return { kind: "role", role: (role || "deputy") as Action extends never ? never : never } as Action;
  if (kind === "wait") return { kind: "wait", hours: 4 };
  if (kind === "sweep" || kind === "reset") return { kind };
  return null;
};

/** Экран «Модель»: список заявок, карточка, переходы, роли и SLA. */
export const mountModel = (root: HTMLElement, graph: Graph): void => {
  let state = createState(graph, readSeed());
  let message = "";
  const paint = (): void => {
    root.innerHTML = renderPage(state, message);
  };
  root.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement | null)?.closest("[data-action]") as HTMLElement | null;
    if (!target) return;
    const action =
      target.dataset.action === "role"
        ? ({ kind: "role", role: (target.dataset.role ?? "deputy") } as Action)
        : actionOf(target);
    if (!action) return;
    const result = applyAction(state, action);
    state = result.state;
    message = result.message;
    paint();
  });
  paint();
};
