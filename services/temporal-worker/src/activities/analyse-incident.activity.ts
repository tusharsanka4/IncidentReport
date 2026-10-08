import {
  findWorkflowAnalysis
} from "../repositories/analysis.repository.js";

import type {
  AnalysisActivityResult
} from "../shared.types.js";

export async function analyseIncidentActivity(
  incidentId: string,
  workflowId: string
): Promise<AnalysisActivityResult> {
  const storedAnalysis = await findWorkflowAnalysis(
    incidentId,
    workflowId
  );

  if (storedAnalysis) {
    return storedAnalysis;
  }

  const {
    incidentAnalysisGraph
  } = await import("../../../agent/src/graph.js");

  console.log(
    `Temporal activity analysing ${incidentId}`
  );

  const result =
    await incidentAnalysisGraph.invoke({
      incidentId,

      workflowId,

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

  const recordedAnalysis = await findWorkflowAnalysis(
    incidentId,
    workflowId
  );

  if (!recordedAnalysis) {
    throw new Error(
      "The analysis was not persisted for this workflow"
    );
  }

  return recordedAnalysis;
}
