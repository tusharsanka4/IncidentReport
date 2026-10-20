import { ChatGroq } from "@langchain/groq";
import { z } from "zod";

import {
  AnalysisOutputSchema,
  EvidenceSchema,
  RecommendedActionSchema
} from "./analysis-output.js";

// Strict JSON schemas require every property. Null represents the optional
// fields on the wire; normalize it back to our existing domain contract.
const GroqOutputSchema = AnalysisOutputSchema.extend({
  evidence: z.array(EvidenceSchema.extend({ score: z.number().nullable() })),
  recommended_action: RecommendedActionSchema.extend({
    from_version: z.string().nullable(),
    to_version: z.string().nullable()
  })
});

export function createGroqModel(
  apiKey: string,
  model: string,
  fetchImplementation?: typeof fetch,
  baseUrl?: string
) {
  return new ChatGroq({
    apiKey,
    baseUrl,
    model,
    temperature: 0,
    maxTokens: 2048,
    reasoningEffort: "low",
    timeout: 60000,
    // LangGraph already owns bounded analysis retries; don't multiply them.
    maxRetries: 0,
    fetch: fetchImplementation
  }).withStructuredOutput(GroqOutputSchema, {
    name: "incident_analysis",
    method: "jsonSchema"
  }).pipe(output => AnalysisOutputSchema.parse({
    ...output,
    evidence: output.evidence.map(item => ({ ...item, score: item.score ?? undefined })),
    recommended_action: {
      ...output.recommended_action,
      from_version: output.recommended_action.from_version ?? undefined,
      to_version: output.recommended_action.to_version ?? undefined
    }
  }));
}
