export type WorkflowStatus =
  | "ANALYSING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "REMEDIATION_COMPLETED"
  | "MANUAL_INVESTIGATION"
  | "FAILED";

export type ApprovalDecisionType =
  | "APPROVED"
  | "REJECTED";

export interface IncidentWorkflowInput {
  incidentId: string;
}

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

  error?: string;
}