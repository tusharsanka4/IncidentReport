import { database } from "../../../shared/src/database.js";

import type {
  ResourceRelationship
} from "../../../shared/src/architecture.types.js";

export async function findAllRelationships():
Promise<ResourceRelationship[]> {
  const result =
    await database.query<ResourceRelationship>(
      `
        SELECT
          source_resource_id AS source,
          target_resource_id AS target,
          relationship_type AS type
        FROM resource_relationships
      `
    );

  return result.rows;
}