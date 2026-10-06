/**
 * Wrapper for starting VM Workflows in Node Worker threads.
 * https://nodejs.org/api/worker_threads.html
 *
 * Worker threads are used here because creating vm contexts is a long running
 * operation which blocks the Node.js event loop causing the SDK Worker to
 * become unresponsive.
 *
 * @module
 */
import { Worker as NodeWorker } from 'node:worker_threads';
import { coresdk } from '@temporalio/proto';
import { type SinkCall } from '@temporalio/workflow';
import type { Logger } from '@temporalio/common';
import type { PatchActivationCallback } from '../worker-options';
import type { WorkflowBundleWithSourceMapAndFilename, WorkerThreadInput } from './workflow-worker-thread/input';
import type { Workflow, WorkflowCreateOptions, WorkflowCreator } from './interface';
import type { WorkerThreadOutput } from './workflow-worker-thread/output';
export declare const TERMINATED_EXIT_CODE: number;
/**
 * Client for communicating with a workflow worker thread.
 *
 * Uses postMessage to send messages and listens on the `message` event to receive messages.
 */
export declare class WorkerThreadClient {
    protected workerThread: NodeWorker;
    protected logger: Logger;
    protected patchActivationCallback?: PatchActivationCallback | undefined;
    private requestIdx;
    private requestIdToCompletion;
    private shutDownRequested;
    private workerExited;
    private activeWorkflowCount;
    private exitError;
    constructor(workerThread: NodeWorker, logger: Logger, patchActivationCallback?: PatchActivationCallback | undefined);
    private handlePatchActivationCallback;
    /**
     * Send input to Worker thread and await for output
     */
    send(input: WorkerThreadInput): Promise<WorkerThreadOutput>;
    /**
     * Request destruction of the worker thread and await for it to terminate correctly
     */
    destroy(): Promise<void>;
    /**
     * Bun's terminate() hangs when called on an already exited worker thread.
     * We race terminate() against receiving the exit event to handle this case.
     */
    private terminateWithBunWorkaround;
    getActiveWorkflowCount(): number;
}
export interface ThreadedVMWorkflowCreatorOptions {
    workflowBundle: WorkflowBundleWithSourceMapAndFilename;
    threadPoolSize: number;
    isolateExecutionTimeoutMs: number;
    reuseV8Context: boolean;
    registeredActivityNames: Set<string>;
    logger: Logger;
    patchActivationCallback?: PatchActivationCallback;
}
/**
 * A WorkflowCreator that creates vm Workflows inside Worker threads
 */
export declare class ThreadedVMWorkflowCreator implements WorkflowCreator {
    protected readonly workerThreadClients: WorkerThreadClient[];
    /**
     * Create an instance of ThreadedVMWorkflowCreator asynchronously.
     *
     * This method creates and initializes the workflow-worker-thread instances.
     */
    static create({ threadPoolSize, workflowBundle, isolateExecutionTimeoutMs, reuseV8Context, registeredActivityNames, logger, patchActivationCallback, }: ThreadedVMWorkflowCreatorOptions): Promise<ThreadedVMWorkflowCreator>;
    constructor(workerThreadClients: WorkerThreadClient[]);
    /**
     * Create a workflow with given options
     */
    createWorkflow(options: WorkflowCreateOptions): Promise<Workflow>;
    /**
     * Destroy and terminate all threads created by this instance
     */
    destroy(): Promise<void>;
}
/**
 * A proxy class used to communicate with a VMWorkflow instance in a worker thread.
 */
export declare class VMWorkflowThreadProxy implements Workflow {
    protected readonly workerThreadClient: WorkerThreadClient;
    readonly runId: string;
    /**
     * Send a create-workflow command to the thread and await for acknowledgement
     */
    static create(workerThreadClient: WorkerThreadClient, options: WorkflowCreateOptions): Promise<VMWorkflowThreadProxy>;
    constructor(workerThreadClient: WorkerThreadClient, runId: string);
    /**
     * Proxy request to the VMWorkflow instance
     */
    getAndResetSinkCalls(): Promise<SinkCall[]>;
    /**
     * Proxy request to the VMWorkflow instance
     */
    activate(activation: coresdk.workflow_activation.IWorkflowActivation): Promise<coresdk.workflow_completion.IWorkflowActivationCompletion>;
    /**
     * Proxy request to the VMWorkflow instance
     */
    dispose(): Promise<void>;
}
