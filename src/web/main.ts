import { buildGraph, neighborsOf } from "../core/graph.ts";
import { generateIncidents } from "../core/generator.ts";
import { moveBackward, moveForward, moveToNode } from "../core/navigation.ts";
import { buildFinalState, buildSummary } from "../core/report.ts";
import { NODES } from "../data/nodes.ts";
import { mulberry32, pick, randInt, shuffle } from "../random.ts";
import { applyAction, createState, type Action } from "./session.ts";
import { renderPage } from "./view.ts";

/** Вся модель, доступная на странице (и в тестах паритета). */
export { NODES } from "../data/nodes.ts";
export { buildGraph, neighborsOf } from "../core/graph.ts";
export { generateIncidents } from "../core/generator.ts";
export { moveBackward, moveForward, moveToNode } from "../core/navigation.ts";
export { buildFinalState, buildSummary } from "../core/report.ts";
export { mulberry32, pick, randInt, shuffle } from "../random.ts";
export { applyAction, createState } from "./session.ts";
export { renderPage } from "./view.ts";

const readSeed = (): number => {
  if (typeof location === "undefined") return 42;
  const raw = new URLSearchParams(location.search).get("seed");
  const value = Number.parseInt(raw ?? "42", 10);
  return Number.isFinite(value) ? value : 42;
};

const actionOf = (element: HTMLElement): Action | null => {
  const kind = element.dataset.action;
  const ref = element.dataset.ref ?? "";
  const nodeId = element.dataset.node ?? "";
  if (kind === "forward" || kind === "back") return { kind, ref };
  if (kind === "select") return { kind: "select", ref };
  if (kind === "move") return { kind: "move", ref, nodeId };
  if (kind === "sweep" || kind === "reset") return { kind };
  return null;
};

const mount = (): void => {
  const root = document.querySelector("#app");
  if (!root) return;
  let state = createState(buildGraph(NODES), readSeed());
  let message = "";
  const paint = (): void => {
    root.innerHTML = renderPage(state, message);
  };
  root.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement | null)?.closest("[data-action]") as HTMLElement | null;
    if (!target) return;
    const action = actionOf(target);
    if (!action) return;
    const result = applyAction(state, action);
    state = result.state;
    message = result.message;
    paint();
  });
  paint();
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
}
