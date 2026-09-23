"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToolResponse = createToolResponse;
exports.createToolError = createToolError;
function createToolResponse(data) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data)
            }
        ]
    };
}
function createToolError(code, message) {
    return {
        isError: true,
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    error: {
                        code,
                        message
                    }
                })
            }
        ]
    };
}
