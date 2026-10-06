import type { BaseClientOptions, LoadedWithDefaults } from './base-client';
import { BaseClient } from './base-client';
import type { ClientInterceptors } from './interceptors';
import { NexusClient } from './nexus-client';
import { ScheduleClient } from './schedule-client';
import type { QueryRejectCondition, WorkflowService } from './types';
import { WorkflowClient } from './workflow-client';
import { TaskQueueClient } from './task-queue-client';
import { ActivityClient } from './activity-client';
export interface ClientOptions extends BaseClientOptions {
    /**
     * Used to override and extend default Connection functionality
     *
     * Useful for injecting auth headers and tracing Workflow executions
     */
    interceptors?: ClientInterceptors;
    /**
     * List of plugins to register with the client.
     *
     * Plugins allow you to extend and customize the behavior of Temporal clients.
     * They can intercept and modify client creation.
     *
     * @experimental Plugins is an experimental feature; APIs may change without notice.
     */
    plugins?: ClientPlugin[];
    workflow?: {
        /**
         * Should a query be rejected by closed and failed workflows
         *
         * @default `undefined`, which means that closed and failed workflows are still queryable
         */
        queryRejectCondition?: QueryRejectCondition;
    };
}
export type LoadedClientOptions = LoadedWithDefaults<ClientOptions>;
/**
 * High level SDK client.
 */
export declare class Client extends BaseClient {
    readonly options: LoadedClientOptions;
    /**
     * Workflow sub-client - use to start and interact with Workflows
     */
    readonly workflow: WorkflowClient;
    /**
     * Activity sub-client - use to start and interact with Activities and to perform asynchronous Activity completion
     */
    readonly activity: ActivityClient;
    /**
     * Schedule sub-client - use to start and interact with Schedules
     */
    readonly schedule: ScheduleClient;
    /**
     * Task Queue sub-client - use to perform operations on Task Queues
     *
     * @experimental The Worker Versioning API is still being designed. Major changes are expected.
     */
    readonly taskQueue: TaskQueueClient;
    /**
     * Nexus sub-client - use to start and interact with standalone Nexus operations.
     *
     * @experimental Standalone Nexus operations are a new API and susceptible to change.
     */
    readonly nexus: NexusClient;
    constructor(options?: ClientOptions);
    /**
     * Raw gRPC access to the Temporal service.
     *
     * **NOTE**: The namespace provided in {@link options} is **not** automatically set on requests made via this service
     * object.
     */
    get workflowService(): WorkflowService;
}
/**
 * Plugin to control the configuration of a native connection.
 *
 * @experimental Plugins is an experimental feature; APIs may change without notice.
 */
export interface ClientPlugin {
    /**
     * Gets the name of this plugin.
     */
    get name(): string;
    /**
     * Hook called when creating a client to allow modification of configuration.
     *
     * This method is called during client creation and allows plugins to modify
     * the client configuration before the client is fully initialized.
     */
    configureClient?(options: Omit<ClientOptions, 'plugins'>): Omit<ClientOptions, 'plugins'>;
}
