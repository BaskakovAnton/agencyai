import { generateIncidents } from "../core/generator.ts";
import { buildProcessGraph } from "../data/edges.ts";
import { mulberry32 } from "../random.ts";
import { REPORTS_DIR } from "../io/writers.ts";
import { runSession } from "./loop.ts";

interface Args {
  seed: number;
  auto: number;
  script: readonly string[];
  outDir: string;
}

const parseArgs = (argv: readonly string[]): Args => {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    seed: Number.parseInt(get("--seed") ?? "42", 10),
    auto: Number.parseInt(get("--auto") ?? "0", 10),
    script: (get("--script") ?? "").split(";").map((s) => s.trim()).filter(Boolean),
    outDir: get("--out") ?? REPORTS_DIR,
  };
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const graph = buildProcessGraph();
  const rand = mulberry32(args.seed);
  const incidents = generateIncidents(graph, rand);
  const session = { step: 0, role: "deputy" as const, incidents, log: [] as string[] };

  console.log("seed=" + args.seed + " · узлов=" + graph.order.length + " · заявок=" + incidents.length);
  await runSession({
    graph,
    session,
    rand,
    now: () => new Date().toISOString(),
    autoSweeps: args.auto,
    script: args.script,
    outDir: args.outDir,
  });
};

await main();
