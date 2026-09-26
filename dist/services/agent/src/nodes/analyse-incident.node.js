"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseIncidentNode = analyseIncidentNode;
const model_js_1 = require("../model.js");
const tool_data_js_1 = require("../helpers/tool-data.js");
function getCandidateChangeIds(candidates) {
    const ids = new Set();
    for (const candidate of candidates) {
        const change = candidate.change;
        if ((0, tool_data_js_1.isRecord)(change) &&
            typeof change.id === "string") {
            ids.add(change.id);
        }
    }
    return ids;
}
async function analyseIncidentNode(state) {
    if (!state.incident) {
        return {
            status: "FAILED",
            error: "Incident data is missing before analysis"
        };
    }
    if (state.candidates.length === 0) {
        return {
            status: "MANUAL_INVESTIGATION",
            error: "No candidate changes were found"
        };
    }
    try {
        const analysis = await model_js_1.analysisModel.invoke([
            {
                role: "system",
                content: `
You are an incident-attribution assistant.

Analyse only the incident and candidate-change evidence supplied to you.

Rules:
1. Do not invent incidents, changes, scores, versions, resources, or evidence.
2. probable_change_id must be one of the supplied candidate change IDs, or null.
3. Treat deterministic ranking scores as evidence, not absolute proof.
4. Keep reasoning_summary concise and evidence-based.
5. Do not expose private chain-of-thought reasoning.
6. Never claim that a remediation was executed.
7. Every remediation requires human approval.
8. Use MANUAL_INVESTIGATION when evidence is weak or inconclusive.
9. Prefer rollback only when the strongest candidate is a deployment with a known previous version.
10. Use CONFIGURATION_REVERT for configuration changes.
11. Use RESTART only when the evidence specifically supports it.
12. confidence_score must reflect the strength and consistency of the supplied evidence.
          `.trim()
            },
            {
                role: "user",
                content: JSON.stringify({
                    incident: state.incident,
                    ranked_candidates: state.candidates
                }, null, 2)
            }
        ]);
        const candidateIds = getCandidateChangeIds(state.candidates);
        if (analysis.probable_change_id !== null &&
            !candidateIds.has(analysis.probable_change_id)) {
            throw new Error("The model selected a change that was not provided");
        }
        return {
            analysis,
            status: "ANALYSIS_COMPLETE",
            error: null
        };
    }
    catch (error) {
        const retryCount = state.retryCount + 1;
        return {
            retryCount,
            status: retryCount <= state.maxRetries
                ? "RETRYING"
                : "FAILED",
            error: `Analysis failed: ${(0, tool_data_js_1.getErrorMessage)(error)}`
        };
    }
}
