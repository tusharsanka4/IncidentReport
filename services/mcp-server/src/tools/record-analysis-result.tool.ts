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
  workflow_id?: string;
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

    const incidentStatus =
      input.analysis_status === "MANUAL_INVESTIGATION"
        ? "ESCALATED"
        : "AWAITING_APPROVAL";

    const incidentResult = await client.query(
      `
        SELECT id, status
        FROM incidents
        WHERE id = $1
        FOR UPDATE
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

    if (input.workflow_id) {
      const existingResult = await client.query<AnalysisRow>(
        "SELECT * FROM analysis_results WHERE workflow_id = $1",
        [input.workflow_id]
      );

      const existing = existingResult.rows[0];

      if (existing) {
        await client.query("ROLLBACK");

        if (existing.incident_id !== input.incident_id) {
          return createToolError(
            "WORKFLOW_ANALYSIS_CONFLICT",
            "This workflow already has an analysis for another incident"
          );
        }

        return createToolResponse({
          analysis_id: existing.id,
          incident_id: existing.incident_id,
          probable_change_id: existing.probable_change_id,
          confidence_score: Number(existing.confidence_score),
          analysis_status: existing.analysis_status,
          incident_status: incidentResult.rows[0].status,
          created_at: existing.created_at
        });
      }
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
          analysis_status,
          workflow_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7,
          $8
        )
        ON CONFLICT (workflow_id)
        DO UPDATE SET workflow_id = EXCLUDED.workflow_id
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
        input.analysis_status,
        input.workflow_id ?? null
      ]
    );

    if (result.rows[0]?.incident_id !== input.incident_id) {
      await client.query("ROLLBACK");

      return createToolError(
        "WORKFLOW_ANALYSIS_CONFLICT",
        "This workflow already has an analysis for another incident"
      );
    }

    await client.query(
      `
        UPDATE incidents
        SET
          status = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [input.incident_id, incidentStatus]
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
      incident_status: incidentStatus,
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
