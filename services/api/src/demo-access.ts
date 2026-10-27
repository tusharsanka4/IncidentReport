import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** A shared demo password protects both the console and every API endpoint. */
export function protectDemo(
  app: FastifyInstance,
  environment: NodeJS.ProcessEnv = process.env
): void {
  const username = environment.DEMO_USERNAME;
  const password = environment.DEMO_PASSWORD;
  const required = environment.VERCEL === "1" || Boolean(username || password);
  if (!required) return;

  const configured = Boolean(username && password && password.length >= 20);
  const expected = digest(`${username}:${password}`);

  app.addHook("onRequest", async (request, reply) => {
    reply.header("cache-control", "no-store");
    if (!configured) {
      return reply.code(503).send({
        error: { code: "DEMO_ACCESS_NOT_CONFIGURED", message: "Private demo access is not configured" }
      });
    }

    const authorization = request.headers.authorization ?? "";
    const basic = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
    const credentials = basic ? Buffer.from(basic[1]!, "base64").toString("utf8") : "";
    if (!basic || !timingSafeEqual(digest(credentials), expected)) {
      return reply
        .header("www-authenticate", 'Basic realm="IncidentReport", charset="UTF-8"')
        .code(401)
        .send({ error: { code: "UNAUTHORIZED", message: "Demo credentials are required" } });
    }
  });
}
