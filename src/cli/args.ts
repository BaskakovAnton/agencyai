/** Разбор аргументов командной строки терминальной модели (чистая функция). */
export interface CliArgs {
  readonly seed: number;
  readonly auto: number;
  readonly script: readonly string[];
  readonly outDir: string;
}

const intOr = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
};

export const parseArgs = (argv: readonly string[]): CliArgs => {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    seed: intOr(get("--seed"), 42),
    auto: Math.max(0, intOr(get("--auto"), 0)),
    script: (get("--script") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
    outDir: get("--out") ?? "reports",
  };
};
