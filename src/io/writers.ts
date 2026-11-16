import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Единственное место, которое пишет на диск (требование спеки: только отчёты и финальное состояние).
 * Ядро о диске не знает — поэтому его можно потом собрать в бандл для страницы.
 */
export const REPORTS_DIR = "reports";

const ensureDir = async (dir: string): Promise<string> => {
  await mkdir(dir, { recursive: true });
  return dir;
};

/** Метка времени, пригодная для имени файла. */
export const stamp = (iso: string): string => iso.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);

export const writeReport = async (dir: string, text: string, iso: string): Promise<string> => {
  await ensureDir(dir);
  const file = join(dir, "report-" + stamp(iso) + ".md");
  await writeFile(file, text + "\n", "utf8");
  return file;
};

export const writeFinalState = async (dir: string, data: unknown, iso: string): Promise<string> => {
  await ensureDir(dir);
  const file = join(dir, "final-state-" + stamp(iso) + ".json");
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  return file;
};
