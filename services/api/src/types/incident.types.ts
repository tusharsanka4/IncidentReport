export type IncidentStatus =
  | "RECEIVED"
  | "ANALYSING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "REMEDIATING"
  | "RESOLVED"
  | "ESCALATED"
  | "FAILED";

export interface Incident {
  id: string;
  service: string;
  environment: string;
  symptom: string;
  detected_at: Date;
  status: IncidentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateIncidentInput {
  incident_id: string;
  service: string;
  environment: string;
  symptom: string;
  detected_at: string;
}