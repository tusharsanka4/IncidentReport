"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualInvestigationNode = manualInvestigationNode;
async function manualInvestigationNode(state) {
    const incidentService = state.incident &&
        typeof state.incident.service === "string"
        ? state.incident.service
        : state.incidentId;
    if (state.analysis) {
        return {
            analysis: {
                ...state.analysis,
                analysis_status: "MANUAL_INVESTIGATION",
                recommended_action: {
                    type: "MANUAL_INVESTIGATION",
                    resource: state.analysis
                        .recommended_action
                        .resource ||
                        incidentService,
                    execution: "HUMAN_APPROVAL_REQUIRED",
                    requires_approval: true
                }
            },
            status: "MANUAL_INVESTIGATION"
        };
    }
    return {
        analysis: {
            probable_change_id: null,
            confidence_score: 0,
            reasoning_summary: "No sufficiently supported change could be attributed to this incident. Manual investigation is required.",
            evidence: [
                {
                    type: "INSUFFICIENT_EVIDENCE",
                    description: state.error ??
                        "No relevant candidate changes were found.",
                    score: 0
                }
            ],
            recommended_action: {
                type: "MANUAL_INVESTIGATION",
                resource: incidentService,
                execution: "HUMAN_APPROVAL_REQUIRED",
                requires_approval: true
            },
            analysis_status: "MANUAL_INVESTIGATION"
        },
        status: "MANUAL_INVESTIGATION"
    };
}
