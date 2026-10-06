"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiB = void 0;
exports.toMB = toMB;
exports.byteArrayToBuffer = byteArrayToBuffer;
exports.convertToParentWorkflowType = convertToParentWorkflowType;
exports.convertToRootWorkflowType = convertToRootWorkflowType;
exports.MiB = 1024 ** 2;
function toMB(bytes, fractionDigits = 2) {
    return (bytes / 1024 / 1024).toFixed(fractionDigits);
}
function byteArrayToBuffer(array) {
    return Buffer.from(array, array.byteOffset, array.byteLength + array.byteOffset);
}
function convertToParentWorkflowType(parent) {
    if (!parent || !parent.workflowId || !parent.runId || !parent.namespace) {
        return undefined;
    }
    return {
        workflowId: parent.workflowId,
        runId: parent.runId,
        namespace: parent.namespace,
    };
}
function convertToRootWorkflowType(root) {
    if (!root || !root.workflowId || !root.runId) {
        return undefined;
    }
    return {
        workflowId: root.workflowId,
        runId: root.runId,
    };
}
//# sourceMappingURL=utils.js.map