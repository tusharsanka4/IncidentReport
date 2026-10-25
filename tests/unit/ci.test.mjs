import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseDocument } from "yaml";

const source = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const document = parseDocument(source);
const workflow = document.toJS();
const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const steps = Object.values(workflow.jobs).flatMap(job => job.steps);

test("CI YAML is valid and covers pushes, pull requests, and manual execution", () => {
  assert.deepEqual(document.errors, []);
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push", "workflow_dispatch"]);
  assert.equal(workflow.on.pull_request_target, undefined);
});

test("CI has read-only permissions, immutable action pins, and no persisted checkout credentials", () => {
  assert.deepEqual(workflow.permissions, { contents: "read" });
  for (const step of steps.filter(item => item.uses)) {
    assert.match(step.uses, /^actions\/(checkout|setup-node)@[a-f0-9]{40}$/);
    if (step.uses.startsWith("actions/checkout@")) assert.equal(step.with["persist-credentials"], false);
  }
  assert.doesNotMatch(source, /secrets\.|packages:\s*write|id-token:\s*write/);
});

test("every test job installs locked dependencies and uses the image's Node major", () => {
  for (const name of ["checks", "integration"]) {
    const job = workflow.jobs[name];
    assert.equal(job["runs-on"], "ubuntu-24.04");
    assert.ok(job.steps.some(step => step.run === "npm ci"));
    const setup = job.steps.find(step => step.uses?.startsWith("actions/setup-node@"));
    assert.equal(setup.with["node-version"], "24");
    assert.equal(setup.with.cache, "npm");
    assert.equal(setup.with["cache-dependency-path"], "package-lock.json");
    assert.ok(job["timeout-minutes"] > 0);
  }
});

test("CI invokes real repository scripts and does not mask failed checks", () => {
  const commands = steps.flatMap(step => step.run?.match(/npm run ([a-z0-9:\-]+)/g) ?? []);
  for (const command of commands) assert.ok(manifest.scripts[command.slice("npm run ".length)]);
  for (const name of ["build", "build:runtime", "test:ranking", "test:agent", "test:model", "test:runtime",
    "test:frontend", "test:database", "test:kubernetes", "test:ci", "test:temporal", "test:api", "test:e2e", "test:reliability"]) {
    assert.ok(commands.includes(`npm run ${name}`), `CI omitted ${name}`);
  }
  for (const job of Object.values(workflow.jobs)) {
    assert.notEqual(job["continue-on-error"], true);
    for (const step of job.steps) {
      assert.notEqual(step["continue-on-error"], true);
      assert.doesNotMatch(step.run ?? "", /\|\|\s*true|--suppress-exit-code|--if-present/);
    }
  }
});

test("CI has no live model keys, publishing, or cloud deployment side effects", () => {
  assert.equal(workflow.env.GROQ_API_KEY, "");
  assert.equal(workflow.env.GOOGLE_API_KEY, "");
  assert.doesNotMatch(source, /npm run model:check|docker push|kubectl apply|postman .*push|doctl /);
  assert.deepEqual(workflow.jobs.image.needs, ["checks", "integration"]);
  assert.ok(workflow.jobs.image.steps.some(step => step.run === "docker build --tag incidentreport-app:ci ."));
});

test("manifest tooling download is versioned and checksum verified", () => {
  const install = workflow.jobs.checks.steps.find(step => step.name.startsWith("Install pinned kubectl"));
  assert.match(install.run, /https:\/\/dl.k8s.io\/release\/v1\.34\.1\//);
  assert.match(install.run, /kubectl\.sha256/);
  assert.match(install.run, /sha256sum --check/);
  assert.match(install.run, /set -euo pipefail/);
  assert.equal(workflow.concurrency["cancel-in-progress"], true);
});

test("integration exercises migration concurrency on a disposable real PostgreSQL service", () => {
  const job = workflow.jobs.integration;
  assert.equal(job.services.postgres.image, "postgres:17-alpine");
  assert.equal(job.services.postgres.env.POSTGRES_DB, "manifest_verification");
  assert.match(job.services.postgres.options, /pg_isready/);
  const migration = job.steps.find(step => step.run === "npm run test:database");
  const target = new URL(migration.env.TEST_DATABASE_URL);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/manifest_verification");
  assert.equal(target.username, job.services.postgres.env.POSTGRES_USER);
});
