import "dotenv/config";
import { analysisModel } from "./model.js";

// One live request with synthetic evidence. No database or workflow writes.
async function checkModel(): Promise<void> {
  const result = await analysisModel.invoke([
    {
      role: "system",
      content: "Return a concise incident analysis using only the supplied evidence. Never execute remediation. Every recommendation requires HUMAN_APPROVAL_REQUIRED and requires_approval=true. Use MANUAL_INVESTIGATION if evidence is insufficient."
    },
    {
      role: "user",
      content: JSON.stringify({
        incident: { service: "order-service", symptom: "Failures increased after deployment" },
        change: { id: "CHECK-CHANGE", resource: "order-service", type: "deployment", version: "v2", previous_version: "v1" }
      })
    }
  ]);

  console.log(JSON.stringify({
    provider: process.env.LLM_PROVIDER ?? "groq",
    structuredOutput: "validated",
    action: result.recommended_action.type,
    requiresApproval: result.recommended_action.requires_approval
  }, null, 2));
}

checkModel().catch((error: unknown) => {
  // Don't dump SDK request objects or credentials on failures.
  console.error("Model check failed:", error instanceof Error ? error.message : "Unknown provider error");
  process.exitCode = 1;
});
