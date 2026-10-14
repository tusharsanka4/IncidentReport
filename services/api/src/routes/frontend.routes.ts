import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";

// Explicit asset routes keep the demo independent of workflow and API logic.
export async function frontendRoutes(app: FastifyInstance): Promise<void> {
  const files = [
    ["/", "index.html", "text/html; charset=utf-8"],
    ["/demo/styles.css", "styles.css", "text/css; charset=utf-8"],
    ["/demo/app.mjs", "app.mjs", "text/javascript; charset=utf-8"],
    ["/demo/view.mjs", "view.mjs", "text/javascript; charset=utf-8"],
    ["/demo/state.mjs", "state.mjs", "text/javascript; charset=utf-8"],
    ["/demo/api.mjs", "api.mjs", "text/javascript; charset=utf-8"],
    ["/demo/form.mjs", "form.mjs", "text/javascript; charset=utf-8"]
  ];

  for (const [url, filename, contentType] of files) {
    app.get(url, async (_request, reply) => {
      const content = await readFile(resolve("services/web/public", filename));
      return reply
        .header("cache-control", "no-store")
        .header("x-content-type-options", "nosniff")
        .header("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        .type(contentType)
        .send(content);
    });
  }
}
