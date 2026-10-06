"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRandom = void 0;
exports.getRandomStream = getRandomStream;
const global_attributes_1 = require("./global-attributes");
const random_helpers_1 = require("./random-helpers");
class ActivatorRandomStream {
    activator;
    name;
    constructor(activator, name) {
        this.activator = activator;
        this.name = name;
    }
    random() {
        return this.activator.getNamedRandom(this.name)();
    }
    uuid4() {
        return (0, random_helpers_1.uuid4FromRandom)(() => this.random());
    }
    fill(bytes) {
        return (0, random_helpers_1.fillWithRandom)(() => this.random(), bytes);
    }
    with(fn) {
        return this.activator.withCurrentRandom(this, fn);
    }
}
class DefaultWorkflowRandomStream {
    random() {
        return (0, global_attributes_1.assertInWorkflowContext)('Workflow.workflowRandom may only be used from workflow context.').random();
    }
    uuid4() {
        return (0, random_helpers_1.uuid4FromRandom)(() => this.random());
    }
    fill(bytes) {
        return (0, random_helpers_1.fillWithRandom)(() => this.random(), bytes);
    }
    with(fn) {
        const activator = (0, global_attributes_1.assertInWorkflowContext)('Workflow.workflowRandom may only be used from workflow context.');
        return activator.withCurrentRandom(this, fn);
    }
}
/**
 * The default deterministic random stream for the current workflow execution.
 *
 * This exposes the same underlying sequence used by workflow-level `Math.random()`
 * when no named override is active. It can be useful for plugin/interceptor code
 * that wants an explicit handle to the main workflow random stream, including from
 * inside a temporary named scope established by another `WorkflowRandomStream`.
 *
 * @experimental This API may be removed or changed in the future.
 */
exports.workflowRandom = new DefaultWorkflowRandomStream();
/**
 * Get a named deterministic random stream for the current workflow execution.
 *
 * Named streams are derived from the workflow seed and a stable stream name,
 * without consuming the workflow's default `Math.random()` stream. Repeated
 * calls with the same `name` within a workflow execution refer to the same
 * logical stream state, including across activations.
 *
 * This is the preferred entry point for workflow plugins and interceptors that
 * need their own deterministic entropy. Use stable package- or module-style
 * names so the stream identity remains replay-safe, then keep the returned
 * `WorkflowRandomStream` around and call its methods directly.
 *
 * @experimental This API may be removed or changed in the future.
 */
function getRandomStream(name) {
    const activator = (0, global_attributes_1.assertInWorkflowContext)('Workflow.getRandomStream(...) may only be used from workflow context.');
    return new ActivatorRandomStream(activator, name);
}
//# sourceMappingURL=random-streams.js.map