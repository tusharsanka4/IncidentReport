"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
require("dotenv/config");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}
exports.database = new Pool({
    connectionString: process.env.DATABASE_URL
});
