import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Шелл Playwright не наследует PATH с bun, поэтому подставляем абсолютный путь. */
const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
const bunCandidates = [
  process.env.BUN_BIN ?? "",
  /bun/i.test(process.execPath) ? process.execPath : "",
  home ? join(home, ".bun", "bin", process.platform === "win32" ? "bun.exe" : "bun") : "",
].filter((candidate) => candidate.length > 0);
const bunBin = bunCandidates.find((candidate) => existsSync(candidate)) ?? "bun";

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
    command: `"${bunBin}" run scripts/serve-demo.ts`,
    url: "http://127.0.0.1:4321/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
