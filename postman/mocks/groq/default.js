// Local stand-in for the documented Groq chat response shape. The Postman
// owner lookup was skipped because the CLI is signed out. Never deploy this
// as the application: only the upstream HTTP model call is simulated.
const http = require("node:http");

function reply(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  if (req.method !== "POST" || req.url.split("?")[0] !== "/openai/v1/chat/completions") {
    return reply(res, 501, { error: { message: "Endpoint not modeled" } });
  }

  try {
    const body = req.body;
    if (!body?.model || body.response_format?.json_schema?.strict !== true) {
      return reply(res, 400, { error: { message: "Expected a model and strict JSON schema" } });
    }
    const message = body.messages.find(item => item.role === "user");
    const prompt = JSON.parse(message.content);
    if (prompt.incident.symptom.includes("[model-unavailable]")) {
      return reply(res, 503, { error: { message: "Simulated provider unavailable", type: "server_error" } });
    }
    const candidate = prompt.ranked_candidates[0];
    const change = candidate.change;
    const analysis = {
      probable_change_id: change.id,
      confidence_score: prompt.incident.symptom.includes("[invalid-output]") ? 2
        : prompt.incident.symptom.includes("[low-confidence]") ? 0.3 : 0.87,
      reasoning_summary: "The highest-ranked deployment directly changed the affected service.",
      evidence: candidate.evidence,
      recommended_action: {
        type: "ROLLBACK", resource: change.resource_id,
        from_version: change.version, to_version: change.metadata.previous_version,
        execution: "HUMAN_APPROVAL_REQUIRED", requires_approval: true
      },
      analysis_status: "AWAITING_APPROVAL"
    };

    reply(res, 200, {
      id: `container-test-${prompt.incident.incident_id}`,
      object: "chat.completion", created: Math.floor(Date.now() / 1000), model: body.model,
      choices: [{ index: 0, finish_reason: "stop", message: {
        role: "assistant", content: JSON.stringify(analysis)
      } }],
      usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 }
    });
  } catch {
    reply(res, 400, { error: { message: "Expected the incident-analysis prompt and ranked evidence" } });
  }
}).listen(process.env.PORT || 4901);
