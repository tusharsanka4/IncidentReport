import path from "node:path";

export function mcpProcessArguments(moduleFilename = __filename): string[] {
  if (moduleFilename.endsWith(".js")) {
    // dist/services/agent/src/helpers -> dist/services/mcp-server/src
    return [path.resolve(path.dirname(moduleFilename), "../../../mcp-server/src/index.js")];
  }

  // Source development keeps tsx; the production image contains neither tsx
  // nor TypeScript source files.
  return [
    require.resolve("tsx/cli"),
    path.resolve(path.dirname(moduleFilename), "../../../mcp-server/src/index.ts")
  ];
}
