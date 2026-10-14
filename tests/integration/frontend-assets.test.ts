import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("demo assets are served without changing the API routes", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:1/test";
  const { buildApplication } = await import("../../services/api/src/app.js");
  const app = buildApplication();
  try {
    const page = await app.inject({ method: "GET", url: "/" });
    assert.equal(page.statusCode, 200);
    assert.match(page.body, /From incident to resolution/);
    assert.match(page.headers["content-type"]!, /text\/html/);
    assert.match(page.headers["content-security-policy"]!, /script-src 'self'/);
    const ids = new Set([...page.body.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
    for (const filename of ["app.mjs", "view.mjs"]) {
      const source = await readFile(`services/web/public/${filename}`, "utf-8");
      for (const match of source.matchAll(/element\("([^"]+)"\)/g)) {
        assert.ok(ids.has(match[1]), `Missing HTML element ${match[1]}`);
      }
    }
    for (const filename of ["styles.css", "app.mjs", "view.mjs", "state.mjs", "api.mjs", "form.mjs"]) {
      const response = await app.inject({ method: "GET", url: `/demo/${filename}` });
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers["cache-control"], "no-store");
    }
    assert.equal((await app.inject({ method: "GET", url: "/health" })).statusCode, 200);
    const missing = await app.inject({ method: "GET", url: "/demo/not-an-asset" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, "ROUTE_NOT_FOUND");
  } finally {
    await app.close();
  }
});
