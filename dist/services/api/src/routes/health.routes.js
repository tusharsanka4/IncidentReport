"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const database_js_1 = require("../../../shared/src/database.js");
async function healthRoutes(app) {
    app.get("/health", async () => {
        return {
            status: "healthy"
        };
    });
    app.get("/ready", async (_request, reply) => {
        try {
            await database_js_1.database.query("SELECT 1");
            return {
                status: "ready",
                database: "connected"
            };
        }
        catch {
            return reply.code(503).send({
                status: "not_ready",
                database: "disconnected"
            });
        }
    });
}
