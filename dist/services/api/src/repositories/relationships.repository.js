"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllRelationships = findAllRelationships;
const database_js_1 = require("../../../shared/src/database.js");
async function findAllRelationships() {
    const result = await database_js_1.database.query(`
        SELECT
          source_resource_id AS source,
          target_resource_id AS target,
          relationship_type AS type
        FROM resource_relationships
      `);
    return result.rows;
}
