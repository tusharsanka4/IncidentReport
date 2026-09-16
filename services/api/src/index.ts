import "dotenv/config";

import { buildApplication } from "./app.js";
import { database } from "../../shared/src/database.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildApplication();

async function startServer(): Promise<void> {
  try {
    await app.listen({
      port,
      host
    });

    app.log.info(`API listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info(
    {
      signal
    },
    "Shutting down API"
  );

  try {
    await app.close();
    await database.end();

    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();