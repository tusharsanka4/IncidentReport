import type { coresdk } from '@temporalio/proto';
import type { WorkflowCreateOptionsInternal } from './interfaces';
export { PromiseStackStore } from './internals';
/**
 * Initialize the isolate runtime.
 *
 * Sets required internal state and instantiates the workflow and interceptors.
 */
export declare function initRuntime(options: WorkflowCreateOptionsInternal): void;
/**
 * Initialize the workflow. Or to be exact, _complete_ initialization, as most part has been done in constructor).
 */
export declare function initialize(initializeWorkflowJob: coresdk.workflow_activation.IInitializeWorkflow): void;
/**
 * Run a chunk of activation jobs.
 *
 * Notice that this function is not async and runs _inside_ the VM context. Therefore, no microtask
 * will get executed _while_ this function is active; they will however get executed _after_ this
 * function returns (i.e. all outstanding microtasks in the VM will get executed before execution
 * resumes out of the VM, in `vm-shared.ts:activate()`).
 */
export declare function activate(activation: coresdk.workflow_activation.IWorkflowActivation, batchIndex?: number): void;
/**
 * Conclude a single activation.
 * Should be called after processing all activation jobs and queued microtasks.
 *
 * Activation failures are handled in the main Node.js isolate.
 */
export declare function concludeActivation(): coresdk.workflow_completion.IWorkflowActivationCompletion;
/**
 * Loop through all blocked conditions, evaluate and unblock if possible.
 *
 * @returns number of unblocked conditions.
 */
export declare function tryUnblockConditions(): number;
export declare function dispose(): void;
export declare function destroy(): void;
