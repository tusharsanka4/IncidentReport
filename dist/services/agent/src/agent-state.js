"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentState = void 0;
const langgraph_1 = require("@langchain/langgraph");
const zod_1 = require("zod");
const analysis_output_js_1 = require("./analysis-output.js");
const UnknownObjectSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
exports.AgentState = new langgraph_1.StateSchema({
    incidentId: zod_1.z.string().min(1),
    incident: UnknownObjectSchema
        .nullable()
        .default(null),
    candidates: zod_1.z
        .array(UnknownObjectSchema)
        .default(() => []),
    analysis: analysis_output_js_1.AnalysisOutputSchema
        .nullable()
        .default(null),
    status: zod_1.z
        .enum([
        "STARTED",
        "INCIDENT_LOADED",
        "CANDIDATES_LOADED",
        "ANALYSING",
        "RETRYING",
        "ANALYSIS_COMPLETE",
        "AWAITING_APPROVAL",
        "MANUAL_INVESTIGATION",
        "FAILED"
    ])
        .default("STARTED"),
    error: zod_1.z
        .string()
        .nullable()
        .default(null),
    retryCount: zod_1.z
        .number()
        .int()
        .min(0)
        .default(0),
    maxRetries: zod_1.z
        .number()
        .int()
        .min(0)
        .default(2)
});
