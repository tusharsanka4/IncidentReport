import "dotenv/config";
import type {
  ChangeSeedInput
} from "../../services/shared/src/change.types.js";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

import type { PoolClient } from "pg";
import type {
  Resource,
  ResourceRelationship
} from "../../services/shared/src/architecture.types.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const database = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function readJsonFile<T>(filePath: string): Promise<T> {
  const absolutePath = resolve(process.cwd(), filePath);
  const contents = await readFile(absolutePath, "utf-8");

  return JSON.parse(contents) as T;
}

async function seedResources(
  client: PoolClient,
  resources: Resource[]
): Promise<void> {
  for (const resource of resources) {
    await client.query(
      `
        INSERT INTO resources (
          id,
          name,
          resource_type,
          environment,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          resource_type = EXCLUDED.resource_type,
          environment = EXCLUDED.environment,
          metadata = EXCLUDED.metadata
      `,
      [
        resource.id,
        resource.name,
        resource.type,
        resource.environment,
        resource.metadata ?? {}
      ]
    );
  }
}

async function seedRelationships(
  client: PoolClient,
  relationships: ResourceRelationship[]
): Promise<void> {
  for (const relationship of relationships) {
    await client.query(
      `
        INSERT INTO resource_relationships (
          source_resource_id,
          target_resource_id,
          relationship_type
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (
          source_resource_id,
          target_resource_id,
          relationship_type
        )
        DO NOTHING
      `,
      [
        relationship.source,
        relationship.target,
        relationship.type
      ]
    );
  }
}

async function seedChanges(
  client: PoolClient,
  changes: ChangeSeedInput[]
): Promise<void> {
  for (const change of changes) {
    await client.query(
      `
        INSERT INTO changes (
          id,
          resource_id,
          change_type,
          description,
          version,
          environment,
          deployed_at,
          source,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id)
        DO UPDATE SET
          resource_id = EXCLUDED.resource_id,
          change_type = EXCLUDED.change_type,
          description = EXCLUDED.description,
          version = EXCLUDED.version,
          environment = EXCLUDED.environment,
          deployed_at = EXCLUDED.deployed_at,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata
      `,
      [
        change.change_id,
        change.resource,
        change.type,
        change.description ?? null,
        change.version ?? null,
        change.environment,
        change.deployed_at,
        change.source ?? null,
        change.metadata ?? {}
      ]
    );
  }
}

async function seedDatabase(): Promise<void> {
  const client = await database.connect();

  try {
    const resources = await readJsonFile<Resource[]>(
      "sample-data/resources.json"
    );

    const relationships = await readJsonFile<ResourceRelationship[]>(
      "sample-data/dependencies.json"
    );

    const changes = await readJsonFile<ChangeSeedInput[]>(
      "sample-data/changes.json"
    );

    await client.query("BEGIN");

    console.log(`Loading ${resources.length} resources...`);
    await seedResources(client, resources);

    console.log(`Loading ${relationships.length} relationships...`);
    await seedRelationships(client, relationships);

    console.log(`Loading ${changes.length} changes...`);
    await seedChanges(client, changes);

    await client.query("COMMIT");

    console.log("Database seeded successfully.");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Database seed failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await database.end();
  }
}

seedDatabase().catch((error: unknown) => {
  console.error("Unexpected seed failure:", error);
  process.exitCode = 1;
});