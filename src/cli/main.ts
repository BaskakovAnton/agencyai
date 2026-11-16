import { generateIncidents } from "../core/generator.ts";
import { buildProcessGraph } from "../data/edges.ts";
import { mulberry32 } from "../random.ts";
import { parseArgs } from "./args.ts";
import { runSession } from "./loop.ts";

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const graph = buildProcessGraph();
  const rand = mulberry32(args.seed);
  const incidents = generateIncidents(graph, rand);
  const session = { step: 0, role: "deputy" as const, clock: 0, incidents, log: [] as string[] };

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
