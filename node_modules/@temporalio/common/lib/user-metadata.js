"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMetadataToPayload = userMetadataToPayload;
const payload_converter_1 = require("./converter/payload-converter");
function userMetadataToPayload(payloadConverter, staticSummary, staticDetails, context) {
    if (staticSummary == null && staticDetails == null)
        return undefined;
    const summary = (0, payload_converter_1.convertOptionalToPayload)(payloadConverter, staticSummary, context);
    const details = (0, payload_converter_1.convertOptionalToPayload)(payloadConverter, staticDetails, context);
    if (summary == null && details == null)
        return undefined;
    return { summary, details };
}
//# sourceMappingURL=user-metadata.js.map