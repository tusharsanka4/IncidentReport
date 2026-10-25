import type { ResourceRelationship } from "./architecture.types.js";

export interface RelatedResource {
  resource: string;
  relationship: string;
  distance: number;
  path: string[];
}

/** Breadth-first traversal returns each reachable resource's shortest path. */
export function traverseDependencies(
  resourceId: string,
  relationships: ResourceRelationship[],
  maxDepth = Number.POSITIVE_INFINITY,
  direction: "dependencies" | "dependents" = "dependencies"
): RelatedResource[] {
  if (maxDepth !== Infinity && (!Number.isInteger(maxDepth) || maxDepth < 0)) {
    throw new RangeError("Dependency depth must be a non-negative integer");
  }
  const adjacency = new Map<string, Array<{ target: string; type: string }>>();
  for (const edge of relationships) {
    const source = direction === "dependencies" ? edge.source : edge.target;
    const target = direction === "dependencies" ? edge.target : edge.source;
    const neighbours = adjacency.get(source) ?? [];
    neighbours.push({ target, type: edge.type });
    adjacency.set(source, neighbours);
  }
  for (const neighbours of adjacency.values()) {
    neighbours.sort((a, b) => a.target < b.target ? -1 : a.target > b.target ? 1 : a.type.localeCompare(b.type));
  }
  const visited = new Set([resourceId]);
  const queue = [{ resource: resourceId, distance: 0, path: [resourceId] }];
  const result: RelatedResource[] = [];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    if (current.distance >= maxDepth) continue;
    for (const edge of adjacency.get(current.resource) ?? []) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);
      const related = {
        resource: edge.target, relationship: edge.type,
        distance: current.distance + 1, path: [...current.path, edge.target]
      };
      result.push(related);
      queue.push(related);
    }
  }
  return result;
}
