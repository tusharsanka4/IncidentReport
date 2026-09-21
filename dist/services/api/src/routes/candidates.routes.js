"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateRoutes = candidateRoutes;
const candidate_ranking_js_1 = require("../../../shared/src/candidate-ranking.js");
const incidents_repository_js_1 = require("../repositories/incidents.repository.js");
const changes_repository_js_1 = require("../repositories/changes.repository.js");
const relationships_repository_js_1 = require("../repositories/relationships.repository.js");
async function candidateRoutes(app) {
    app.get("/api/incidents/:id/candidates", async (request, reply) => {
        const incident = await (0, incidents_repository_js_1.findIncidentById)(request.params.id);
        if (!incident) {
            return reply.code(404).send({
                error: {
                    code: "INCIDENT_NOT_FOUND",
                    message: `Incident ${request.params.id} was not found`,
                    request_id: request.id
                }
            });
        }
        const [changes, relationships] = await Promise.all([
            (0, changes_repository_js_1.findRecentChanges)(incident.detected_at),
            (0, relationships_repository_js_1.findAllRelationships)()
        ]);
        const candidates = (0, candidate_ranking_js_1.rankCandidateChanges)(incident, changes, relationships);
        request.log.info({
            incidentId: incident.id,
            candidateCount: candidates.length
        }, "Candidate changes ranked");
        return {
            data: {
                incident_id: incident.id,
                affected_service: incident.service,
                environment: incident.environment,
                detected_at: incident.detected_at,
                candidate_count: candidates.length,
                candidates
            }
        };
    });
}
