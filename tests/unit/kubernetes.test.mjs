import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseAllDocuments } from "yaml";

const root = fileURLToPath(new URL("../../", import.meta.url));

function render(directory) {
  const output = execFileSync("kubectl", ["kustomize", directory], {
    cwd: root, encoding: "utf8", timeout: 30000
  });
  return parseAllDocuments(output).map(document => {
    assert.deepEqual(document.errors, []);
    return document.toJS();
  });
}

const base = render("deploy/kubernetes/base");
const demo = render("deploy/kubernetes/overlays/demo");
const jobs = render("deploy/kubernetes/jobs");
const find = (kind, name, resources = demo) => {
  const resource = resources.find(item => item.kind === kind && item.metadata.name === name);
  assert.ok(resource, `Missing ${kind}/${name}`);
  return resource;
};
const workloads = demo.filter(item => ["Deployment", "StatefulSet"].includes(item.kind));
const databaseKeys = new Set(["POSTGRES_PASSWORD", "DATABASE_URL"]);

test("base, demo, and opt-in seed render without a cluster or real secrets", () => {
  assert.equal(base.length, 5);
  assert.equal(demo.length, 9);
  assert.equal(jobs.length, 1);
  for (const resource of [...demo, ...jobs]) {
    assert.notEqual(resource.kind, "Secret");
    if (resource.kind !== "Namespace") assert.equal(resource.metadata.namespace, "incidentreport");
  }
  assert.ok(!base.some(item => item.kind === "StatefulSet"));
  assert.ok(!demo.some(item => item.kind === "Job"));
});

test("every Service targets the intended pod labels and named port", () => {
  for (const service of demo.filter(item => item.kind === "Service")) {
    assert.ok(!service.spec.type || service.spec.type === "ClusterIP");
    const target = workloads.find(item => Object.entries(service.spec.selector).every(
      ([key, value]) => item.spec.template.metadata.labels[key] === value
    ));
    assert.ok(target, `Unmatched Service/${service.metadata.name}`);
    const ports = target.spec.template.spec.containers.flatMap(container => container.ports ?? []);
    for (const port of service.spec.ports) assert.ok(ports.some(item => item.name === port.targetPort));
  }
  for (const resource of workloads) {
    for (const [key, value] of Object.entries(resource.spec.selector.matchLabels)) {
      assert.equal(resource.spec.template.metadata.labels[key], value);
    }
  }
});

test("every workload has non-root, bounded, least-privilege containers", () => {
  for (const resource of [...workloads, ...jobs]) {
    const pod = resource.spec.template.spec;
    assert.equal(pod.automountServiceAccountToken, false);
    assert.equal(pod.securityContext.runAsNonRoot, true);
    assert.equal(pod.securityContext.seccompProfile.type, "RuntimeDefault");
    for (const container of [...(pod.initContainers ?? []), ...pod.containers]) {
      assert.ok(container.resources.requests.cpu);
      assert.ok(container.resources.requests.memory);
      assert.ok(container.resources.limits.cpu);
      assert.ok(container.resources.limits.memory);
      assert.equal(container.securityContext.allowPrivilegeEscalation, false);
      assert.equal(container.securityContext.readOnlyRootFilesystem, true);
      assert.deepEqual(container.securityContext.capabilities.drop, ["ALL"]);
    }
  }
});

test("API liveness is independent of database readiness", () => {
  const api = find("Deployment", "incidentreport-api").spec.template.spec.containers[0];
  assert.equal(api.startupProbe.httpGet.path, "/health");
  assert.equal(api.livenessProbe.httpGet.path, "/health");
  assert.equal(api.readinessProbe.httpGet.path, "/ready");
  assert.ok(api.readinessProbe.timeoutSeconds);
});

test("both application pods migrate before starting and use the same image", () => {
  for (const name of ["incidentreport-api", "incidentreport-worker"]) {
    const pod = find("Deployment", name).spec.template.spec;
    assert.equal(pod.initContainers.length, 1);
    assert.deepEqual(pod.initContainers[0].args, ["dist/database/migrate.js"]);
    assert.equal(pod.initContainers[0].image, pod.containers[0].image);
    assert.equal(pod.containers[0].image, "incidentreport-app:local");
    assert.ok(pod.containers[0].args[0].endsWith(".js"));
  }
});

