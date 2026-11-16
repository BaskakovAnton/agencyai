import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Priority, SituationSection } from "../src/types.ts";
import { ROLE_IDS } from "../src/data/roles.ts";

/**
 * Миграция 37 ситуаций из публичного прототипа deput.
 * id/раздел/приоритет/SLA — из index.html, полные шаги — из player.html, связи узлов — из matrix.html.
 * Минификация и порядок фиксированы: повторный запуск даёт те же файлы.
 */
const SOURCE = process.argv[2] ?? "C:\\Users\\Pavel\\AppData\\Local\\Temp\\deput-study";
const SECTIONS: readonly SituationSection[] = ["before", "during", "contractors", "feedback"];
const SECTION_FILES: Readonly<Record<SituationSection, string>> = {
  before: "before.ts",
  during: "during.ts",
  contractors: "contractors.ts",
  feedback: "feedback.ts",
};
const SECTION_TITLES: Readonly<Record<SituationSection, string>> = {
  before: "8.1 До принятия",
  during: "8.2 В работе",
  contractors: "8.3 Подрядчики и особые",
  feedback: "8.4 Отчётность",
};

/** Вытащить литерал `const NAME = [...]` из html. */
const literalOf = (source: string, name: string): string => {
  const match = new RegExp("\\b(?:const|let|var)\\s+" + name + "\\s*=\\s*").exec(source);
  if (!match) throw new Error("не найден " + name);
  const start = match.index + match[0].length;
  const open = source[start];
  const close = open === "[" ? "]" : open === "{" ? "}" : "";
  if (!close) throw new Error("неожиданный литерал " + name);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i] as string;
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("незакрытый литерал " + name);
};

const parse = <T>(source: string, name: string): T => JSON.parse(JSON.stringify(new Function("return (" + literalOf(source, name) + ")")())) as T;

interface RawScenario { id: string; section?: SituationSection; title: string; summary: string; sla: string; priority: Priority; steps: unknown[] }
interface RawUzel { id: string; situations: string[] }

const escape = (value: string): string => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
const stepTuple = (raw: unknown): readonly [string, string, string] => {
  if (Array.isArray(raw)) {
    const lane = String(raw[0] ?? "system");
    if (Array.isArray(raw[1])) return [lane, String(raw[1][0] ?? "шаг"), String(raw[1][1] ?? "")];
    return [lane, String(raw[1] ?? "шаг"), String(raw[2] ?? "")];
  }
  const obj = raw as { lane?: string; role?: string; title?: string; text?: string; detail?: string };
  return [obj.lane ?? obj.role ?? "system", obj.title ?? "шаг", obj.text ?? obj.detail ?? ""];
};

const main = async (): Promise<void> => {
  const index = await readFile(join(SOURCE, "index.html"), "utf8");
  const player = await readFile(join(SOURCE, "player.html"), "utf8");
  const matrix = await readFile(join(SOURCE, "matrix.html"), "utf8");

  const structure = parse<RawScenario[]>(index, "SCENARIOS");
  const rich = parse<RawScenario[]>(player, "SCENARIOS");
  const uzly = parse<RawUzel[]>(matrix, "UZLY");

  const richById = new Map(rich.map((item) => [item.id, item]));
  const situations = structure.map((item) => {
    const source = richById.get(item.id);
    const steps = (source?.steps ?? item.steps ?? []).map(stepTuple);
    return {
      id: item.id,
      section: item.section ?? "during",
      title: item.title,
      summary: item.summary,
      priority: item.priority,
      sla: (source?.sla && source.sla !== "-" ? source.sla : item.sla) || "по регламенту",
      steps: steps.length > 0 ? steps : [["deputy", "Обработка", "шаги не описаны в источнике"] as const],
    };
  });

  const outDir = join("src", "data", "situations");
  await mkdir(outDir, { recursive: true });
  for (const section of SECTIONS) {
    const items = situations.filter((s) => s.section === section);
    const body = items.map((s) => {
      const steps = s.steps.map((step) => '    ["' + escape(step[0]) + '", "' + escape(step[1]) + '", "' + escape(step[2]) + '"]').join(",\n");
      return '  s("' + s.id + '", "' + section + '", "' + escape(s.title) + '", "' + escape(s.summary) + '", "' + s.priority + '", "' + escape(s.sla) + '", [\n' + steps + ",\n  ])";
    }).join(",\n");
    const content = 'import { situation as s } from "./helpers.ts";\n\n/** ' + SECTION_TITLES[section] + " — " + items.length + " ситуаций. Источник: deput (index.html + player.html). */\nexport const " +
      section.toUpperCase() + '_SITUATIONS = [\n' + body + ",\n] as const;\n";
    await writeFile(join(outDir, SECTION_FILES[section]), content, "utf8");
  }

  const aggregate = 'import type { Situation, SituationSection } from "../types.ts";\n' +
    'import { BEFORE_SITUATIONS } from "./situations/before.ts";\n' +
    'import { DURING_SITUATIONS } from "./situations/during.ts";\n' +
    'import { CONTRACTORS_SITUATIONS } from "./situations/contractors.ts";\n' +
    'import { FEEDBACK_SITUATIONS } from "./situations/feedback.ts";\n' +
    'import { NODE_SITUATIONS } from "./situation-nodes.ts";\n\n' +
    "/** Все 37 ситуаций регламента в порядке С1…С37. */\nexport const SITUATIONS: readonly Situation[] = [\n" +
    "  ...BEFORE_SITUATIONS,\n  ...DURING_SITUATIONS,\n  ...CONTRACTORS_SITUATIONS,\n  ...FEEDBACK_SITUATIONS,\n];\n\n" +
    "export const SITUATION_SECTIONS: Readonly<Record<SituationSection, string>> = {\n" +
    SECTIONS.map((s) => '  ' + s + ': "' + SECTION_TITLES[s] + '"').join(",\n") + ",\n};\n\n" +
    "/** Поиск ситуации по id. */\nexport const situationById = (id: string): Situation | undefined => SITUATIONS.find((s) => s.id === id);\n\n" +
    "/** Ситуации, встречающиеся на узле процесса. */\nexport const situationsForNode = (nodeId: string): readonly Situation[] =>\n" +
    "  (NODE_SITUATIONS[nodeId] ?? []).map((id) => situationById(id)).filter((s): s is Situation => s !== undefined);\n";
  await writeFile(join("src", "data", "situations.ts"), aggregate, "utf8");

  const nodes = "import type { Situation } from \"../types.ts\";\n\n" +
    "/** Связь «узел процесса → ситуации» из matrix.html прототипа deput. */\nexport const NODE_SITUATIONS: Readonly<Record<string, readonly string[]>> = {\n" +
    uzly.map((u) => '  ' + u.id + ': [' + u.situations.map((id) => '"' + id + '"').join(", ") + "]").join(",\n") + ",\n};\n";
  await writeFile(join("src", "data", "situation-nodes.ts"), nodes, "utf8");
  void ROLE_IDS;
  console.log("ситуаций: " + situations.length + " · узлов: " + uzly.length);
};

await main();
