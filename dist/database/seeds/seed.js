"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env");
}
const database = new Pool({
    connectionString: process.env.DATABASE_URL
});
async function readJsonFile(filePath) {
    const absolutePath = (0, node_path_1.resolve)(process.cwd(), filePath);
    const contents = await (0, promises_1.readFile)(absolutePath, "utf-8");
    return JSON.parse(contents);
}
async function seedResources(client, resources) {
    for (const resource of resources) {
        await client.query(`
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
      `, [
            resource.id,
            resource.name,
            resource.type,
            resource.environment,
            resource.metadata ?? {}
        ]);
    }
}
async function seedRelationships(client, relationships) {
    for (const relationship of relationships) {
        await client.query(`
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
      `, [
            relationship.source,
            relationship.target,
            relationship.type
        ]);
    }
}
async function seedChanges(client, changes) {
    for (const change of changes) {
        await client.query(`
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
      `, [
            change.change_id,
            change.resource,
            change.type,
            change.description ?? null,
            change.version ?? null,
            change.environment,
            change.deployed_at,
            change.source ?? null,
            change.metadata ?? {}
        ]);
    }
}
async function seedDatabase() {
    const client = await database.connect();
    try {
        const resources = await readJsonFile("sample-data/resources.json");
        const relationships = await readJsonFile("sample-data/dependencies.json");
        const changes = await readJsonFile("sample-data/changes.json");
        await client.query("BEGIN");
        console.log(`Loading ${resources.length} resources...`);
        await seedResources(client, resources);
        console.log(`Loading ${relationships.length} relationships...`);
        await seedRelationships(client, relationships);
        console.log(`Loading ${changes.length} changes...`);
        await seedChanges(client, changes);
        await client.query("COMMIT");
        console.log("Database seeded successfully.");
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("Database seed failed:", error);
        process.exitCode = 1;
    }
    finally {
        client.release();
        await database.end();
    }
}
seedDatabase().catch((error) => {
    console.error("Unexpected seed failure:", error);
    process.exitCode = 1;
});
