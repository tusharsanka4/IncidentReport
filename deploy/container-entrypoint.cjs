// Compose supplies database fields separately so passwords containing URL
// characters can be encoded safely instead of interpolated into a raw URI.
if (!process.env.DATABASE_URL) {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
    console.error("Set CONTAINER_DATABASE_URL or the PostgreSQL user, password, and database.");
    process.exit(1);
  }
  const address = new URL("postgresql://postgres:5432");
  address.username = encodeURIComponent(POSTGRES_USER);
  address.password = encodeURIComponent(POSTGRES_PASSWORD);
  address.pathname = `/${encodeURIComponent(POSTGRES_DB)}`;
  process.env.DATABASE_URL = address.toString();
}

const path = require("node:path");
const target = process.argv[2];
if (!target) {
  console.error("A compiled application entrypoint is required.");
  process.exit(1);
}

// Run in this process so Docker's init forwards termination signals to the app.
process.argv = [process.execPath, path.resolve(target), ...process.argv.slice(3)];
require(path.resolve(target));
