import { database } from "../../../shared/src/database.js";
import { traverseDependencies } from "../../../shared/src/dependency-graph.js";
import type { ResourceRelationship } from "../../../shared/src/architecture.types.js";

import {
  createToolError,
  createToolResponse
} from "../helpers/tool-response.js";

interface GetResourceDependenciesInput {
  resource_id: string;
  max_depth: number;
  direction?: "dependencies" | "dependents";
}

interface ResourceRow {
  id: string;
  name: string;
  resource_type: string;
  environment: string;
}

export async function getResourceDependenciesTool(
  input: GetResourceDependenciesInput
) {
  try {
    const resourceResult =
      await database.query<ResourceRow>(
        `
          SELECT
            id,
            name,
            resource_type,
            environment
          FROM resources
          WHERE id = $1
        `,
        [input.resource_id]
      );

    const resource = resourceResult.rows[0];

    if (!resource) {
      return createToolError(
        "RESOURCE_NOT_FOUND",
        `Resource ${input.resource_id} was not found`
      );
    }

    const relationshipsResult =
      await database.query<ResourceRelationship>(
        `
          SELECT
            source_resource_id AS source,
            target_resource_id AS target,
            relationship_type AS type
          FROM resource_relationships
        `
      );

    const direction = input.direction ?? "dependencies";
    const relatedResources = traverseDependencies(
      input.resource_id, relationshipsResult.rows, input.max_depth, direction
    );

    return createToolResponse({
      resource: {
        id: resource.id,
        name: resource.name,
        type: resource.resource_type,
        environment: resource.environment
      },
      max_depth: input.max_depth,
      direction,
      related_resources: relatedResources
    });
  } catch (error) {
    console.error(
      "get_resource_dependencies failed:",
      error
    );

    return createToolError(
      "DATABASE_ERROR",
      "Resource dependencies could not be retrieved"
    );
  }
}
