# Analysis model providers

The LangGraph nodes, prompt, persistence, approval rules, and Temporal workflow
remain unchanged. Only the analysis model boundary chooses the provider.

## Groq (default)

Set these in your private `.env`:

```dotenv
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

If `LLM_PROVIDER` is absent, it defaults to `groq`. A missing Groq key fails with
a clear configuration error; it does not silently switch to Gemini. The worker
loads `.env`; keys are never sent to the browser. The API does not call the model.

The adapter uses LangChain `ChatGroq`, strict JSON-schema output, low reasoning
effort, a 2,048-token completion ceiling, and a 60-second request timeout.
Strict schema represents optional scores/versions as nullable fields; the adapter
converts nulls to undefined and validates the existing domain schema. The node
independently verifies candidate IDs and approval requirements.

Leave `GROQ_BASE_URL` blank for normal Groq calls. Local container tests set it
to the Postman simulation origin plus `/groq`; LangChain adds
`/openai/v1/chat/completions` itself. Do not include `/openai/v1` in this setting.

Use a model supporting strict schema output, such as `openai/gpt-oss-120b` or
`openai/gpt-oss-20b`. Changing to an unsupported model can fail; the normal
manual-investigation fallback still applies. See
[Groq structured outputs](https://console.groq.com/docs/structured-outputs).

## Gemini alternative

```dotenv
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
```

Only the chosen provider's key is required. There is no automatic cross-provider
fallback, which avoids unexpected usage or changes to the analysis source.

## Apply a change

Stop and restart the Temporal worker after changing keys or provider settings:

```powershell
npm run temporal:worker
```

For the Docker worker, recreate it with the full-stack `up -d --build --wait`
command in [deployment.md](deployment.md) instead. A simple container restart
does not load changed `.env` values.

Create a fresh incident in the frontend and start analysis. Existing stored
analyses, including quota-error manual-investigation results, remain unchanged.
Model construction is lazy and cached for the worker's lifetime.

## Verification

```powershell
npm run test:model
npm run test:agent
npm run test:e2e
```

These use fake model/HTTP boundaries and do not need keys or consume quota.
To explicitly make one live synthetic request without database/workflow writes:

```powershell
npm run model:check
```

Groq remains subject to request and token quotas. Its adapter has no hidden SDK
retry loop: the existing graph owns bounded analysis retries. This change does
not implement project-wide throttling or a complete Retry-After policy; those
remain failure-hardening work. A 429 can still end in manual investigation and
does not mean the model evaluated the evidence successfully.
