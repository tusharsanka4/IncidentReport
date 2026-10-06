"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveAleaSeed = deriveAleaSeed;
const encoding_1 = require("@temporalio/common/lib/encoding");
const RANDOM_STREAM_SEED_PREFIX = Array.from((0, encoding_1.encode)('temporal-workflow-random-stream-v1'));
function encodeU32(value) {
    return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}
function deriveAleaSeed(seed, namespace) {
    const namespaceBytes = Array.from((0, encoding_1.encode)(namespace));
    return [
        ...RANDOM_STREAM_SEED_PREFIX,
        ...encodeU32(seed.length),
        ...seed,
        ...encodeU32(namespaceBytes.length),
        ...namespaceBytes,
    ];
}
//# sourceMappingURL=random-stream-seed.js.map