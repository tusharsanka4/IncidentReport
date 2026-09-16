import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const database = new Pool({
  connectionString: process.env.DATABASE_URL
});