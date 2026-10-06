"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const worker_1 = require("@temporalio/worker");
const activities = __importStar(require("./activities/index.js"));
async function startWorker() {
    const temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
    const namespace = process.env.TEMPORAL_NAMESPACE ?? "default";
    const taskQueue = process.env.TEMPORAL_TASK_QUEUE ??
        "manifest-incident-operations";
    const workflowsPath = require.resolve("./workflows/index");
    const connection = await worker_1.NativeConnection.connect({
        address: temporalAddress
    });
    console.log(`Connected to Temporal at ${temporalAddress}`);
    const worker = await worker_1.Worker.create({
        connection,
        namespace,
        taskQueue,
        workflowsPath,
        activities
    });
    console.log(`Temporal worker listening on task queue: ${taskQueue}`);
    try {
        await worker.run();
    }
    finally {
        connection.close();
    }
}
startWorker().catch((error) => {
    console.error("Temporal worker failed to start:", error);
    process.exit(1);
});
