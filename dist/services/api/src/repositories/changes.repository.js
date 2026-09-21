"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRecentChanges = findRecentChanges;
const database_js_1 = require("../../../shared/src/database.js");
async function findRecentChanges(detectedAt, lookbackHours = 6) {
    const result = await database_js_1.database.query(`
      SELECT
        id,
        resource_id,
        change_type,
        description,
        version,
        environment,
        deployed_at,
        source,
        metadata,
        created_at
      FROM changes
      WHERE deployed_at <= $1::timestamptz
        AND deployed_at >= (
          $1::timestamptz -
          ($2::integer * INTERVAL '1 hour')
        )
      ORDER BY deployed_at DESC
    `, [
        detectedAt,
        lookbackHours
    ]);
    return result.rows;
}
