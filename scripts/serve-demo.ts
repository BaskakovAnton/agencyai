import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Локальная раздача собранного демо: используется Playwright и глазами. */
const root = fileURLToPath(new URL("../demo/", import.meta.url));
const port = Number(process.env.PORT ?? 4321);

Bun.serve({
  port,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const relative = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    const file = Bun.file(join(root, relative));
    if (await file.exists()) return new Response(file);
    return new Response("not found: " + relative, { status: 404 });
  },
});

console.log("demo: http://127.0.0.1:" + port + "/");
