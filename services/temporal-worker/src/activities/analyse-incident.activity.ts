import {
  incidentAnalysisGraph
} from "../../../agent/src/graph.js";

import type {
  AnalysisActivityResult
} from "../shared.types.js";

export async function analyseIncidentActivity(
  incidentId: string
): Promise<AnalysisActivityResult> {
  console.log(
    `Temporal activity analysing ${incidentId}`
  );

  const result =
    await incidentAnalysisGraph.invoke({
      incidentId,

      incident: null,

      candidates: [],

      analysis: null,

      status: "STARTED",

      error: null,

      retryCount: 0,

      maxRetries: 2
    });

  if (
    result.status === "FAILED" ||
    !result.analysis
  ) {
    throw new Error(
      result.error ??
      `Incident analysis failed for ${incidentId}`
    );
  }

  return {
    incidentId,

    probableChangeId:
      result.analysis
        .probable_change_id,

    confidenceScore:
      result.analysis
        .confidence_score,

    reasoningSummary:
      result.analysis
        .reasoning_summary,

    recommendedAction:
      result.analysis
        .recommended_action,

    analysisStatus:
      result.analysis
        .analysis_status
  };
}