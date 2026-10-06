import { type SearchAttributePair } from '@temporalio/common';
import type { WorkflowInfo } from '@temporalio/workflow';
import type { PatchActivationCallback } from '../worker-options';
export declare const PATCH_ACTIVATION_CALLBACK_BUFFER_SIZE: number;
export declare const PATCH_ACTIVATION_CALLBACK_HEADER_SIZE: number;
export declare const enum PatchActivationCallbackStatus {
    Pending = 0,
    True = 1,
    False = 2,
    Error = 3
}
export type WorkflowPatchActivationCallback = (workflowInfo: WorkflowInfo, patchId: string) => boolean;
export type PatchActivationWorkflowInfoSnapshot = Omit<WorkflowInfo, 'typedSearchAttributes' | 'unsafe'> & {
    typedSearchAttributes: SearchAttributePair[];
    unsafe: Pick<WorkflowInfo['unsafe'], 'isReplaying' | 'isReplayingHistoryEvents'>;
};
export declare function makePatchActivationWorkflowInfoSnapshot(workflowInfo: WorkflowInfo): PatchActivationWorkflowInfoSnapshot;
export declare function invokePatchActivationCallbackWithSnapshot(callback: PatchActivationCallback, workflowInfo: PatchActivationWorkflowInfoSnapshot, patchId: string): boolean;
export declare function invokePatchActivationCallback(callback: PatchActivationCallback, workflowInfo: WorkflowInfo, patchId: string): boolean;
export declare function writePatchActivationCallbackResult(resultBuffer: SharedArrayBuffer, result: boolean): void;
export declare function writePatchActivationCallbackError(resultBuffer: SharedArrayBuffer, error: unknown): void;
export declare function completePatchActivationCallback(resultBuffer: SharedArrayBuffer): void;
export declare function waitForPatchActivationCallbackResult(resultBuffer: SharedArrayBuffer): boolean;
