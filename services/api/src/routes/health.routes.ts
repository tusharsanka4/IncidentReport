import type { FastifyInstance } from "fastify";

import { checkDatabaseHealth } from "../../../shared/src/database.js";
import { checkTemporalHealth } from "../../../shared/src/temporal-health.js";

export async function healthRoutes(
  app: FastifyInstance,
  dependencies: {
    checkDatabase?: () => Promise<unknown>;
    checkTemporal?: () => Promise<unknown>;
  } = {}
): Promise<void> {
  const checkDatabase = dependencies.checkDatabase ?? checkDatabaseHealth;
  const checkTemporal = dependencies.checkTemporal ?? checkTemporalHealth;
  app.get("/health", async () => {
    return {
      status: "healthy"
    };
  });

  app.get("/ready", async (_request, reply) => {
    try {
      await checkDatabase();

      return {
        status: "ready",
        database: "connected"
      };
    } catch {
      return reply.code(503).send({
        status: "not_ready",
        database: "disconnected"
      });
    }
  });

  app.get("/ready/workflow", async (_request, reply) => {
    const results = await Promise.allSettled([checkDatabase(), checkTemporal()]);
    const ready = results.every(result => result.status === "fulfilled");
    return reply.code(ready ? 200 : 503).send({
      status: ready ? "ready" : "not_ready",
      database: results[0]!.status === "fulfilled" ? "connected" : "disconnected",
      temporal: results[1]!.status === "fulfilled" ? "connected" : "disconnected"
    });
  });
}
