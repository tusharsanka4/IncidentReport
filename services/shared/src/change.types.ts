export interface ChangeSeedInput {
  change_id: string;
  resource: string;
  type: string;
  description?: string;
  version?: string;
  environment: string;
  deployed_at: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface Change {
  id: string;
  resource_id: string;
  change_type: string;
  description: string | null;
  version: string | null;
  environment: string;
  deployed_at: Date;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}