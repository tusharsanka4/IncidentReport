"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceDependenciesTool = getResourceDependenciesTool;
const database_js_1 = require("../../../shared/src/database.js");
const tool_response_js_1 = require("../helpers/tool-response.js");
async function getResourceDependenciesTool(input) {
    try {
        const resourceResult = await database_js_1.database.query(`
          SELECT
            id,
            name,
            resource_type,
            environment
          FROM resources
          WHERE id = $1
        `, [input.resource_id]);
        const resource = resourceResult.rows[0];
        if (!resource) {
            return (0, tool_response_js_1.createToolError)("RESOURCE_NOT_FOUND", `Resource ${input.resource_id} was not found`);
        }
        const relationshipsResult = await database_js_1.database.query(`
          SELECT
            source_resource_id AS source,
            target_resource_id AS target,
            relationship_type AS type
          FROM resource_relationships
        `);
        const adjacencyList = new Map();
        for (const relationship of relationshipsResult.rows) {
            const current = adjacencyList.get(relationship.source) ?? [];
            current.push(relationship);
            adjacencyList.set(relationship.source, current);
        }
        const queue = [
            {
                resourceId: input.resource_id,
                distance: 0,
                path: [input.resource_id]
            }
        ];
        const visited = new Set([
            input.resource_id
        ]);
        const relatedResources = [];
        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) {
                break;
            }
            if (current.distance >= input.max_depth) {
                continue;
            }
            const relationships = adjacencyList.get(current.resourceId) ?? [];
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
        return (0, tool_response_js_1.createToolResponse)({
            resource: {
                id: resource.id,
                name: resource.name,
                type: resource.resource_type,
                environment: resource.environment
            },
            max_depth: input.max_depth,
            related_resources: relatedResources
        });
    }
    catch (error) {
        console.error("get_resource_dependencies failed:", error);
        return (0, tool_response_js_1.createToolError)("DATABASE_ERROR", "Resource dependencies could not be retrieved");
    }
}
