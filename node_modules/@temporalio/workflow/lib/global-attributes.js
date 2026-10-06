"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivator = void 0;
exports.setActivator = setActivator;
exports.maybeGetActivator = maybeGetActivator;
exports.assertInWorkflowContext = assertInWorkflowContext;
const common_1 = require("@temporalio/common");
function setActivator(activator) {
    globalThis.__TEMPORAL_ACTIVATOR__ = activator;
}
function maybeGetActivator() {
    return globalThis.__TEMPORAL_ACTIVATOR__;
}
function assertInWorkflowContext(uninitializedErrorMessage) {
    const activator = maybeGetActivator();
    if (activator == null)
        throw new common_1.IllegalStateError(uninitializedErrorMessage);
    return activator;
}
// This is really just an alias for `assertInWorkflowContext` with a default error message,
// because that name better conveys the intent in some very common use cases.
exports.getActivator = assertInWorkflowContext.bind(null, 'Workflow uninitialized');
//# sourceMappingURL=global-attributes.js.map