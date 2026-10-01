"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const graph_js_1 = require("./graph.js");
async function run() {
    const incidentId = process.argv[2];
    if (!incidentId) {
        console.error("Usage: npm run agent -- <incident-id>");
        process.exitCode = 1;
        return;
    }
    console.error(`Starting analysis for ${incidentId}...`);
    const result = await graph_js_1.incidentAnalysisGraph.invoke({
        incidentId,
        incident: null,
        candidates: [],
        analysis: null,
        status: "STARTED",
        error: null,
        retryCount: 0,
        maxRetries: 2
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.status === "FAILED") {
        process.exitCode = 1;
    }
}
run().catch((error) => {
    console.error("Incident analysis failed:", error);
    process.exitCode = 1;
});
