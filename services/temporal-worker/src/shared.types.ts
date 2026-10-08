export type WorkflowStatus =
  | "ANALYSING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "REMEDIATING"
  | "VERIFYING_HEALTH"
  | "RESOLVED"
  | "ESCALATED"
  | "FAILED";

export type ApprovalDecisionType =
  | "APPROVED"
  | "REJECTED";

export interface IncidentWorkflowInput {
  incidentId: string;

  simulation?: SimulationScenario;
}

export type SimulationScenario =
  | "SUCCESS"
  | "REMEDIATION_FAILURE"
  | "UNHEALTHY";

export interface RecommendedAction {
  type:
    | "ROLLBACK"
    | "CONFIGURATION_REVERT"
    | "RESTART"
    | "MANUAL_INVESTIGATION";

  resource: string;

  from_version?: string;

  to_version?: string;

  execution:
    "HUMAN_APPROVAL_REQUIRED";

  requires_approval: boolean;
}

export interface AnalysisActivityResult {
  incidentId: string;

  analysisId: string;

  probableChangeId: string | null;

  confidenceScore: number;

  reasoningSummary: string;

  recommendedAction:
    RecommendedAction;

  analysisStatus:
    | "AWAITING_APPROVAL"
    | "MANUAL_INVESTIGATION";
}

export interface ApprovalDecision {
  approvalRequestId: string;

  decision: ApprovalDecisionType;

  decidedBy: string;

  comment?: string;

  decidedAt: string;
}

export interface RemediationResult {
  success: boolean;

  simulated: boolean;

  action: string;

  resource: string;

  message: string;

  completedAt: string;
}

export interface IncidentWorkflowResult {
  incidentId: string;

  status: WorkflowStatus;

  analysis?: AnalysisActivityResult;

  approval?: ApprovalDecision;

  remediation?: RemediationResult;

  health?: ServiceHealthResult;

  error?: string;
}

export interface ApprovalRequest {
  id: string;

  analysisId: string;

  requestedAction: RecommendedAction;
}

export interface ServiceHealthResult {
  healthy: boolean;

  simulated: true;

  resource: string;

  message: string;

  checkedAt: string;
}

export interface WorkflowTimelineEvent {
  status: WorkflowStatus;

  timestamp: string;
}

export interface IncidentWorkflowSnapshot
  extends IncidentWorkflowResult {
  workflowId: string;

  approvalRequest?: ApprovalRequest;

  timeline: WorkflowTimelineEvent[];
}

export type IncidentWorkflow = (
  input: IncidentWorkflowInput
) => Promise<IncidentWorkflowSnapshot>;
