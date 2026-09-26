"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeMcpTool = invokeMcpTool;
require("dotenv/config");
const node_path_1 = __importDefault(require("node:path"));
const mcp_adapters_1 = require("@langchain/mcp-adapters");
const environment = Object.fromEntries(Object.entries(process.env).filter((entry) => entry[1] !== undefined));
const tsxCliPath = node_path_1.default.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const mcpServerPath = node_path_1.default.join(process.cwd(), "services", "mcp-server", "src", "index.ts");
const mcpClient = new mcp_adapters_1.MultiServerMCPClient({
    manifest: {
        transport: "stdio",
        command: process.execPath,
        args: [
            tsxCliPath,
            mcpServerPath
        ],
        env: environment
    }
});
let loadedTools = null;
async function getTools() {
    if (!loadedTools) {
        loadedTools = await mcpClient.getTools();
    }
    return loadedTools;
}
function parseToolResult(result) {
    if (typeof result === "string") {
        return JSON.parse(result);
    }
    if (result !== null &&
        typeof result === "object" &&
        "content" in result) {
        const content = result.content;
        if (typeof content === "string") {
            return JSON.parse(content);
        }
        if (Array.isArray(content)) {
            const textContent = content.find((item) => item !== null &&
                typeof item === "object" &&
                "type" in item &&
                item.type === "text" &&
                "text" in item &&
                typeof item.text === "string");
            if (textContent) {
                return JSON.parse(textContent.text);
            }
        }
    }
    return result;
}
async function invokeMcpTool(toolName, input) {
    const tools = await getTools();
    const tool = tools.find(candidate => candidate.name === toolName);
    if (!tool) {
        throw new Error(`MCP tool "${toolName}" is not available`);
    }
    const result = await tool.invoke(input);
    return parseToolResult(result);
}
