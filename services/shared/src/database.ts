import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const database = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Each serverless instance has its own pool; use a provider's pooled URL.
  max: process.env.VERCEL === "1" ? 2 : 10,
  connectionTimeoutMillis: 3000,
  query_timeout: 10000,
  idleTimeoutMillis: 30000
});

database.on("error", () => {
  // Idle sockets can fail during a database restart; do not crash the process
  // or log connection credentials. Subsequent requests can acquire new clients.
  console.error("Database idle connection lost; requests will reconnect");
});

export async function checkDatabaseHealth(): Promise<unknown> {
  // pg supports this per-query option; @types/pg exposes only the pool option.
  const query: pg.QueryConfig & { query_timeout: number } = {
    text: "SELECT 1", query_timeout: 2000
  };
  return database.query(query);
}
