"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeInitialVersioningBehavior = exports.encodeInitialVersioningBehavior = exports.InitialVersioningBehavior = exports.decodeVersioningBehavior = exports.encodeVersioningBehavior = exports.VersioningBehavior = void 0;
exports.toCanonicalString = toCanonicalString;
exports.convertDeploymentVersion = convertDeploymentVersion;
const internal_workflow_1 = require("./internal-workflow");
/**
 * @returns The canonical representation of a deployment version, which is a string in the format
 * `deploymentName.buildId`.
 */
function toCanonicalString(version) {
    return `${version.deploymentName}.${version.buildId}`;
}
/**
 * Specifies when a workflow might move from a worker of one Build Id to another.
 *
 * * 'PINNED' - The workflow will be pinned to the current Build ID unless manually moved.
 * * 'AUTO_UPGRADE' - The workflow will automatically move to the latest version (default Build ID
 *    of the task queue) when the next task is dispatched.
 */
exports.VersioningBehavior = {
    PINNED: 'PINNED',
    AUTO_UPGRADE: 'AUTO_UPGRADE',
};
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.VersioningBehavior.PINNED]: 1,
    [exports.VersioningBehavior.AUTO_UPGRADE]: 2,
    UNSPECIFIED: 0,
}, 'VERSIONING_BEHAVIOR_'), exports.encodeVersioningBehavior = _a[0], exports.decodeVersioningBehavior = _a[1];
/**
 * Defines the versioning behavior to be used by the first task of a new workflow run in a continue-as-new chain.
 *
 * AUTO_UPGRADE - Start the new run with AutoUpgrade behavior. Use the Target Version of the workflow's task queue at
 *   start-time, as AutoUpgrade workflows do. After the first workflow task completes, use whatever
 *   Versioning Behavior the workflow is annotated with in the workflow code.
 *
 *   Note that if the previous workflow had a Pinned override, that override will be inherited by the
 *   new workflow run regardless of the ContinueAsNewVersioningBehavior specified in the continue-as-new
 *   command. If a Pinned override is inherited by the new run, and the new run starts with AutoUpgrade
 *   behavior, the base version of the new run will be the Target Version as described above, but the
 *   effective version will be whatever is specified by the Versioning Override until the override is removed.
 *
 * USE_RAMPING_VERSION - Use the Ramping Version of the workflow's task queue at start time, regardless of the workflow's
 *   Target Version (according to f(workflow_id, ramp_percentage)). After the first workflow task completes,
 *   the workflow will use whatever Versioning Behavior it is annotated with. If there is no Ramping
 *   Version by the time that the first workflow task is dispatched, it will be sent to the Current Version.
 *
 *   It is highly discouraged to use this if the workflow is annotated with AutoUpgrade behavior, because
 *   this setting ONLY applies to the first task of the workflow. If, after the first task, the workflow
 *   is AutoUpgrade, it will behave like a normal AutoUpgrade workflow and go to the Target Version, which
 *   may be the Current Version instead of the Ramping Version.
 *
 *   Note that if the workflow being continued has a Pinned override, that override will be inherited by the
 *   new workflow run regardless of the ContinueAsNewVersioningBehavior specified in the continue-as-new
 *   command. Versioning Override always takes precedence until it's removed manually via UpdateWorkflowExecutionOptions.
 *
 * @experimental Versioning semantics with continue-as-new are experimental and may change in the future.
 */
exports.InitialVersioningBehavior = {
    AUTO_UPGRADE: 'AUTO_UPGRADE',
    USE_RAMPING_VERSION: 'USE_RAMPING_VERSION',
};
_b = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.InitialVersioningBehavior.AUTO_UPGRADE]: 1,
    [exports.InitialVersioningBehavior.USE_RAMPING_VERSION]: 2,
    UNSPECIFIED: 0,
}, 'CONTINUE_AS_NEW_VERSIONING_BEHAVIOR_'), exports.encodeInitialVersioningBehavior = _b[0], exports.decodeInitialVersioningBehavior = _b[1];
/**
 * @internal
 */
function convertDeploymentVersion(v) {
    if (!v || !v.buildId) {
        return undefined;
    }
    return {
        buildId: v.buildId,
        deploymentName: v.deploymentName ?? '',
    };
}
//# sourceMappingURL=worker-deployments.js.map