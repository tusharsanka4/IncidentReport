"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_js_1 = require("./app.js");
const database_js_1 = require("../../shared/src/database.js");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const app = (0, app_js_1.buildApplication)();
async function startServer() {
    try {
        await app.listen({
            port,
            host
        });
        app.log.info(`API listening on http://${host}:${port}`);
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}
async function shutdown(signal) {
    app.log.info({
        signal
    }, "Shutting down API");
    try {
        await app.close();
        await database_js_1.database.end();
        process.exit(0);
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}
process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
void startServer();
