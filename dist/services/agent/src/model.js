"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisModel = void 0;
const google_genai_1 = require("@langchain/google-genai");
const analysis_output_js_1 = require("./analysis-output.js");
exports.analysisModel = new google_genai_1.ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2
}).withStructuredOutput(analysis_output_js_1.AnalysisOutputSchema);
