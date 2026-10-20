import {
  ChatGoogleGenerativeAI
} from "@langchain/google-genai";

import {
  AnalysisOutputSchema,
  type AnalysisOutput
} from "./analysis-output.js";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { createGroqModel } from "./groq-model.js";

interface AnalysisModel {
  invoke(input: BaseLanguageModelInput): Promise<AnalysisOutput>;
}

export function createAnalysisModel(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImplementation?: typeof fetch
): AnalysisModel {
  const provider = (environment.LLM_PROVIDER ?? "groq").trim().toLowerCase();

  if (provider === "groq") {
    const apiKey = environment.GROQ_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is required when LLM_PROVIDER=groq");
    }

    return createGroqModel(
      apiKey,
      environment.GROQ_MODEL?.trim() || "openai/gpt-oss-120b",
      fetchImplementation,
      environment.GROQ_BASE_URL?.trim() || undefined
    );
  }

  if (provider === "gemini") {
    const apiKey = environment.GOOGLE_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is required when LLM_PROVIDER=gemini");
    }
    return new ChatGoogleGenerativeAI({
      apiKey,
      model: environment.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
      temperature: 0,
      maxRetries: 2
    }).withStructuredOutput(AnalysisOutputSchema);
  }

  throw new Error("LLM_PROVIDER must be groq or gemini");
}

let configuredModel: AnalysisModel | undefined;

// Lazy construction keeps API startup and offline tests independent of keys.
export const analysisModel: AnalysisModel = {
  async invoke(input) {
    configuredModel ??= createAnalysisModel();
    return configuredModel.invoke(input);
  }
};
