import type { FastifyInstance } from "fastify";

import { findIncidentAuditEvents } from "../repositories/audit.repository.js";
import { requireIncident } from "../services/require-incident.js";

import type { IncidentParameters } from "../types/workflow.types.js";
import { incidentParametersSchema } from "./workflow.schemas.js";

interface AuditQuery {
  limit?: string;
  offset?: string;
}

export async function auditRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: IncidentParameters; Querystring: AuditQuery }>(
    "/api/incidents/:id/audit-log",
    {
      schema: {
        params: incidentParametersSchema,
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "string", pattern: "^[0-9]{1,3}$" },
            offset: { type: "string", pattern: "^[0-9]{1,9}$" }
          }
        }
      }
    },
    async request => {
      const incidentId = request.params.id;

      await requireIncident(incidentId);

      const limit = Math.max(1, Math.min(500, Number(request.query.limit ?? 100)));
      const offset = Number(request.query.offset ?? 0);

      const events = await findIncidentAuditEvents(incidentId, limit, offset);

      return { data: { incident_id: incidentId, events, limit, offset } };
    }
  );
}
