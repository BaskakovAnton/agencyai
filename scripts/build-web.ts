import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface BuildOptions {
  readonly outDir: string;
  readonly minify?: boolean;
  readonly entry?: string;
}

/**
 * Прод-сборка демо для GitHub Pages: вся логика модели запекается в один app.js.
 * Ядро и данные среды не знают, поэтому собираются для browser без полифилов.
 */
export const buildWeb = async (options: BuildOptions): Promise<readonly string[]> => {
  const outDir = options.outDir;
  const entry = options.entry ?? "src/web/main.ts";
  await mkdir(outDir, { recursive: true });

  let result: Awaited<ReturnType<typeof Bun.build>>;
  try {
    result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "esm",
      minify: options.minify ?? true,
      sourcemap: "none",
    });
  } catch (error) {
    // Bun.build бросает AggregateError на синтаксических и путевых ошибках — переводим в читаемый текст
    const details = error instanceof AggregateError ? error.errors.map((item) => String(item)).join("; ") : String(error);
    throw new Error("сборка не удалась: " + details);
  }
  if (!result.success) {
    throw new Error("сборка не удалась: " + result.logs.map((log) => log.message).join("; "));
  }
  const artifact = result.outputs.find((o) => o.kind === "entry-point") ?? result.outputs[0];
  if (!artifact) throw new Error("сборка не вернула артефактов");
  const bundlePath = join(outDir, "app.js");
  await writeFile(bundlePath, await artifact.text(), "utf8");

  const assets: readonly (readonly [string, string])[] = [
    ["src/web/index.html", "index.html"],
    ["src/web/tokens.css", "tokens.css"],
    ["src/web/shell.css", "shell.css"],
    ["src/web/screens.css", "screens.css"],
    ["src/web/style.css", "style.css"],
  ];
  const copied = [bundlePath];
  for (const [from, to] of assets) {
    const target = join(outDir, to);
    await copyFile(from, target);
    copied.push(target);
  }

  return copied;
};

if (import.meta.main) {
  const outDir = process.argv[2] ?? "demo";
  const files = await buildWeb({ outDir, minify: true });
  console.log("собрано: " + files.join(", "));
}
