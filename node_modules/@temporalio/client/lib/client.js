"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const internal_workflow_1 = require("@temporalio/common/lib/internal-workflow");
const base_client_1 = require("./base-client");
const nexus_client_1 = require("./nexus-client");
const schedule_client_1 = require("./schedule-client");
const workflow_client_1 = require("./workflow-client");
const task_queue_client_1 = require("./task-queue-client");
const activity_client_1 = require("./activity-client");
/**
 * High level SDK client.
 */
class Client extends base_client_1.BaseClient {
    options;
    /**
     * Workflow sub-client - use to start and interact with Workflows
     */
    workflow;
    /**
     * Activity sub-client - use to start and interact with Activities and to perform asynchronous Activity completion
     */
    activity;
    /**
     * Schedule sub-client - use to start and interact with Schedules
     */
    schedule;
    /**
     * Task Queue sub-client - use to perform operations on Task Queues
     *
     * @experimental The Worker Versioning API is still being designed. Major changes are expected.
     */
    taskQueue;
    /**
     * Nexus sub-client - use to start and interact with standalone Nexus operations.
     *
     * @experimental Standalone Nexus operations are a new API and susceptible to change.
     */
    nexus;
    constructor(options) {
        options = options ?? {};
        // Add client plugins from the connection
        options.plugins = (options.plugins ?? []).concat(options.connection?.plugins ?? []);
        // Process plugins first to allow them to modify connect configuration
        for (const plugin of options.plugins) {
            if (plugin.configureClient !== undefined) {
                options = plugin.configureClient(options);
            }
        }
        super(options);
        const { interceptors, workflow, plugins, ...commonOptions } = options;
        this.workflow = new workflow_client_1.WorkflowClient({
            ...commonOptions,
            ...(workflow ?? {}),
            connection: this.connection,
            dataConverter: this.dataConverter,
            interceptors: interceptors?.workflow,
            queryRejectCondition: workflow?.queryRejectCondition,
        });
        this.activity = new activity_client_1.ActivityClient({
            ...commonOptions,
            connection: this.connection,
            dataConverter: this.dataConverter,
            interceptors: interceptors?.activity,
        });
        this.schedule = new schedule_client_1.ScheduleClient({
            ...commonOptions,
            connection: this.connection,
            dataConverter: this.dataConverter,
            interceptors: interceptors?.schedule,
        });
        this.taskQueue = new task_queue_client_1.TaskQueueClient({
            ...commonOptions,
            connection: this.connection,
            dataConverter: this.dataConverter,
        });
        this.nexus = new nexus_client_1.NexusClient({
            ...commonOptions,
            connection: this.connection,
            dataConverter: this.dataConverter,
            interceptors: interceptors?.nexus,
        });
        this.options = {
            ...(0, base_client_1.defaultBaseClientOptions)(),
            ...(0, internal_workflow_1.filterNullAndUndefined)(commonOptions),
            loadedDataConverter: this.dataConverter,
            interceptors: {
                workflow: this.workflow.options.interceptors,
                schedule: this.schedule.options.interceptors,
                nexus: this.nexus.options.interceptors,
            },
            workflow: {
                queryRejectCondition: this.workflow.options.queryRejectCondition,
            },
            plugins: plugins ?? [],
        };
    }
    /**
     * Raw gRPC access to the Temporal service.
     *
     * **NOTE**: The namespace provided in {@link options} is **not** automatically set on requests made via this service
     * object.
     */
    get workflowService() {
        return this.connection.workflowService;
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map