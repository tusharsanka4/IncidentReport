import assert from "node:assert/strict";
import test from "node:test";
import fc from "fast-check";

import { traverseDependencies } from "../../services/shared/src/dependency-graph.js";
import { rankCandidateChanges } from "../../services/shared/src/candidate-ranking.js";
import type { Change } from "../../services/shared/src/change.types.js";
import type { ResourceRelationship } from "../../services/shared/src/architecture.types.js";

const incident = { id: "INC-PROPERTY", service: "0", environment: "production", detected_at: "2026-08-04T08:15:00Z" };
const change = (id: string, minutes = 10): Change => ({
  id, resource_id: id, change_type: "deployment", description: "Test deployment",
  version: "v2", environment: "production", metadata: { previous_version: "v1" },
  deployed_at: new Date(Date.parse(incident.detected_at) - minutes * 60000), created_at: new Date(0), source: "test"
});

test("300 cyclic graphs match an independent all-pairs shortest-path oracle in both directions", () => {
  fc.assert(fc.property(fc.array(fc.tuple(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 })), { maxLength: 40 }), edges => {
    const relationships: ResourceRelationship[] = edges.map(([source, target]) => ({ source: String(source), target: String(target), type: "DEPENDS_ON" }));
    const distances = Array.from({ length: 8 }, (_, from) => Array.from({ length: 8 }, (_, to) => from === to ? 0 : Infinity));
    for (const [from, to] of edges) distances[from]![to] = Math.min(distances[from]![to]!, 1);
    for (let via = 0; via < 8; via++) for (let from = 0; from < 8; from++) for (let to = 0; to < 8; to++) {
      distances[from]![to] = Math.min(distances[from]![to]!, distances[from]![via]! + distances[via]![to]!);
    }
    for (const direction of ["dependencies", "dependents"] as const) {
      const result = traverseDependencies("0", relationships, 7, direction);
      assert.equal(new Set(result.map(item => item.resource)).size, result.length);
      assert.ok(!result.some(item => item.resource === "0"));
      for (let target = 1; target < 8; target++) {
        const expected = direction === "dependencies" ? distances[0]![target]! : distances[target]![0]!;
        const actual = result.find(item => item.resource === String(target));
        assert.equal(actual?.distance ?? Infinity, expected);
        if (actual) {
          assert.equal(actual.path.length, actual.distance + 1);
          assert.equal(actual.path[0], "0");
          assert.equal(actual.path.at(-1), String(target));
        }
      }
    }
    const ranked = rankCandidateChanges(incident, Array.from({ length: 8 }, (_, id) => change(String(id))), relationships);
    for (const item of ranked) assert.equal(item.dependency_distance, Number.isFinite(distances[0]![Number(item.change.id)]) ? distances[0]![Number(item.change.id)] : null);
    assert.ok(traverseDependencies("0", relationships, 1).every(item => item.distance <= 1));
  }), { seed: 424242, numRuns: 300 });
});

test("300 generated timestamp/candidate lists have bounded scores and permutation-stable ranking", () => {
  fc.assert(fc.property(fc.array(fc.integer({ min: -360, max: 720 }), { maxLength: 30 }), offsets => {
    const changes = offsets.map((offset, index) => change(String(index), offset));
    const before = JSON.stringify(changes);
    const ranked = rankCandidateChanges(incident, changes, []);
    assert.deepEqual(ranked, rankCandidateChanges(incident, [...changes].reverse(), []));
    assert.equal(JSON.stringify(changes), before);
    for (const item of ranked) {
      assert.ok(item.normalized_score >= 0 && item.normalized_score <= 1);
      assert.ok(Number.isFinite(item.raw_score));
      assert.equal(item.evidence.reduce((total, entry) => total + entry.score, 0), item.raw_score);
    }
  }), { seed: 7311, numRuns: 300 });
});

test("time boundaries, after-incident changes, and invalid dates are explicit", () => {
  for (const [minutes, type] of [[-1, "CHANGE_AFTER_INCIDENT"], [0, "WITHIN_15_MINUTES"], [15, "WITHIN_15_MINUTES"],
    [15.001, "WITHIN_60_MINUTES"], [60, "WITHIN_60_MINUTES"], [60.001, "WITHIN_3_HOURS"], [180, "WITHIN_3_HOURS"], [180.001, "OLD_CHANGE"]] as const) {
    assert.ok(rankCandidateChanges(incident, [change("0", minutes)], [])[0]!.evidence.some(item => item.type === type));
  }
  assert.throws(() => rankCandidateChanges({ ...incident, detected_at: "invalid" }, [], []), RangeError);
  assert.deepEqual(traverseDependencies("0", [], 0), []);
});
