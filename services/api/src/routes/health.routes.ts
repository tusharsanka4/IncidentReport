import type { FastifyInstance } from "fastify";

import { database } from "../../../shared/src/database.js";

export async function healthRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "healthy"
    };
  });

  app.get("/ready", async (_request, reply) => {
    try {
      await database.query("SELECT 1");

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
}