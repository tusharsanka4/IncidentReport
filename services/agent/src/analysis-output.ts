import { z } from "zod";

export const EvidenceSchema = z.object({
  type: z.string().min(1),

  description: z.string().min(1),

  score: z.number().optional()
});

export const RecommendedActionSchema = z.object({
  type: z.enum([
    "ROLLBACK",
    "CONFIGURATION_REVERT",
    "RESTART",
    "MANUAL_INVESTIGATION"
  ]),

  resource: z.string().min(1),

  from_version: z.string().optional(),

  to_version: z.string().optional(),

  execution: z.literal(
    "HUMAN_APPROVAL_REQUIRED"
  ),

  requires_approval: z.literal(true)
});

export const AnalysisOutputSchema = z.object({
  probable_change_id: z
    .string()
    .min(1)
    .nullable(),

  confidence_score: z
    .number()
    .min(0)
    .max(1),

  reasoning_summary: z
    .string()
    .min(1)
    .max(2000),

  evidence: z
    .array(EvidenceSchema)
    .min(1),

  recommended_action:
    RecommendedActionSchema,

  analysis_status: z.enum([
    "AWAITING_APPROVAL",
    "MANUAL_INVESTIGATION"
  ])
});

export type AnalysisOutput = z.infer<
  typeof AnalysisOutputSchema
>;