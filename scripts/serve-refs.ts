import { stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

/** Локальная раздача эталонов редизайна: / — макеты, /shots/ — baseline-скриншоты. */
const refs = resolve(process.argv[2] ?? "docs/redesign-reference");
const shots = resolve(process.argv[3] ?? "docs/screenshots/redesign-baseline");
const port = Number(process.argv[4] ?? 4331);

const types: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

const listing = (urlPath: string, files: string[]): string =>
  '<!doctype html><meta charset="utf-8"><title>' + urlPath + '</title>' +
  '<body style="font:14px/1.5 system-ui;background:#f4f6fa;color:#172033;padding:24px">' +
  "<h1>" + urlPath + "</h1><ul>" +
  files.map((name) => '<li><a href="' + urlPath.replace(/\/$/, "") + "/" + name + '">' + name + "</a></li>").join("") +
  "</ul>";

const send = async (req: Request): Promise<Response> => {
  const path = decodeURIComponent(new URL(req.url).pathname);
  const [root, rest] = path.startsWith("/shots/") ? [shots, path.slice(7)] : [refs, path];
  const rel = rest === "" || rest === "/" ? "/index.html" : rest.startsWith("/") ? rest : "/" + rest;
  const target = resolve(root, "." + rel);
  if (!target.startsWith(root)) return new Response("forbidden", { status: 403 });
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(target)).sort();
      return new Response(listing(path, files), { headers: { "content-type": types[".html"] as string } });
    }
    return new Response(Bun.file(target), { headers: { "content-type": types[extname(target)] ?? "application/octet-stream" } });
  } catch {
    return new Response("not found: " + path, { status: 404 });
  }
};

Bun.serve({ port, fetch: send });
console.log("mockups: http://127.0.0.1:" + port + "/  |  screenshots: http://127.0.0.1:" + port + "/shots/");
