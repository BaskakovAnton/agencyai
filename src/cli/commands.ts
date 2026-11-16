/** Разбор командной строки оператора — чистая функция. */
export type Command =
  | { readonly kind: "help" }
  | { readonly kind: "graph" }
  | { readonly kind: "list" }
  | { readonly kind: "node"; readonly nodeId: string }
  | { readonly kind: "show"; readonly ref: string }
  | { readonly kind: "forward"; readonly ref: string }
  | { readonly kind: "back"; readonly ref: string }
  | { readonly kind: "move"; readonly ref: string; readonly nodeId: string }
  | { readonly kind: "role"; readonly role: string | null }
  | { readonly kind: "sweep" }
  | { readonly kind: "report" }
  | { readonly kind: "save" }
  | { readonly kind: "quit" }
  | { readonly kind: "unknown"; readonly raw: string };

const norm = (s: string) => s.trim();

export const parseCommand = (raw: string): Command => {
  const parts = norm(raw).split(/\s+/).filter(Boolean);
  const head = (parts[0] ?? "").toLowerCase();
  const a = parts[1];
  const b = parts[2];
  switch (head) {
    case "": return { kind: "unknown", raw };
    case "help": case "?": return { kind: "help" };
    case "graph": case "nodes": return { kind: "graph" };
    case "list": case "ls": return { kind: "list" };
    case "node": return a ? { kind: "node", nodeId: a.toUpperCase() } : { kind: "unknown", raw };
    case "show": return a ? { kind: "show", ref: a } : { kind: "unknown", raw };
    case "forward": case "next": case "fwd": return a ? { kind: "forward", ref: a } : { kind: "unknown", raw };
    case "back": case "prev": return a ? { kind: "back", ref: a } : { kind: "unknown", raw };
    case "move": return a && b ? { kind: "move", ref: a, nodeId: b.toUpperCase() } : { kind: "unknown", raw };
    case "role": case "роль": return { kind: "role", role: a ?? null };
    case "sweep": case "run": return { kind: "sweep" };
    case "report": return { kind: "report" };
    case "save": return { kind: "save" };
    case "quit": case "exit": case "q": return { kind: "quit" };
    default: return { kind: "unknown", raw };
  }
};

/** Разбор пары команд для неинтерактивного прогона: "list;next З-001". */
export const parseScript = (script: string): readonly Command[] =>
  script.split(";").map((s) => parseCommand(s)).filter((c) => c.kind !== "unknown");
