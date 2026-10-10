import type { FastifyInstance } from "fastify";

import type {
  ApproveIncidentBody,
  IncidentParameters,
  RejectIncidentBody,
  WorkflowGateway
} from "../types/workflow.types.js";

import { requireIncident } from "../services/require-incident.js";

import {
  decisionBodySchema,
  incidentParametersSchema
} from "./workflow.schemas.js";

export async function approvalRoutes(
  app: FastifyInstance,
  options: { gateway: WorkflowGateway }
): Promise<void> {
  app.post<{
    Params: IncidentParameters;
    Body: ApproveIncidentBody;
  }>(
    "/api/incidents/:id/approve",
    {
      schema: {
        params: incidentParametersSchema,
        body: decisionBodySchema("approved_by")
      }
    },
    async (request, reply) => {
      const incidentId = request.params.id;

      await requireIncident(incidentId);

      const submitted = await options.gateway.decide(
        incidentId,
        "APPROVED",
        request.body.approved_by.trim(),
        request.body.comment
      );

      request.log.info({ incidentId, submitted }, "Approval requested");

      return reply.code(submitted ? 202 : 200).send({
        data: {
          incident_id: incidentId,
          decision: "APPROVED",
          status: submitted ? "SIGNAL_SUBMITTED" : "ALREADY_RECORDED"
        }
      });
    }
  );

  app.post<{
    Params: IncidentParameters;
    Body: RejectIncidentBody;
  }>(
    "/api/incidents/:id/reject",
    {
      schema: {
        params: incidentParametersSchema,
        body: decisionBodySchema("rejected_by")
      }
    },
    async (request, reply) => {
      const incidentId = request.params.id;

      await requireIncident(incidentId);

      const submitted = await options.gateway.decide(
        incidentId,
        "REJECTED",
        request.body.rejected_by.trim(),
        request.body.comment
      );

      request.log.info({ incidentId, submitted }, "Rejection requested");

      return reply.code(submitted ? 202 : 200).send({
        data: {
          incident_id: incidentId,
          decision: "REJECTED",
          status: submitted ? "SIGNAL_SUBMITTED" : "ALREADY_RECORDED"
        }
      });
    }
  );
}
