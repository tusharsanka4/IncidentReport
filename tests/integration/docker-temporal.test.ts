import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";

import { Client, Connection } from "@temporalio/client";
import { bundleWorkflowCode, DefaultLogger, NativeConnection, Runtime, Worker } from "@temporalio/worker";

const execute = promisify(execFile);

test("Docker Temporal preserves an approval wait across container restart", { timeout: 90000 }, async () => {
  const container = "manifest-verify-temporal";
  const inspected = await execute("docker", [
    "inspect", "--format", '{{index .Config.Labels "com.docker.compose.project"}}', container
  ]);
  assert.equal(inspected.stdout.trim(), "manifest-verification");

  Runtime.install({ logger: new DefaultLogger("ERROR") });
  const address = "127.0.0.1:17233";
  const workflowId = `docker-persistence-${Date.now()}`;
  const taskQueue = workflowId;
  const workflowBundle = await bundleWorkflowCode({
    workflowsPath: require.resolve("../fixtures/docker-persistence.workflow")
  });
  let connection: Connection | undefined;
  let native: NativeConnection | undefined;

  try {
    connection = await Connection.connect({ address });
    native = await NativeConnection.connect({ address });
    const client = new Client({ connection });
    const worker = await Worker.create({ connection: native, taskQueue, workflowBundle });

    await worker.runUntil(async () => {
      const handle = await client.workflow.start("dockerPersistenceWorkflow", {
        workflowId, taskQueue, args: []
      });
      assert.equal(await handle.query("status"), "AWAITING_APPROVAL");
    });

    await native.close();
    native = undefined;
    await connection.close();
    connection = undefined;

    // Only restart the disposable, label-verified container; never the user's server.
    await execute("docker", ["restart", container]);

    const deadline = Date.now() + 45000;
    while (!connection && Date.now() < deadline) {
      try {
        connection = await Connection.connect({ address, connectTimeout: "2 seconds" });
      } catch {
        await setTimeout(250);
      }
    }
    assert.ok(connection, "Temporal did not recover after restart");

    native = await NativeConnection.connect({ address });
    const recoveredClient = new Client({ connection });
    const recoveredWorker = await Worker.create({ connection: native, taskQueue, workflowBundle });

    await recoveredWorker.runUntil(async () => {
      const handle = recoveredClient.workflow.getHandle(workflowId);
      assert.equal(await handle.query("status"), "AWAITING_APPROVAL");
      await handle.signal("approve", "APPROVED");
      assert.equal(await handle.result(), "APPROVED");
    });
  } finally {
    await native?.close();
    await connection?.close();
  }
});
