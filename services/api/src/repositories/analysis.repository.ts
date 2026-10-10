import { database } from "../../../shared/src/database.js";

interface AnalysisRow {
  id: string;
  incident_id: string;
  workflow_id: string | null;
  probable_change_id: string | null;
  confidence_score: string | null;
  reasoning_summary: string;
  evidence: unknown;
  recommended_action: unknown;
  analysis_status: string;
  created_at: Date;
}

export async function findLatestAnalysis(
  incidentId: string
) {
  const result = await database.query<AnalysisRow>(
    `
      SELECT
        id, incident_id, workflow_id, probable_change_id,
        confidence_score, reasoning_summary, evidence,
        recommended_action, analysis_status, created_at
      FROM analysis_results
      WHERE incident_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [incidentId]
  );

  const analysis = result.rows[0];

  if (!analysis) {
    return null;
  }

  return {
    ...analysis,
    confidence_score: analysis.confidence_score === null
      ? null
      : Number(analysis.confidence_score)
  };
}
