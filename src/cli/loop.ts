import * as readline from "node:readline/promises";
import type { Graph, Session } from "../types.ts";
import { parseCommand } from "./commands.ts";
import { applyCommand, type Effect } from "./reducer.ts";
import { REPORTS_DIR, writeFinalState, writeReport } from "../io/writers.ts";

export interface RunOptions {
  readonly graph: Graph;
  readonly session: Session;
  readonly rand: () => number;
  readonly now: () => string;
  readonly script?: readonly string[];
  readonly autoSweeps?: number;
  readonly outDir?: string;
  readonly print?: (line: string) => void;
}

/** Выполнение побочных эффектов: только отчёт и финальное состояние. */
export const executeEffects = async (effects: readonly Effect[], outDir: string, iso: string): Promise<readonly string[]> => {
  const written: string[] = [];
  for (const effect of effects) {
    if (effect.kind === "report") written.push(await writeReport(outDir, effect.text, iso));
    else written.push(await writeFinalState(outDir, effect.data, iso));
  }
  return written;
};

const applyAndPrint = async (
  options: RunOptions,
  session: Session,
  line: string,
  print: (s: string) => void,
): Promise<{ session: Session; quit: boolean; written: readonly string[] }> => {
  const iso = options.now();
  const result = applyCommand(options.graph, session, parseCommand(line), options.rand, iso);
  result.output.forEach((chunk) => print(chunk));
  const written = await executeEffects(result.effects, options.outDir ?? REPORTS_DIR, iso);
  written.forEach((file) => print("записано: " + file));
  return { session: result.session, quit: result.quit, written };
};

/** Прогон сессии: сценарий из команд (тесты/демо) или интерактивный режим оператора. */
export const runSession = async (options: RunOptions): Promise<Session> => {
  const print = options.print ?? ((line: string) => console.log(line));
  let session = options.session;

  print("Модель процессов: " + options.graph.order.length + " узлов, заявок сгенерировано: " + session.incidents.length);
  print("Память: всё состояние сессии в RAM; на диск пишутся только report и final-state (команда save).");

  if (options.autoSweeps && options.autoSweeps > 0) {
    for (let i = 0; i < options.autoSweeps; i += 1) {
      const res = await applyAndPrint(options, session, "sweep", print);
      session = res.session;
      if (res.quit) return session;
    }
  }

  if (options.script && options.script.length > 0) {
    for (const line of options.script) {
      const res = await applyAndPrint(options, session, line, print);
      session = res.session;
      if (res.quit) return session;
    }
    return session;
  }

  if (process.stdin.isTTY !== true) {
    print('stdin не терминал — интерактивный режим недоступен. Используйте --script "list;forward 5;save"');
    return session;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await runInteractive(options, session, print, () => rl.question("оператор> "));
  } finally {
    rl.close();
  }
};

/**
 * Интерактивный цикл оператора. Источник строк вынесен в параметр `ask`,
 * поэтому цикл (включая выход по EOF) проверяется юнит-тестами без терминала.
 */
export const runInteractive = async (
  options: RunOptions,
  session: Session,
  print: (line: string) => void,
  ask: () => Promise<string>,
): Promise<Session> => {
  let current = session;
  for (;;) {
    let answer: string;
    try {
      answer = await ask();
    } catch {
      print("ввод закончился (EOF) — выход");
      break;
    }
    const res = await applyAndPrint(options, current, answer, print);
    current = res.session;
    if (res.quit) {
      print("выход. Отчёт и финальное состояние не записаны — используйте save, если нужны файлы.");
      break;
    }
  }
  return current;
};
