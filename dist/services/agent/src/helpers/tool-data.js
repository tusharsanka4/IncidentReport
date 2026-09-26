"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecord = isRecord;
exports.unwrapToolData = unwrapToolData;
exports.getErrorMessage = getErrorMessage;
function isRecord(value) {
    return (value !== null &&
        typeof value === "object" &&
        !Array.isArray(value));
}
function unwrapToolData(value) {
    if (isRecord(value) &&
        "data" in value) {
        return value.data;
    }
    return value;
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
