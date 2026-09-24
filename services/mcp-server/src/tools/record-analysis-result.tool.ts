import { database } from "../../../shared/src/database.js";

import {
  createToolError,
  createToolResponse
} from "../helpers/tool-response.js";

interface EvidenceItem {
  type: string;
  description: string;
  score?: number;
}

interface RecommendedAction {
  type: string;
  resource: string;
  from_version?: string;
  to_version?: string;
  execution: string;
  requires_approval: boolean;
}

interface RecordAnalysisInput {
  incident_id: string;
  probable_change_id: string | null;
  confidence_score: number;
  reasoning_summary: string;
  evidence: EvidenceItem[];
  recommended_action: RecommendedAction;
  analysis_status: string;
}

interface AnalysisRow {
  id: string;
  incident_id: string;
  probable_change_id: string | null;
  confidence_score: string;
  analysis_status: string;
  created_at: Date;
}

export async function recordAnalysisResultTool(
  input: RecordAnalysisInput
) {
  const client = await database.connect();

  try {
    await client.query("BEGIN");

    const incidentResult = await client.query(
      `
        SELECT id
        FROM incidents
        WHERE id = $1
      `,
      [input.incident_id]
    );

    if (incidentResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return createToolError(
        "INCIDENT_NOT_FOUND",
        `Incident ${input.incident_id} was not found`
      );
    }

    if (input.probable_change_id !== null) {
      const changeResult = await client.query(
        `
          SELECT id
          FROM changes
          WHERE id = $1
        `,
        [input.probable_change_id]
      );

      if (changeResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return createToolError(
          "CHANGE_NOT_FOUND",
          `Change ${input.probable_change_id} was not found`
        );
      }
    }

    const result = await client.query<AnalysisRow>(
      `
        INSERT INTO analysis_results (
          incident_id,
          probable_change_id,
          confidence_score,
          reasoning_summary,
          evidence,
          recommended_action,
          analysis_status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7
        )
        RETURNING
          id,
          incident_id,
          probable_change_id,
          confidence_score,
          analysis_status,
          created_at
      `,
      [
        input.incident_id,
        input.probable_change_id,
        input.confidence_score,
        input.reasoning_summary,
        JSON.stringify(input.evidence),
        JSON.stringify(input.recommended_action),
        input.analysis_status
      ]
    );

    await client.query(
      `
        UPDATE incidents
        SET
          status = 'AWAITING_APPROVAL',
          updated_at = NOW()
        WHERE id = $1
      `,
      [input.incident_id]
    );

    await client.query("COMMIT");

    const analysis = result.rows[0];

    if (!analysis) {
      return createToolError(
        "ANALYSIS_RECORDING_ERROR",
        "The inserted analysis was not returned"
      );
    }

    return createToolResponse({
      analysis_id: analysis.id,
      incident_id: analysis.incident_id,
      probable_change_id:
        analysis.probable_change_id,
      confidence_score: Number(
        analysis.confidence_score
      ),
      analysis_status:
        analysis.analysis_status,
      incident_status: "AWAITING_APPROVAL",
      created_at: analysis.created_at
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Analysis rollback failed:",
        rollbackError
      );
    }

    console.error(
      "record_analysis_result failed:",
      error
    );

    return createToolError(
      "ANALYSIS_RECORDING_ERROR",
      "The analysis result could not be recorded"
    );
  } finally {
    client.release();
  }
}