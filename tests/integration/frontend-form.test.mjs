import assert from "node:assert/strict";
import test from "node:test";
import { incidentBody } from "../../services/web/public/form.mjs";
import { createTemporalDatabase } from "../helpers/temporal-database.js";

test("browser-normalized sample form creates an incident through the real API", async () => {
  const fixture = await createTemporalDatabase();
  const { buildApplication } = await import("../../services/api/src/app.js");
  const app = buildApplication();
  try {
    const fields = {
      incident_id: "INC-FRONTEND-SAMPLE", service: "order-service", environment: "production",
      symptom: "Order failures increased", detected_at: "2026-08-04T08:15"
    };
    const invalid = await app.inject({
      method: "POST", url: "/api/incidents", payload: { ...fields, detected_at: `${fields.detected_at}Z` }
    });
    assert.equal(invalid.statusCode, 400, "The original minute-only timestamp reproduces the error");

    const created = await app.inject({ method: "POST", url: "/api/incidents", payload: incidentBody(fields) });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().data.detected_at, "2026-08-04T08:15:00.000Z");
    assert.equal(created.json().data.id, fields.incident_id);
  } finally {
    await app.close();
    await fixture.close();
  }
});
