import Fastify from "fastify";

import { healthRoutes } from "./routes/health.routes.js";
import { incidentRoutes } from "./routes/incidents.routes.js";

export function buildApplication() {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id"
  });

  app.register(healthRoutes);
  app.register(incidentRoutes);

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: {
        code: "ROUTE_NOT_FOUND",
        message:
          `${request.method} ${request.url} was not found`,
        request_id: request.id
      }
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        error,
        requestId: request.id
      },
      "Request failed"
    );

    const validation =
  typeof error === "object" &&
  error !== null &&
  "validation" in error
    ? error.validation
    : undefined;

if (validation) {
  return reply.code(400).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "The request contains invalid data",
      request_id: request.id,
      details: validation
    }
  });
}

    return reply.code(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        request_id: request.id
      }
    });
  });

  return app;
}