import type { coresdk, temporal } from '@temporalio/proto';
import type { ParentWorkflowInfo, RootWorkflowInfo } from '@temporalio/workflow';
export declare const MiB: number;
export declare function toMB(bytes: number, fractionDigits?: number): string;
export declare function byteArrayToBuffer(array: Uint8Array): Buffer;
export declare function convertToParentWorkflowType(parent: coresdk.common.INamespacedWorkflowExecution | null | undefined): ParentWorkflowInfo | undefined;
export declare function convertToRootWorkflowType(root: temporal.api.common.v1.IWorkflowExecution | null | undefined): RootWorkflowInfo | undefined;
