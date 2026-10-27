import type { IncomingMessage, ServerResponse } from "node:http";

import { buildApplication } from "../services/api/src/app.js";

// Reuse connections within a warm function. Temporal owns background work;
// this handler only accepts requests and never starts a worker or HTTP listener.
const app = buildApplication();
const ready = app.ready();

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  await ready;
  app.server.emit("request", request, response);
}
