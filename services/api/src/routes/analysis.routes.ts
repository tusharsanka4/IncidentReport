import type { FastifyInstance } from "fastify";

import { ApiError } from "../errors/api-error.js";
import { findLatestAnalysis } from "../repositories/analysis.repository.js";
import { requireIncident } from "../services/require-incident.js";

import type { IncidentParameters } from "../types/workflow.types.js";
import { incidentParametersSchema } from "./workflow.schemas.js";

export async function analysisRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: IncidentParameters }>(
    "/api/incidents/:id/analysis",
    { schema: { params: incidentParametersSchema } },
    async request => {
      await requireIncident(request.params.id);

      const analysis = await findLatestAnalysis(request.params.id);

      if (!analysis) {
        throw new ApiError(
          404,
          "ANALYSIS_NOT_FOUND",
          "No analysis result is available for this incident yet"
        );
      }

      return { data: analysis };
    }
  );
}
