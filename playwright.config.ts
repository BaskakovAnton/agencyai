import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/** Рантайм для webServer: локально bun лежит вне PATH, в CI — в PATH. */
const BUN = [process.env.BUN_BIN, "C:\\Users\\Pavel\\.bun\\bin\\bun.exe"].find(
  (candidate): candidate is string => Boolean(candidate) && existsSync(candidate as string),
) ?? "bun";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `"${BUN}" run scripts/serve-demo.ts`,
    url: "http://127.0.0.1:4321/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
