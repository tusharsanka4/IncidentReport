import {
  StateSchema
} from "@langchain/langgraph";
import { z } from "zod";

import {
  AnalysisOutputSchema
} from "./analysis-output.js";

const UnknownObjectSchema = z.record(
  z.string(),
  z.unknown()
);

export const AgentState = new StateSchema({
  incidentId: z.string().min(1),

  incident: UnknownObjectSchema
    .nullable()
    .default(null),

  candidates: z
    .array(UnknownObjectSchema)
    .default(() => []),

  analysis: AnalysisOutputSchema
    .nullable()
    .default(null),

  status: z
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

  error: z
    .string()
    .nullable()
    .default(null),

  retryCount: z
    .number()
    .int()
    .min(0)
    .default(0),

  maxRetries: z
    .number()
    .int()
    .min(0)
    .default(2)
});

export type IncidentAgentState =
  typeof AgentState.State;

export type IncidentAgentUpdate =
  typeof AgentState.Update;