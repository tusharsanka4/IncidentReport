"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowStatusQuery = exports.approvalDecisionSignal = void 0;
exports.incidentRemediationWorkflow = incidentRemediationWorkflow;
const workflow_1 = require("@temporalio/workflow");
const analysisActivities = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: "5 minutes",
    retry: {
        maximumAttempts: 3,
        initialInterval: "5 seconds",
        backoffCoefficient: 2
    }
});
const remediationActivities = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: "2 minutes",
    retry: {
        maximumAttempts: 1
    }
});
exports.approvalDecisionSignal = (0, workflow_1.defineSignal)("approvalDecision");
exports.workflowStatusQuery = (0, workflow_1.defineQuery)("workflowStatus");
async function incidentRemediationWorkflow(input) {
    let status = "ANALYSING";
    let approval;
    (0, workflow_1.setHandler)(exports.workflowStatusQuery, () => status);
    (0, workflow_1.setHandler)(exports.approvalDecisionSignal, decision => {
        /*
         * Accept only the first decision.
         * Later duplicate signals are ignored.
         */
        if (!approval) {
            approval = decision;
        }
    });
    const analysis = await analysisActivities
        .analyseIncidentActivity(input.incidentId);
    if (analysis.analysisStatus ===
        "MANUAL_INVESTIGATION") {
        status = "MANUAL_INVESTIGATION";
        return {
            incidentId: input.incidentId,
            status,
            analysis
        };
    }
    status = "AWAITING_APPROVAL";
    /*
     * The workflow pauses here without consuming
     * CPU while waiting for an approval signal.
     */
    await (0, workflow_1.condition)(() => approval !== undefined);
    const finalApproval = approval;
    if (!finalApproval) {
        throw new Error("Approval condition completed without a decision");
    }
    if (finalApproval.decision === "REJECTED") {
        status = "REJECTED";
        return {
            incidentId: input.incidentId,
            status,
            analysis,
            approval: finalApproval
        };
    }
    status = "APPROVED";
    const remediation = await remediationActivities
        .executeRemediationActivity(analysis.recommendedAction, finalApproval);
    status = "REMEDIATION_COMPLETED";
    return {
        incidentId: input.incidentId,
        status,
        analysis,
        approval: finalApproval,
        remediation
    };
}
