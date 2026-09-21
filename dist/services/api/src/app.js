"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApplication = buildApplication;
const fastify_1 = __importDefault(require("fastify"));
const health_routes_js_1 = require("./routes/health.routes.js");
const incidents_routes_js_1 = require("./routes/incidents.routes.js");
const candidates_routes_js_1 = require("./routes/candidates.routes.js");
function buildApplication() {
    const app = (0, fastify_1.default)({
        logger: true,
        requestIdHeader: "x-request-id"
    });
    app.register(health_routes_js_1.healthRoutes);
    app.register(incidents_routes_js_1.incidentRoutes);
    app.register(candidates_routes_js_1.candidateRoutes);
    app.setNotFoundHandler((request, reply) => {
        return reply.code(404).send({
            error: {
                code: "ROUTE_NOT_FOUND",
                message: `${request.method} ${request.url} was not found`,
                request_id: request.id
            }
        });
    });
    app.setErrorHandler((error, request, reply) => {
        request.log.error({
            error,
            requestId: request.id
        }, "Request failed");
        const validation = typeof error === "object" &&
            error !== null &&
            "validation" in error
            ? error.validation
            : undefined;
        if (validation) {
            return reply.code(400).send({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "The request contains invalid data",
                    request_id: request.id,
                    details: validation
                }
            });
        }
        return reply.code(500).send({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "An unexpected error occurred",
                request_id: request.id
            }
        });
    });
    return app;
}
