"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeSuggestContinueAsNewReason = exports.encodeSuggestContinueAsNewReason = exports.SuggestContinueAsNewReason = void 0;
exports.suggestContinueAsNewReasonsFromProto = suggestContinueAsNewReasonsFromProto;
const internal_workflow_1 = require("./internal-workflow");
/**
 * Reason(s) why continue as new is suggested. Can potentially be multiple reasons.
 *
 * @experimental May be removed or changed in the future.
 */
exports.SuggestContinueAsNewReason = {
    HISTORY_SIZE_TOO_LARGE: 'HISTORY_SIZE_TOO_LARGE',
    TOO_MANY_HISTORY_EVENTS: 'TOO_MANY_HISTORY_EVENTS',
    TOO_MANY_UPDATES: 'TOO_MANY_UPDATES',
};
// ts-prune-ignore-next
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.SuggestContinueAsNewReason.HISTORY_SIZE_TOO_LARGE]: 1,
    [exports.SuggestContinueAsNewReason.TOO_MANY_HISTORY_EVENTS]: 2,
    [exports.SuggestContinueAsNewReason.TOO_MANY_UPDATES]: 3,
    UNSPECIFIED: 0,
}, 'SUGGEST_CONTINUE_AS_NEW_REASON_'), exports.encodeSuggestContinueAsNewReason = _a[0], exports.decodeSuggestContinueAsNewReason = _a[1];
// ts-prune-ignore-next
function suggestContinueAsNewReasonsFromProto(reasons) {
    if (reasons == null) {
        return undefined;
    }
    const res = [];
    for (const r of reasons) {
        const decoded = (0, exports.decodeSuggestContinueAsNewReason)(r);
        if (decoded !== undefined) {
            res.push(decoded);
        }
    }
    if (res.length === 0) {
        return undefined;
    }
    return res;
}
//# sourceMappingURL=continue-as-new.js.map