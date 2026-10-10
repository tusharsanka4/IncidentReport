import {
  Client,
  Connection,
  ServiceError,
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError
} from "@temporalio/client";

import type {
  ApprovalDecisionType,
  IncidentWorkflow,
  IncidentWorkflowSnapshot,
  SimulationScenario
} from "../../../temporal-worker/src/shared.types.js";

import {
  getIncidentWorkflowId
} from "../../../temporal-worker/src/client/workflow-client.js";

import {
  submitApprovalDecision
} from "../../../temporal-worker/src/client/submit-decision.js";

import {
  DecisionError
} from "../../../temporal-worker/src/client/decision-error.js";

import { ApiError } from "../errors/api-error.js";

import type {
  WorkflowGateway,
  WorkflowStartResult,
  WorkflowView
} from "../types/workflow.types.js";

export class TemporalGateway implements WorkflowGateway {
  private connection: Promise<Connection> | undefined;

  private async connect(): Promise<Connection> {
    const pending = this.connection ?? Connection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
      connectTimeout: "5 seconds"
    });

    this.connection = pending;

    try {
      return await pending;
    } catch {
      if (this.connection === pending) {
        this.connection = undefined;
      }

      throw new ApiError(
        503,
        "TEMPORAL_UNAVAILABLE",
        "The Temporal service is unavailable; retry this request"
      );
    }
  }

  private async withClient<T>(
    handler: (client: Client) => Promise<T>
  ): Promise<T> {
    const connection = await this.connect();

    const client = new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE ?? "default"
    });

    try {
      return await connection.withDeadline(
        Date.now() + 10000,
        () => handler(client)
      );
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) {
        throw new ApiError(
          404,
          "WORKFLOW_NOT_FOUND",
          "No Temporal workflow exists for this incident"
        );
      }

      if (error instanceof DecisionError) {
        throw new ApiError(
          error.code === "INVALID_APPROVAL" ? 400 : 409,
          error.code,
          error.message
        );
      }

      if (
        error instanceof Error &&
        "type" in error &&
        error.type === "APPROVAL_CONFLICT"
      ) {
        throw new ApiError(409, "APPROVAL_CONFLICT", error.message);
      }

      if (error instanceof ServiceError) {
        throw new ApiError(
          503,
          "TEMPORAL_UNAVAILABLE",
          "Temporal could not process the request; check the service and worker, then retry"
        );
      }

      throw error;
    }
  }

  async start(
    incidentId: string,
    simulation: SimulationScenario
  ): Promise<WorkflowStartResult> {
    return this.withClient(async client => {
      const workflowId = getIncidentWorkflowId(incidentId);

      try {
        await client.workflow.start<IncidentWorkflow>(
          "incidentRemediationWorkflow",
          {
            workflowId,
            taskQueue: process.env.TEMPORAL_TASK_QUEUE ??
              "manifest-incident-operations",
            workflowIdReusePolicy: "REJECT_DUPLICATE",
            args: [{ incidentId, simulation }]
          }
        );

        return { workflowId, started: true };
      } catch (error) {
        if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
          throw error;
        }

        return { workflowId, started: false };
      }
    });
  }

  async inspect(incidentId: string): Promise<WorkflowView> {
    return this.withClient(async client => {
      const handle = client.workflow.getHandle<IncidentWorkflow>(
        getIncidentWorkflowId(incidentId)
      );

      const description = await handle.describe();
      const executionStatus = description.status.name;

      let snapshot: IncidentWorkflowSnapshot | undefined;

      if (executionStatus === "COMPLETED") {
        snapshot = await handle.result();
      } else if (executionStatus === "RUNNING") {
        snapshot = await handle.query<IncidentWorkflowSnapshot>(
          "workflowSnapshot"
        );
      }

      return {
        workflowId: handle.workflowId,
        executionStatus,
        snapshot
      };
    });
  }

  async decide(
    incidentId: string,
    decision: ApprovalDecisionType,
    decidedBy: string,
    comment?: string
  ): Promise<boolean> {
    return this.withClient(async client => {
      const handle = client.workflow.getHandle<IncidentWorkflow>(
        getIncidentWorkflowId(incidentId)
      );

      return submitApprovalDecision(
        handle,
        decision,
        decidedBy,
        comment
      );
    });
  }

  async close(): Promise<void> {
    const pending = this.connection;
    this.connection = undefined;

    if (pending) {
      const connection = await pending.catch(() => undefined);
      await connection?.close();
    }
  }
}
