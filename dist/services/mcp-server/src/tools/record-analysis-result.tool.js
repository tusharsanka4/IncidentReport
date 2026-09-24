"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAnalysisResultTool = recordAnalysisResultTool;
const database_js_1 = require("../../../shared/src/database.js");
const tool_response_js_1 = require("../helpers/tool-response.js");
async function recordAnalysisResultTool(input) {
    const client = await database_js_1.database.connect();
    try {
        await client.query("BEGIN");
        const incidentResult = await client.query(`
        SELECT id
        FROM incidents
        WHERE id = $1
      `, [input.incident_id]);
        if (incidentResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return (0, tool_response_js_1.createToolError)("INCIDENT_NOT_FOUND", `Incident ${input.incident_id} was not found`);
        }
        if (input.probable_change_id !== null) {
            const changeResult = await client.query(`
          SELECT id
          FROM changes
          WHERE id = $1
        `, [input.probable_change_id]);
            if (changeResult.rowCount === 0) {
                await client.query("ROLLBACK");
                return (0, tool_response_js_1.createToolError)("CHANGE_NOT_FOUND", `Change ${input.probable_change_id} was not found`);
            }
        }
        const result = await client.query(`
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
      `, [
            input.incident_id,
            input.probable_change_id,
            input.confidence_score,
            input.reasoning_summary,
            JSON.stringify(input.evidence),
            JSON.stringify(input.recommended_action),
            input.analysis_status
        ]);
        await client.query(`
        UPDATE incidents
        SET
          status = 'AWAITING_APPROVAL',
          updated_at = NOW()
        WHERE id = $1
      `, [input.incident_id]);
        await client.query("COMMIT");
        const analysis = result.rows[0];
        if (!analysis) {
            return (0, tool_response_js_1.createToolError)("ANALYSIS_RECORDING_ERROR", "The inserted analysis was not returned");
        }
        return (0, tool_response_js_1.createToolResponse)({
            analysis_id: analysis.id,
            incident_id: analysis.incident_id,
            probable_change_id: analysis.probable_change_id,
            confidence_score: Number(analysis.confidence_score),
            analysis_status: analysis.analysis_status,
            incident_status: "AWAITING_APPROVAL",
            created_at: analysis.created_at
        });
    }
    catch (error) {
        try {
            await client.query("ROLLBACK");
        }
        catch (rollbackError) {
            console.error("Analysis rollback failed:", rollbackError);
        }
        console.error("record_analysis_result failed:", error);
        return (0, tool_response_js_1.createToolError)("ANALYSIS_RECORDING_ERROR", "The analysis result could not be recorded");
    }
    finally {
        client.release();
    }
}