test("only the worker receives model secret references", () => {
  for (const resource of [...workloads, ...jobs]) {
    const pod = resource.spec.template.spec;
    for (const container of [...(pod.initContainers ?? []), ...pod.containers]) {
      assert.ok(!(container.envFrom ?? []).some(item => item.secretRef));
      const secrets = (container.env ?? []).filter(item => item.valueFrom?.secretKeyRef);
      for (const item of secrets) {
        assert.equal(item.valueFrom.secretKeyRef.name, "incidentreport-secrets");
        assert.equal(item.value, undefined);
        if (container.name !== "worker") assert.ok(databaseKeys.has(item.valueFrom.secretKeyRef.key));
      }
      if (container.name === "worker") {
        assert.ok(secrets.some(item => item.name === "GROQ_API_KEY"));
        assert.ok(secrets.some(item => item.name === "GOOGLE_API_KEY"));
      }
    }
  }
});

test("configuration references exist and do not embed model keys or passwords", () => {
  const config = find("ConfigMap", "incidentreport-config").data;
  assert.equal(config.TEMPORAL_ADDRESS, "temporal:7233");
  assert.equal(config.TEMPORAL_TASK_QUEUE, "incidentreport-kubernetes");
  assert.equal(config.POSTGRES_DB, "incidentreport");
  for (const key of Object.keys(config)) assert.doesNotMatch(key, /PASSWORD|API_KEY|DATABASE_URL/);
  for (const resource of [...workloads, ...jobs]) {
    const pod = resource.spec.template.spec;
    for (const container of [...(pod.initContainers ?? []), ...pod.containers]) {
      for (const source of container.envFrom ?? []) assert.equal(source.configMapRef.name, "incidentreport-config");
      for (const item of container.env ?? []) {
        const reference = item.valueFrom?.configMapKeyRef;
        if (reference) assert.ok(Object.hasOwn(config, reference.key));
      }
    }
  }
});

test("databases retain separate persistent volumes and cannot roll onto shared SQLite", () => {
  for (const name of ["postgres", "temporal"]) {
    const stateful = find("StatefulSet", name);
    assert.equal(stateful.spec.replicas, 1);
    assert.equal(stateful.spec.serviceName, name);
    const claim = stateful.spec.volumeClaimTemplates[0];
    assert.deepEqual(claim.spec.accessModes, ["ReadWriteOnce"]);
    assert.ok(claim.spec.resources.requests.storage);
    assert.ok(stateful.spec.template.spec.containers[0].volumeMounts.some(item => item.name === claim.metadata.name));
    assert.equal(find("Service", name).spec.clusterIP, "None");
  }
  const temporal = find("StatefulSet", "temporal").spec.template.spec;
  assert.ok(temporal.containers[0].args.includes("/data/temporal.db"));
  assert.ok(temporal.terminationGracePeriodSeconds >= 60);
});

test("worker keeps MCP as its subprocess without pretending to expose HTTP health", () => {
  const worker = find("Deployment", "incidentreport-worker").spec.template.spec;
  assert.equal(worker.containers.length, 1);
  assert.deepEqual(worker.containers[0].args, ["dist/services/temporal-worker/src/worker.js"]);
  assert.equal(worker.containers[0].readinessProbe, undefined);
  assert.ok(worker.terminationGracePeriodSeconds >= 60);
  assert.ok(!demo.some(item => /mcp/i.test(item.metadata.name)));
});

test("seeding is explicit, bounded, and targets the existing compiled seed command", () => {
  const job = find("Job", "incidentreport-seed", jobs);
  assert.equal(job.spec.backoffLimit, 2);
  assert.equal(job.spec.activeDeadlineSeconds, 300);
  assert.equal(job.spec.template.spec.restartPolicy, "Never");
  assert.deepEqual(job.spec.template.spec.containers[0].args, ["dist/database/seeds/seed.js"]);
  const example = readFileSync(path.join(root, "deploy/kubernetes/.env.example"), "utf8");
  assert.match(example, /^POSTGRES_PASSWORD=/m);
  assert.match(example, /^GROQ_API_KEY=$/m);
});
