import {
  ChatGoogleGenerativeAI
} from "@langchain/google-genai";

import {
  AnalysisOutputSchema
} from "./analysis-output.js";

export const analysisModel =
  new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2
  }).withStructuredOutput(
    AnalysisOutputSchema
  );