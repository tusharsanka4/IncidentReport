import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { mcpProcessArguments } from "../../services/agent/src/helpers/mcp-process.js";

test("compiled workers launch compiled MCP with plain Node", () => {
  const root = path.resolve("dist/services");
  const result = mcpProcessArguments(path.join(root, "agent/src/helpers/mcp-process.js"));
  assert.deepEqual(result, [path.join(root, "mcp-server/src/index.js")]);
});

test("source workers retain the local tsx launch without hard-coded root paths", () => {
  const root = path.resolve("services");
  const result = mcpProcessArguments(path.join(root, "agent/src/helpers/mcp-process.ts"));
  assert.match(result[0], /tsx.*cli\.mjs$/);
  assert.equal(result[1], path.join(root, "mcp-server/src/index.ts"));
});
