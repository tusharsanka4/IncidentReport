import { type Workflow } from '@temporalio/common';
import type { Activator } from './internals';
import type { WorkflowInterceptorsFactory } from './interceptors';
declare global {
    var __TEMPORAL__: {
        api: typeof import('./worker-interface.ts');
        preloadModules?: () => void;
        importWorkflows: () => Record<string, Workflow>;
        importInterceptors: () => [{
            interceptors: WorkflowInterceptorsFactory;
        }];
    };
    var __temporal_globalSandboxDestructors: (() => void)[] | undefined;
    var __TEMPORAL_ACTIVATOR__: Activator | undefined;
}
export declare function setActivator(activator: Activator | undefined): void;
export declare function maybeGetActivator(): Activator | undefined;
export declare function assertInWorkflowContext(uninitializedErrorMessage: string): Activator;
export declare const getActivator: () => Activator;
