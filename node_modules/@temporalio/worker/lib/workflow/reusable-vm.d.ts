import vm from 'node:vm';
import type { Workflow, WorkflowCreateOptions, WorkflowCreator } from './interface';
import type { WorkflowBundleWithSourceMapAndFilename } from './workflow-worker-thread/input';
import { BaseVMWorkflow } from './vm-shared';
import type { WorkflowPatchActivationCallback } from './patch-activation-callback';
/**
 * A WorkflowCreator that creates VMWorkflows in the current isolate
 */
export declare class ReusableVMWorkflowCreator implements WorkflowCreator {
    protected readonly workflowBundle: WorkflowBundleWithSourceMapAndFilename;
    protected readonly isolateExecutionTimeoutMs: number;
    /** Known activity names registered on the executing worker */
    protected readonly registeredActivityNames: Set<string>;
    protected readonly patchActivationCallback?: WorkflowPatchActivationCallback | undefined;
    /**
     * TODO(bergundy): Get rid of this static state somehow
     */
    private static unhandledRejectionHandlerHasBeenSet;
    static workflowByRunId: Map<string, ReusableVMWorkflow>;
    /**
     * Optional context - this attribute is deleted upon on {@link destroy}
     *
     * Use the {@link context} getter instead
     */
    private _context?;
    private pristineObj?;
    constructor(script: vm.Script, workflowBundle: WorkflowBundleWithSourceMapAndFilename, isolateExecutionTimeoutMs: number, 
    /** Known activity names registered on the executing worker */
    registeredActivityNames: Set<string>, patchActivationCallback?: WorkflowPatchActivationCallback | undefined);
    protected get context(): vm.Context & typeof globalThis;
    /**
     * Inject global objects as well as console.[log|...] into a vm context.
     *
     * Overridable for test purposes.
     */
    protected injectGlobals(context: vm.Context): void;
    /**
     * Create a workflow with given options
     */
    createWorkflow(options: WorkflowCreateOptions): Promise<Workflow>;
    /**
     * Create a new instance, pre-compile scripts from given code.
     *
     * This method is generic to support subclassing.
     */
    static create<T extends typeof ReusableVMWorkflowCreator>(this: T, workflowBundle: WorkflowBundleWithSourceMapAndFilename, isolateExecutionTimeoutMs: number, registeredActivityNames: Set<string>, patchActivationCallback?: WorkflowPatchActivationCallback): Promise<InstanceType<T>>;
    /**
     * Cleanup the pre-compiled script
     */
    destroy(): Promise<void>;
}
/**
 * A Workflow implementation using Node.js' built-in `vm` module
 */
export declare class ReusableVMWorkflow extends BaseVMWorkflow {
    dispose(): Promise<void>;
}
