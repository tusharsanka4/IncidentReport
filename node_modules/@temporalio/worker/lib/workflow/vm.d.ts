import vm from 'node:vm';
import type { Workflow, WorkflowCreateOptions, WorkflowCreator } from './interface';
import type { WorkflowBundleWithSourceMapAndFilename } from './workflow-worker-thread/input';
import { BaseVMWorkflow } from './vm-shared';
import type { WorkflowPatchActivationCallback } from './patch-activation-callback';
/**
 * A WorkflowCreator that creates VMWorkflows in the current isolate
 */
export declare class VMWorkflowCreator implements WorkflowCreator {
    protected readonly workflowBundle: WorkflowBundleWithSourceMapAndFilename;
    protected readonly isolateExecutionTimeoutMs: number;
    protected readonly registeredActivityNames: Set<string>;
    protected readonly patchActivationCallback?: WorkflowPatchActivationCallback | undefined;
    private static unhandledRejectionHandlerHasBeenSet;
    static workflowByRunId: Map<string, VMWorkflow>;
    script?: vm.Script;
    constructor(script: vm.Script, workflowBundle: WorkflowBundleWithSourceMapAndFilename, isolateExecutionTimeoutMs: number, registeredActivityNames: Set<string>, patchActivationCallback?: WorkflowPatchActivationCallback | undefined);
    /**
     * Create a workflow with given options
     */
    createWorkflow(options: WorkflowCreateOptions): Promise<Workflow>;
    protected get context(): vm.Context & typeof globalThis;
    /**
     * Inject global objects as well as console.[log|...] into a vm context.
     *
     * Overridable for test purposes.
     */
    protected injectGlobals(context: vm.Context): void;
    /**
     * Create a new instance, pre-compile scripts from given code.
     *
     * This method is generic to support subclassing.
     */
    static create<T extends typeof VMWorkflowCreator>(this: T, workflowBundle: WorkflowBundleWithSourceMapAndFilename, isolateExecutionTimeoutMs: number, registeredActivityNames: Set<string>, patchActivationCallback?: WorkflowPatchActivationCallback): Promise<InstanceType<T>>;
    /**
     * Cleanup the pre-compiled script
     */
    destroy(): Promise<void>;
}
/**
 * A Workflow implementation using Node.js' built-in `vm` module
 */
export declare class VMWorkflow extends BaseVMWorkflow {
    dispose(): Promise<void>;
}
