import { database } from "../../../shared/src/database.js";

import type { Change } from "../../../shared/src/change.types.js";

export async function findRecentChanges(
  detectedAt: Date | string,
  lookbackHours = 6
): Promise<Change[]> {
  const result = await database.query<Change>(
    `
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
    `,
    [
      detectedAt,
      lookbackHours
    ]
  );

  return result.rows;
}