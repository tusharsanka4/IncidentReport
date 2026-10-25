import { createServer } from "node:http";
import type { WorkerStatus } from "@temporalio/worker";

export function createWorkerHealthServer(dependencies: {
  status: () => Pick<WorkerStatus, "runState" | "workflowPollerState" | "activityPollerState">;
  checkDatabase: () => Promise<unknown>;
  checkTemporal: () => Promise<unknown>;
}) {
  return createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.method !== "GET" || !["/health", "/ready"].includes(request.url ?? "")) {
      response.writeHead(404).end(JSON.stringify({ status: "not_found" }));
      return;
    }
    if (request.url === "/health") {
      response.end(JSON.stringify({ status: "healthy" }));
      return;
    }
    try {
      const status = dependencies.status();
      if (status.runState !== "RUNNING" || status.workflowPollerState !== "POLLING" ||
          status.activityPollerState !== "POLLING") throw new Error("Worker is not polling");
      await Promise.all([dependencies.checkDatabase(), dependencies.checkTemporal()]);
      response.end(JSON.stringify({ status: "ready" }));
    } catch {
      response.writeHead(503).end(JSON.stringify({ status: "not_ready" }));
    }
  });
}
