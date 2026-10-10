import type { FastifyInstance } from "fastify";

import type {
  AnalyseIncidentBody,
  IncidentParameters,
  WorkflowGateway
} from "../types/workflow.types.js";

import { requireIncident } from "../services/require-incident.js";
import { incidentParametersSchema } from "./workflow.schemas.js";

export async function workflowRoutes(
  app: FastifyInstance,
  options: { gateway: WorkflowGateway }
): Promise<void> {
  app.post<{
    Params: IncidentParameters;
    Body: AnalyseIncidentBody | undefined;
  }>(
    "/api/incidents/:id/analyse",
    {
      schema: {
        params: incidentParametersSchema,
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            simulation: {
              type: "string",
              enum: ["SUCCESS", "REMEDIATION_FAILURE", "UNHEALTHY"]
            }
          }
        }
      },
      preValidation(request, _reply, done) {
        // The documented analysis endpoint also accepts an empty request.
        if (request.body === undefined) {
          request.body = {};
        }
        done();
      }
    },
    async (request, reply) => {
      const incidentId = request.params.id;

      await requireIncident(incidentId);

      const result = await options.gateway.start(
        incidentId,
        request.body?.simulation ?? "SUCCESS"
      );

      return reply.code(result.started ? 202 : 200).send({
        data: {
          incident_id: incidentId,
          workflow_id: result.workflowId,
          status: result.started ? "WORKFLOW_STARTED" : "WORKFLOW_ALREADY_EXISTS"
        }
      });
    }
  );

  app.get<{ Params: IncidentParameters }>(
    "/api/incidents/:id/workflow",
    { schema: { params: incidentParametersSchema } },
    async request => {
      const incidentId = request.params.id;

      await requireIncident(incidentId);

      const view = await options.gateway.inspect(incidentId);
      const snapshot = view.snapshot;

      return {
        data: {
          incident_id: incidentId,
          workflow_id: view.workflowId,
          execution_status: view.executionStatus,
          status: snapshot?.status ?? view.executionStatus,
          analysis: snapshot?.analysis,
          approval_request: snapshot?.approvalRequest,
          approval: snapshot?.approval,
          remediation: snapshot?.remediation,
          health: snapshot?.health,
          timeline: snapshot?.timeline,
          error: snapshot?.error
        }
      };
    }
  );
}
