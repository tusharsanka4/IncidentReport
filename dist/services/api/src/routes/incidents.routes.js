"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentRoutes = incidentRoutes;
const incidents_repository_js_1 = require("../repositories/incidents.repository.js");
const createIncidentBodySchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "incident_id",
        "service",
        "environment",
        "symptom",
        "detected_at"
    ],
    properties: {
        incident_id: {
            type: "string",
            minLength: 1
        },
        service: {
            type: "string",
            minLength: 1
        },
        environment: {
            type: "string",
            minLength: 1
        },
        symptom: {
            type: "string",
            minLength: 1
        },
        detected_at: {
            type: "string",
            format: "date-time"
        }
    }
};
async function incidentRoutes(app) {
    app.post("/api/incidents", {
        schema: {
            body: createIncidentBodySchema
        }
    }, async (request, reply) => {
        try {
            const incident = await (0, incidents_repository_js_1.createIncident)(request.body);
            request.log.info({
                incidentId: incident.id
            }, "Incident created");
            return reply.code(201).send({
                data: incident
            });
        }
        catch (error) {
            const databaseError = error;
            if (databaseError.code === "23505") {
                return reply.code(409).send({
                    error: {
                        code: "INCIDENT_ALREADY_EXISTS",
                        message: `Incident ${request.body.incident_id} already exists`,
                        request_id: request.id
                    }
                });
            }
            throw error;
        }
    });
    app.get("/api/incidents", async () => {
        const incidents = await (0, incidents_repository_js_1.findAllIncidents)();
        return {
            data: incidents
        };
    });
    app.get("/api/incidents/:id", async (request, reply) => {
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
        return {
            data: incident
        };
    });
}
