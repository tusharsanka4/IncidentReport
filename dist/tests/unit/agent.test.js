"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const analysis_output_js_1 = require("../../services/agent/src/analysis-output.js");
const manual_investigation_node_js_1 = require("../../services/agent/src/nodes/manual-investigation.node.js");
const routing_js_1 = require("../../services/agent/src/routing.js");
function createState(overrides = {}) {
    return {
        incidentId: "INC-TEST",
        incident: {
            incident_id: "INC-TEST",
            service: "order-service",
            environment: "production"
        },
        candidates: [
            {
                change: {
                    id: "CHG-TEST",
                    resource_id: "order-service"
                },
                normalized_score: 1
            }
        ],
        analysis: null,
        status: "STARTED",
        error: null,
        retryCount: 0,
        maxRetries: 2,
        ...overrides
    };
}
const validAnalysis = {
    probable_change_id: "CHG-TEST",
    confidence_score: 0.85,
    reasoning_summary: "A production deployment directly preceded the incident.",
    evidence: [
        {
            type: "DIRECT_RESOURCE_MATCH",
            description: "The change modified the affected service.",
            score: 40
        }
    ],
    recommended_action: {
        type: "ROLLBACK",
        resource: "order-service",
        from_version: "v2",
        to_version: "v1",
        execution: "HUMAN_APPROVAL_REQUIRED",
        requires_approval: true
    },
    analysis_status: "AWAITING_APPROVAL"
};
(0, node_test_1.default)("analysis schema accepts a valid result", () => {
    const result = analysis_output_js_1.AnalysisOutputSchema.safeParse(validAnalysis);
    strict_1.default.equal(result.success, true);
});
(0, node_test_1.default)("analysis schema rejects confidence above one", () => {
    const result = analysis_output_js_1.AnalysisOutputSchema.safeParse({
        ...validAnalysis,
        confidence_score: 1.5
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("missing incident ends the workflow", () => {
    const state = createState({
        incident: null,
        status: "FAILED"
    });
    strict_1.default.equal((0, routing_js_1.routeAfterIncident)(state), "__end__");
});
(0, node_test_1.default)("valid incident continues to candidate loading", () => {
    const state = createState({
        status: "INCIDENT_LOADED"
    });
    strict_1.default.equal((0, routing_js_1.routeAfterIncident)(state), "loadCandidates");
});
(0, node_test_1.default)("no candidates routes to manual investigation", () => {
    const state = createState({
        candidates: [],
        status: "CANDIDATES_LOADED"
    });
    strict_1.default.equal((0, routing_js_1.routeAfterCandidates)(state), "manualInvestigation");
});
(0, node_test_1.default)("available candidates route to analysis", () => {
    const state = createState({
        status: "CANDIDATES_LOADED"
    });
    strict_1.default.equal((0, routing_js_1.routeAfterCandidates)(state), "analyseIncident");
});
(0, node_test_1.default)("retry status routes back to Gemini", () => {
    const state = createState({
        status: "RETRYING",
        retryCount: 1
    });
    strict_1.default.equal((0, routing_js_1.routeAfterAnalysis)(state), "analyseIncident");
});
(0, node_test_1.default)("low confidence routes to manual investigation", () => {
    const state = createState({
        status: "ANALYSIS_COMPLETE",
        analysis: {
            ...validAnalysis,
            confidence_score: 0.4
        }
    });
    strict_1.default.equal((0, routing_js_1.routeAfterAnalysis)(state), "manualInvestigation");
});
(0, node_test_1.default)("strong supported analysis is recorded", () => {
    const state = createState({
        status: "ANALYSIS_COMPLETE",
        analysis: validAnalysis
    });
    strict_1.default.equal((0, routing_js_1.routeAfterAnalysis)(state), "recordAnalysis");
});
(0, node_test_1.default)("manual fallback requires human approval", async () => {
    const state = createState({
        candidates: [],
        error: "No candidates were found"
    });
    const update = await (0, manual_investigation_node_js_1.manualInvestigationNode)(state);
    strict_1.default.equal(update.status, "MANUAL_INVESTIGATION");
    strict_1.default.equal(update.analysis
        ?.recommended_action
        .requires_approval, true);
    strict_1.default.equal(update.analysis
        ?.recommended_action
        .execution, "HUMAN_APPROVAL_REQUIRED");
});
