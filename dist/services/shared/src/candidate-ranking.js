"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankCandidateChanges = rankCandidateChanges;
const MAXIMUM_POSSIBLE_SCORE = 85;
function buildAdjacencyList(relationships) {
    const adjacencyList = new Map();
    for (const relationship of relationships) {
        const neighbours = adjacencyList.get(relationship.source) ?? [];
        neighbours.push(relationship.target);
        adjacencyList.set(relationship.source, neighbours);
    }
    return adjacencyList;
}
function findDependencyDistance(startingResource, targetResource, relationships) {
    if (startingResource === targetResource) {
        return 0;
    }
    const adjacencyList = buildAdjacencyList(relationships);
    const queue = [
        {
            resource: startingResource,
            distance: 0
        }
    ];
    const visited = new Set([startingResource]);
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }
        const neighbours = adjacencyList.get(current.resource) ?? [];
        for (const neighbour of neighbours) {
            if (neighbour === targetResource) {
                return current.distance + 1;
            }
            if (!visited.has(neighbour)) {
                visited.add(neighbour);
                queue.push({
                    resource: neighbour,
                    distance: current.distance + 1
                });
            }
        }
    }
    return null;
}
function scoreResourceRelationship(incident, change, relationships, evidence) {
    const distance = findDependencyDistance(incident.service, change.resource_id, relationships);
    if (distance === 0) {
        evidence.push({
            type: "DIRECT_RESOURCE_MATCH",
            description: `The change directly modified ${incident.service}.`,
            score: 40
        });
        return 40;
    }
    if (distance === 1) {
        evidence.push({
            type: "DIRECT_DEPENDENCY",
            description: `${change.resource_id} is a direct dependency of ` +
                `${incident.service}.`,
            score: 25
        });
        return 25;
    }
    if (distance !== null) {
        evidence.push({
            type: "INDIRECT_DEPENDENCY",
            description: `${change.resource_id} is an indirect dependency of ` +
                `${incident.service} at distance ${distance}.`,
            score: 10
        });
        return 10;
    }
    evidence.push({
        type: "UNRELATED_RESOURCE",
        description: `${change.resource_id} has no dependency path from ` +
            `${incident.service}.`,
        score: -30
    });
    return -30;
}
function scoreTimeCorrelation(incident, change, evidence) {
    const incidentTime = new Date(incident.detected_at).getTime();
    const changeTime = new Date(change.deployed_at).getTime();
    const differenceInMinutes = (incidentTime - changeTime) / (1000 * 60);
    if (differenceInMinutes < 0) {
        evidence.push({
            type: "CHANGE_AFTER_INCIDENT",
            description: "The change occurred after the incident was detected.",
            score: -25
        });
        return -25;
    }
    if (differenceInMinutes <= 15) {
        evidence.push({
            type: "WITHIN_15_MINUTES",
            description: `The change occurred ${Math.round(differenceInMinutes)} ` +
                "minutes before the incident.",
            score: 25
        });
        return 25;
    }
    if (differenceInMinutes <= 60) {
        evidence.push({
            type: "WITHIN_60_MINUTES",
            description: `The change occurred ${Math.round(differenceInMinutes)} ` +
                "minutes before the incident.",
            score: 15
        });
        return 15;
    }
    if (differenceInMinutes <= 180) {
        evidence.push({
            type: "WITHIN_3_HOURS",
            description: `The change occurred ${Math.round(differenceInMinutes)} ` +
                "minutes before the incident.",
            score: 5
        });
        return 5;
    }
    evidence.push({
        type: "OLD_CHANGE",
        description: `The change occurred ${Math.round(differenceInMinutes)} ` +
            "minutes before the incident.",
        score: -15
    });
    return -15;
}
function scoreEnvironment(incident, change, evidence) {
    if (incident.environment === change.environment) {
        evidence.push({
            type: "SAME_ENVIRONMENT",
            description: `Both the incident and change occurred in ` +
                `${incident.environment}.`,
            score: 10
        });
        return 10;
    }
    evidence.push({
        type: "DIFFERENT_ENVIRONMENT",
        description: `The incident occurred in ${incident.environment}, but ` +
            `the change occurred in ${change.environment}.`,
        score: -20
    });
    return -20;
}
function scoreChangeType(change, evidence) {
    const changeType = change.change_type.toLowerCase();
    if (changeType === "deployment") {
        evidence.push({
            type: "DEPLOYMENT_CHANGE",
            description: "Application deployments have a high potential impact.",
            score: 10
        });
        return 10;
    }
    if (changeType === "configuration") {
        evidence.push({
            type: "CONFIGURATION_CHANGE",
            description: "Configuration changes may alter runtime behaviour.",
            score: 8
        });
        return 8;
    }
    evidence.push({
        type: "OTHER_CHANGE_TYPE",
        description: `No additional weight is configured for ${change.change_type}.`,
        score: 0
    });
    return 0;
}
function normalizeScore(rawScore) {
    const normalized = Math.max(0, Math.min(1, rawScore / MAXIMUM_POSSIBLE_SCORE));
    return Number(normalized.toFixed(4));
}
function rankOneChange(incident, change, relationships) {
    const evidence = [];
    const dependencyDistance = findDependencyDistance(incident.service, change.resource_id, relationships);
    const rawScore = scoreResourceRelationship(incident, change, relationships, evidence) +
        scoreTimeCorrelation(incident, change, evidence) +
        scoreEnvironment(incident, change, evidence) +
        scoreChangeType(change, evidence);
    return {
        change,
        raw_score: rawScore,
        normalized_score: normalizeScore(rawScore),
        dependency_distance: dependencyDistance,
        evidence
    };
}
function rankCandidateChanges(incident, changes, relationships) {
    return changes
        .map((change) => rankOneChange(incident, change, relationships))
        .sort((first, second) => {
        if (second.raw_score !== first.raw_score) {
            return second.raw_score - first.raw_score;
        }
        return (new Date(second.change.deployed_at).getTime() -
            new Date(first.change.deployed_at).getTime());
    });
}
