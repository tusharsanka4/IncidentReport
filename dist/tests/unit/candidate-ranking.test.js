"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const candidate_ranking_js_1 = require("../../services/shared/src/candidate-ranking.js");
const incident = {
    id: "INC-1042",
    service: "order-service",
    environment: "production",
    detected_at: "2026-08-04T08:15:00Z"
};
const changes = [
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
const relationships = [
    {
        source: "order-service",
        target: "redis-cache",
        type: "DEPENDS_ON"
    }
];
(0, node_test_1.default)("ranks candidate changes in expected order", () => {
    const candidates = (0, candidate_ranking_js_1.rankCandidateChanges)(incident, changes, relationships);
    strict_1.default.deepEqual(candidates.map((candidate) => candidate.change.id), [
        "CHG-201",
        "CHG-202",
        "CHG-204",
        "CHG-203"
    ]);
});
(0, node_test_1.default)("calculates expected raw scores", () => {
    const candidates = (0, candidate_ranking_js_1.rankCandidateChanges)(incident, changes, relationships);
    const scores = Object.fromEntries(candidates.map((candidate) => [
        candidate.change.id,
        candidate.raw_score
    ]));
    strict_1.default.equal(scores["CHG-201"], 85);
    strict_1.default.equal(scores["CHG-202"], 58);
    strict_1.default.equal(scores["CHG-204"], 55);
    strict_1.default.equal(scores["CHG-203"], -5);
});
(0, node_test_1.default)("calculates dependency distances", () => {
    const candidates = (0, candidate_ranking_js_1.rankCandidateChanges)(incident, changes, relationships);
    const distances = Object.fromEntries(candidates.map((candidate) => [
        candidate.change.id,
        candidate.dependency_distance
    ]));
    strict_1.default.equal(distances["CHG-201"], 0);
    strict_1.default.equal(distances["CHG-202"], 1);
    strict_1.default.equal(distances["CHG-204"], 0);
    strict_1.default.equal(distances["CHG-203"], null);
});
(0, node_test_1.default)("penalizes a change from a different environment", () => {
    const candidates = (0, candidate_ranking_js_1.rankCandidateChanges)(incident, changes, relationships);
    const stagingCandidate = candidates.find((candidate) => candidate.change.id === "CHG-204");
    strict_1.default.ok(stagingCandidate);
    strict_1.default.ok(stagingCandidate.evidence.some((item) => item.type === "DIFFERENT_ENVIRONMENT" &&
        item.score === -20));
});
