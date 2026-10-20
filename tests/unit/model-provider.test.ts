import assert from "node:assert/strict";
import test from "node:test";

import { createAnalysisModel } from "../../services/agent/src/model.js";

const output = {
  probable_change_id: "CHG-201", confidence_score: 0.87,
  reasoning_summary: "The deployment directly changed the incident service.",
  evidence: [{ type: "DIRECT_RESOURCE_MATCH", description: "Same service", score: null }],
  recommended_action: {
    type: "ROLLBACK", resource: "order-service", from_version: "v2.4.1", to_version: "v2.4.0",
    execution: "HUMAN_APPROVAL_REQUIRED", requires_approval: true
  },
  analysis_status: "AWAITING_APPROVAL"
};

function response(content: unknown) {
  return new Response(JSON.stringify({
    id: "test-completion", object: "chat.completion", created: 0, model: "openai/gpt-oss-120b",
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
  }), { headers: { "content-type": "application/json" } });
}

test("Groq is the default and uses strict schema output without a live API call", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "openai/gpt-oss-120b");
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.max_completion_tokens, 2048);
    assert.equal(body.reasoning_effort, "low");
    assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
    return response(output);
  };
  const model = createAnalysisModel({ GROQ_API_KEY: "test-key" }, fakeFetch);
  const result = await model.invoke([{ role: "user", content: "Test incident evidence" }]);
  assert.equal(calls, 1);
  assert.equal(result.probable_change_id, "CHG-201");
  assert.equal(result.evidence[0].score, undefined);
  assert.equal(result.recommended_action.requires_approval, true);
});

test("Groq normalizes nullable versions for a manual recommendation", async () => {
  const model = createAnalysisModel({ GROQ_API_KEY: "test-key", GROQ_MODEL: "openai/gpt-oss-20b" }, async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).model, "openai/gpt-oss-20b");
    return response({ ...output, probable_change_id: null, analysis_status: "MANUAL_INVESTIGATION",
      recommended_action: { ...output.recommended_action, type: "MANUAL_INVESTIGATION", from_version: null, to_version: null } });
  });
  const result = await model.invoke("Test evidence");
  assert.equal(result.recommended_action.from_version, undefined);
  assert.equal(result.recommended_action.to_version, undefined);
});

test("the Groq HTTP base URL can point to an isolated local simulation", async () => {
  const model = createAnalysisModel({
    GROQ_API_KEY: "test-key", GROQ_BASE_URL: "http://localhost:4900/groq"
  }, async url => {
    assert.equal(String(url), "http://localhost:4900/groq/openai/v1/chat/completions");
    return response(output);
  });
  assert.equal((await model.invoke("Test evidence")).probable_change_id, "CHG-201");
});

test("invalid Groq responses fail the existing domain schema", async () => {
  const model = createAnalysisModel({ GROQ_API_KEY: "test-key" }, async () => response({ ...output, confidence_score: 5 }));
  await assert.rejects(model.invoke("Test evidence"));
});

test("provider configuration fails clearly without exposing secrets", () => {
  assert.throws(() => createAnalysisModel({}), /GROQ_API_KEY is required/);
  assert.throws(() => createAnalysisModel({ LLM_PROVIDER: "gemini" }), /GOOGLE_API_KEY is required/);
  assert.throws(() => createAnalysisModel({ LLM_PROVIDER: "unknown", GROQ_API_KEY: "private-value" }), /must be groq or gemini/);
  assert.ok(createAnalysisModel({ LLM_PROVIDER: "gemini", GOOGLE_API_KEY: "test-key" }));
});

test("Groq quota errors are not multiplied by hidden SDK retries", async () => {
  let calls = 0;
  const model = createAnalysisModel({ GROQ_API_KEY: "test-key" }, async () => {
    calls++;
    return new Response(JSON.stringify({ error: { message: "Rate limit exceeded", type: "rate_limit_error" } }), {
      status: 429, headers: { "content-type": "application/json", "retry-after": "60" }
    });
  });
  await assert.rejects(model.invoke("Test evidence"));
  assert.equal(calls, 1);
});
