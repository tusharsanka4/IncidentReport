import assert from "node:assert/strict";
import test from "node:test";

import { rankCandidateChanges } from "../../services/shared/src/candidate-ranking.js";

import type { Change } from "../../services/shared/src/change.types.js";
import type {
  ResourceRelationship
} from "../../services/shared/src/architecture.types.js";

const incident = {
  id: "INC-1042",
  service: "order-service",
  environment: "production",
  detected_at: "2026-08-04T08:15:00Z"
};

const changes: Change[] = [
  {
    id: "CHG-201",
    resource_id: "order-service",
    change_type: "deployment",
    description: "Deployed order-service v2.4.1",
    version: "v2.4.1",
    environment: "production",
    deployed_at: new Date("2026-08-04T08:05:00Z"),
    source: "gh-actions/deploy",
    metadata: {},
    created_at: new Date()
  },
  {
    id: "CHG-202",
    resource_id: "redis-cache",
    change_type: "configuration",
    description: "Reduced Redis timeout",
    version: null,
    environment: "production",
    deployed_at: new Date("2026-08-04T07:55:00Z"),
    source: "manual",
    metadata: {},
    created_at: new Date()
  },
  {
    id: "CHG-203",
    resource_id: "catalog-service",
    change_type: "deployment",
    description: "Deployed catalog-service",
    version: "v1.9.0",
    environment: "production",
    deployed_at: new Date("2026-08-04T06:30:00Z"),
    source: "gh-actions/deploy",
    metadata: {},
    created_at: new Date()
  },
  {
    id: "CHG-204",
    resource_id: "order-service",
    change_type: "deployment",
    description: "Deployed order-service to staging",
    version: "v2.5.0-rc1",
    environment: "staging",
    deployed_at: new Date("2026-08-04T08:10:00Z"),
    source: "gh-actions/deploy",
    metadata: {},
    created_at: new Date()
  }
];

const relationships: ResourceRelationship[] = [
  {
    source: "order-service",
    target: "redis-cache",
    type: "DEPENDS_ON"
  }
];

test("ranks candidate changes in expected order", () => {
  const candidates = rankCandidateChanges(
    incident,
    changes,
    relationships
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate.change.id),
    [
      "CHG-201",
      "CHG-202",
      "CHG-204",
      "CHG-203"
    ]
  );
});

test("calculates expected raw scores", () => {
  const candidates = rankCandidateChanges(
    incident,
    changes,
    relationships
  );

  const scores = Object.fromEntries(
    candidates.map((candidate) => [
      candidate.change.id,
      candidate.raw_score
    ])
  );

  assert.equal(scores["CHG-201"], 85);
  assert.equal(scores["CHG-202"], 58);
  assert.equal(scores["CHG-204"], 55);
  assert.equal(scores["CHG-203"], -5);
});

test("calculates dependency distances", () => {
  const candidates = rankCandidateChanges(
    incident,
    changes,
    relationships
  );

  const distances = Object.fromEntries(
    candidates.map((candidate) => [
      candidate.change.id,
      candidate.dependency_distance
    ])
  );

  assert.equal(distances["CHG-201"], 0);
  assert.equal(distances["CHG-202"], 1);
  assert.equal(distances["CHG-204"], 0);
  assert.equal(distances["CHG-203"], null);
});

test("penalizes a change from a different environment", () => {
  const candidates = rankCandidateChanges(
    incident,
    changes,
    relationships
  );

  const stagingCandidate = candidates.find(
    (candidate) => candidate.change.id === "CHG-204"
  );

  assert.ok(stagingCandidate);

  assert.ok(
    stagingCandidate.evidence.some(
      (item) =>
        item.type === "DIFFERENT_ENVIRONMENT" &&
        item.score === -20
    )
  );
});