import type { FastifyInstance } from "fastify";

import {
  createIncident,
  findAllIncidents,
  findIncidentById
} from "../repositories/incidents.repository.js";

import type {
  CreateIncidentInput
} from "../types/incident.types.js";

interface IncidentParameters {
  id: string;
}

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
} as const;

export async function incidentRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post<{ Body: CreateIncidentInput }>(
    "/api/incidents",
    {
      schema: {
        body: createIncidentBodySchema
      }
    },
    async (request, reply) => {
      try {
        const incident = await createIncident(request.body);

        request.log.info(
          {
            incidentId: incident.id
          },
          "Incident created"
        );

        return reply.code(201).send({
          data: incident
        });
      } catch (error) {
        const databaseError = error as {
          code?: string;
        };

        if (databaseError.code === "23505") {
          return reply.code(409).send({
            error: {
              code: "INCIDENT_ALREADY_EXISTS",
              message:
                `Incident ${request.body.incident_id} already exists`,
              request_id: request.id
            }
          });
        }

        throw error;
      }
    }
  );

  app.get("/api/incidents", async () => {
    const incidents = await findAllIncidents();

    return {
      data: incidents
    };
  });

  app.get<{ Params: IncidentParameters }>(
    "/api/incidents/:id",
    async (request, reply) => {
      const incident = await findIncidentById(request.params.id);

      if (!incident) {
        return reply.code(404).send({
          error: {
            code: "INCIDENT_NOT_FOUND",
            message:
              `Incident ${request.params.id} was not found`,
            request_id: request.id
          }
        });
      }

      return {
        data: incident
      };
    }
  );
}