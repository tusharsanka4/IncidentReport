import Fastify from "fastify";

import { healthRoutes } from "./routes/health.routes.js";
import { incidentRoutes } from "./routes/incidents.routes.js";
import { candidateRoutes } from "./routes/candidates.routes.js";

import { approvalRoutes } from "./routes/approval.routes.js";
import { workflowRoutes } from "./routes/workflow.routes.js";
import { analysisRoutes } from "./routes/analysis.routes.js";
import { auditRoutes } from "./routes/audit.routes.js";
import { TemporalGateway } from "./services/temporal.gateway.js";
import { ApiError } from "./errors/api-error.js";
import type { WorkflowGateway } from "./types/workflow.types.js";

export function buildApplication(
  options: { workflowGateway?: WorkflowGateway } = {}
) {
  const gateway = options.workflowGateway ?? new TemporalGateway();

  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    ajv: {
      customOptions: { coerceTypes: false, removeAdditional: false }
    }
  });

  app.register(healthRoutes);
  app.register(incidentRoutes);
  app.register(candidateRoutes);
  app.register(approvalRoutes, { gateway });
  app.register(workflowRoutes, { gateway });
  app.register(analysisRoutes);
  app.register(auditRoutes);

  app.addHook("onClose", async () => {
    await gateway.close();
  });

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
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          request_id: request.id
        }
      });
    }

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

    if (
      typeof error === "object" && error !== null &&
      "statusCode" in error && typeof error.statusCode === "number" &&
      error.statusCode >= 400 && error.statusCode < 500
    ) {
      return reply.code(error.statusCode).send({
        error: {
          code: "INVALID_REQUEST",
          message: "The request could not be processed",
          request_id: request.id
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
