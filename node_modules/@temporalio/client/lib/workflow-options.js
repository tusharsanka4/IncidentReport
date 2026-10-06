"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileWorkflowOptions = compileWorkflowOptions;
const common_1 = require("@temporalio/common");
const time_1 = require("@temporalio/common/lib/time");
const proto_1 = require("@temporalio/proto");
__exportStar(require("@temporalio/common/lib/workflow-options"), exports);
function compileWorkflowOptions(options) {
    const { workflowExecutionTimeout, workflowRunTimeout, workflowTaskTimeout, startDelay, versioningOverride, ...rest } = options;
    return {
        ...rest,
        workflowExecutionTimeout: (0, time_1.msOptionalToTs)(workflowExecutionTimeout),
        workflowRunTimeout: (0, time_1.msOptionalToTs)(workflowRunTimeout),
        workflowTaskTimeout: (0, time_1.msOptionalToTs)(workflowTaskTimeout),
        startDelay: (0, time_1.msOptionalToTs)(startDelay),
        versioningOverride: versioningOverrideToProto(versioningOverride),
    };
}
function versioningOverrideToProto(vo) {
    if (!vo)
        return undefined;
    // TODO: Remove deprecated field assignments when versioning is non-experimental
    if (vo === 'AUTO_UPGRADE') {
        return {
            autoUpgrade: true,
            behavior: proto_1.temporal.api.enums.v1.VersioningBehavior.VERSIONING_BEHAVIOR_AUTO_UPGRADE,
        };
    }
    return {
        pinned: {
            version: vo.pinnedTo,
            behavior: proto_1.temporal.api.workflow.v1.VersioningOverride.PinnedOverrideBehavior.PINNED_OVERRIDE_BEHAVIOR_PINNED,
        },
        behavior: proto_1.temporal.api.enums.v1.VersioningBehavior.VERSIONING_BEHAVIOR_PINNED,
        pinnedVersion: (0, common_1.toCanonicalString)(vo.pinnedTo),
    };
}
//# sourceMappingURL=workflow-options.js.map