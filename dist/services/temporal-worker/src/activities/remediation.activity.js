"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRemediationActivity = executeRemediationActivity;
async function executeRemediationActivity(action, approval) {
    if (approval.decision !== "APPROVED") {
        throw new Error("Remediation cannot run without approval");
    }
    if (action.requires_approval !== true ||
        action.execution !==
            "HUMAN_APPROVAL_REQUIRED") {
        throw new Error("The remediation action does not contain the required safety controls");
    }
    if (action.type ===
        "MANUAL_INVESTIGATION") {
        throw new Error("Manual investigation is not an executable remediation");
    }
    let message;
    switch (action.type) {
        case "ROLLBACK":
            message =
                `Simulated rollback of ${action.resource}` +
                    ` from ${action.from_version ?? "unknown"}` +
                    ` to ${action.to_version ?? "unknown"}.`;
            break;
        case "CONFIGURATION_REVERT":
            message =
                `Simulated configuration revert for ${action.resource}.`;
            break;
        case "RESTART":
            message =
                `Simulated restart of ${action.resource}.`;
            break;
        default:
            throw new Error(`Unsupported remediation type: ${action.type}`);
    }
    console.log(`[SIMULATION] ${message}`, {
        approvedBy: approval.decidedBy,
        comment: approval.comment
    });
    return {
        success: true,
        simulated: true,
        action: action.type,
        resource: action.resource,
        message,
        completedAt: new Date().toISOString()
    };
}
