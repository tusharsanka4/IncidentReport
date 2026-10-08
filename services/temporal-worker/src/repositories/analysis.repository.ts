import {
  database
} from "../../../shared/src/database.js";

import {
  AnalysisOutputSchema
} from "../../../agent/src/analysis-output.js";

import type {
  AnalysisActivityResult
} from "../shared.types.js";

interface AnalysisRow {
  id: string;
  incident_id: string;
  probable_change_id: string | null;
  confidence_score: string;
  reasoning_summary: string;
  evidence: unknown;
  recommended_action: unknown;
  analysis_status: string;
}

export async function findWorkflowAnalysis(
  incidentId: string,
  workflowId: string
): Promise<AnalysisActivityResult | null> {
  const result = await database.query<AnalysisRow>(
    `
      SELECT *
      FROM analysis_results
      WHERE incident_id = $1 AND workflow_id = $2
    `,
    [incidentId, workflowId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const analysis = AnalysisOutputSchema.parse({
    ...row,
    confidence_score: Number(row.confidence_score)
  });

  return {
    incidentId,
    analysisId: String(row.id),
    probableChangeId: analysis.probable_change_id,
    confidenceScore: analysis.confidence_score,
    reasoningSummary: analysis.reasoning_summary,
    recommendedAction: analysis.recommended_action,
    analysisStatus: analysis.analysis_status
  };
}
