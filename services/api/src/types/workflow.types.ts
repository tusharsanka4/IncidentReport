import type {
  ApprovalDecisionType,
  IncidentWorkflowSnapshot,
  SimulationScenario
} from "../../../temporal-worker/src/shared.types.js";

export interface WorkflowView {
  workflowId: string;

  executionStatus: string;

  snapshot?: IncidentWorkflowSnapshot;
}

export interface WorkflowStartResult {
  workflowId: string;

  started: boolean;
}

export interface WorkflowGateway {
  start(
    incidentId: string,
    simulation: SimulationScenario
  ): Promise<WorkflowStartResult>;

  inspect(incidentId: string): Promise<WorkflowView>;

  decide(
    incidentId: string,
    decision: ApprovalDecisionType,
    decidedBy: string,
    comment?: string
  ): Promise<boolean>;

  close(): Promise<void>;
}

export interface IncidentParameters {
  id: string;
}

export interface AnalyseIncidentBody {
  simulation?: SimulationScenario;
}

export interface ApproveIncidentBody {
  approved_by: string;

  comment?: string;
}

export interface RejectIncidentBody {
  rejected_by: string;

  comment?: string;
}
