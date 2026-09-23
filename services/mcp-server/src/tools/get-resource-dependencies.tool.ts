import { database } from "../../../shared/src/database.js";

import {
  createToolError,
  createToolResponse
} from "../helpers/tool-response.js";

interface GetResourceDependenciesInput {
  resource_id: string;
  max_depth: number;
}

interface ResourceRow {
  id: string;
  name: string;
  resource_type: string;
  environment: string;
}

interface RelationshipRow {
  source: string;
  target: string;
  type: string;
}

interface RelatedResource {
  resource: string;
  relationship: string;
  distance: number;
  path: string[];
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
      await database.query<RelationshipRow>(
        `
          SELECT
            source_resource_id AS source,
            target_resource_id AS target,
            relationship_type AS type
          FROM resource_relationships
        `
      );

    const adjacencyList =
      new Map<string, RelationshipRow[]>();

    for (const relationship of relationshipsResult.rows) {
      const current =
        adjacencyList.get(relationship.source) ?? [];

      current.push(relationship);
      adjacencyList.set(
        relationship.source,
        current
      );
    }

    const queue: Array<{
      resourceId: string;
      distance: number;
      path: string[];
    }> = [
      {
        resourceId: input.resource_id,
        distance: 0,
        path: [input.resource_id]
      }
    ];

    const visited = new Set<string>([
      input.resource_id
    ]);

    const relatedResources: RelatedResource[] = [];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        break;
      }

      if (current.distance >= input.max_depth) {
        continue;
      }

      const relationships =
        adjacencyList.get(current.resourceId) ?? [];

      for (const relationship of relationships) {
        if (visited.has(relationship.target)) {
          continue;
        }

        visited.add(relationship.target);

        const distance = current.distance + 1;
        const path = [
          ...current.path,
          relationship.target
        ];

        relatedResources.push({
          resource: relationship.target,
          relationship: relationship.type,
          distance,
          path
        });

        queue.push({
          resourceId: relationship.target,
          distance,
          path
        });
      }
    }

    return createToolResponse({
      resource: {
        id: resource.id,
        name: resource.name,
        type: resource.resource_type,
        environment: resource.environment
      },
      max_depth: input.max_depth,
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