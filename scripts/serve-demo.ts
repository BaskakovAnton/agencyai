import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

/** Раздача собранного демо: используется Playwright и локальными проверками. */
const root = fileURLToPath(new URL("../demo/", import.meta.url));
const port = Number(process.env.PORT ?? 4321);

const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

Bun.serve({
  port,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const relative = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    const file = Bun.file(join(root, normalize(relative)));
    if (!(await file.exists())) return new Response("не найдено: " + relative, { status: 404 });
    const ext = relative.slice(relative.lastIndexOf("."));
    return new Response(file, { headers: { "content-type": TYPES[ext] ?? "application/octet-stream" } });
  },
});

console.log("демо доступно: http://127.0.0.1:" + port + "/  (модули: /#dashboard, /#chat)");
