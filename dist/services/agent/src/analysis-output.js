"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisOutputSchema = exports.RecommendedActionSchema = exports.EvidenceSchema = void 0;
const zod_1 = require("zod");
exports.EvidenceSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    score: zod_1.z.number().optional()
});
exports.RecommendedActionSchema = zod_1.z.object({
    type: zod_1.z.enum([
        "ROLLBACK",
        "CONFIGURATION_REVERT",
        "RESTART",
        "MANUAL_INVESTIGATION"
    ]),
    resource: zod_1.z.string().min(1),
    from_version: zod_1.z.string().optional(),
    to_version: zod_1.z.string().optional(),
    execution: zod_1.z.literal("HUMAN_APPROVAL_REQUIRED"),
    requires_approval: zod_1.z.literal(true)
});
exports.AnalysisOutputSchema = zod_1.z.object({
    probable_change_id: zod_1.z
        .string()
        .min(1)
        .nullable(),
    confidence_score: zod_1.z
        .number()
        .min(0)
        .max(1),
    reasoning_summary: zod_1.z
        .string()
        .min(1)
        .max(2000),
    evidence: zod_1.z
        .array(exports.EvidenceSchema)
        .min(1),
    recommended_action: exports.RecommendedActionSchema,
    analysis_status: zod_1.z.enum([
        "AWAITING_APPROVAL",
        "MANUAL_INVESTIGATION"
    ])
});
