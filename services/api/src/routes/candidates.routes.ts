import type { FastifyInstance } from "fastify";

import { rankCandidateChanges } from "../../../shared/src/candidate-ranking.js";

import { findIncidentById } from "../repositories/incidents.repository.js";
import { findRecentChanges } from "../repositories/changes.repository.js";
import { findAllRelationships } from "../repositories/relationships.repository.js";

interface IncidentParameters {
  id: string;
}

export async function candidateRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: IncidentParameters }>(
    "/api/incidents/:id/candidates",
    async (request, reply) => {
      const incident = await findIncidentById(
        request.params.id
      );

      if (!incident) {
        return reply.code(404).send({
          error: {
            code: "INCIDENT_NOT_FOUND",
            message:
              `Incident ${request.params.id} was not found`,
            request_id: request.id
          }
        });
      }

      const [changes, relationships] = await Promise.all([
        findRecentChanges(incident.detected_at),
        findAllRelationships()
      ]);

      const candidates = rankCandidateChanges(
        incident,
        changes,
        relationships
      );

      request.log.info(
        {
          incidentId: incident.id,
          candidateCount: candidates.length
        },
        "Candidate changes ranked"
      );

      return {
        data: {
          incident_id: incident.id,
          affected_service: incident.service,
          environment: incident.environment,
          detected_at: incident.detected_at,
          candidate_count: candidates.length,
          candidates
        }
      };
    }
  );
}