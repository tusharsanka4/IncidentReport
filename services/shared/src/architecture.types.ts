export type ResourceType =
  | "CDN"
  | "APPLICATION"
  | "SERVICE"
  | "DATABASE"
  | "CACHE"
  | "QUEUE"
  | "SECRET"
  | "REPOSITORY"
  | "PIPELINE"
  | "CLUSTER";

export type RelationshipType =
  | "ROUTES_TO"
  | "CALLS"
  | "DEPENDS_ON"
  | "READS_FROM"
  | "WRITES_TO"
  | "USES_SECRET"
  | "BUILT_FROM"
  | "DEPLOYED_BY"
  | "PUBLISHES_TO"
  | "CONSUMES_FROM"
  | "HOSTED_ON";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  environment: string;
  metadata?: Record<string, unknown>;
}

export interface ResourceRelationship {
  source: string;
  target: string;
  type: RelationshipType;
}