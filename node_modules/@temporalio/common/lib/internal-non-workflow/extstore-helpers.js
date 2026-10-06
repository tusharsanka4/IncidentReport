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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReferencePayload = isReferencePayload;
exports.decodeReferencePayload = decodeReferencePayload;
exports.encodeReferencePayload = encodeReferencePayload;
const long_1 = __importDefault(require("long"));
const proto = __importStar(require("@temporalio/proto"));
const encoding_1 = require("../encoding");
const errors_1 = require("../errors");
const protobuf_payload_converters_1 = require("../converter/protobuf-payload-converters");
const types_1 = require("../converter/types");
const ExternalStorageReferenceProto = proto.temporal.api.sdk.v1.ExternalStorageReference;
const PayloadProto = proto.temporal.api.common.v1.Payload;
const storageReferenceConverter = new protobuf_payload_converters_1.ProtobufJsonPayloadConverter(proto);
const EXTSTORE_REFERENCE_MESSAGE_TYPE = 'temporal.api.sdk.v1.ExternalStorageReference';
const EXTSTORE_REFERENCE_ENCODING = types_1.encodingTypes.METADATA_ENCODING_PROTOBUF_JSON;
/**
 * True if the payload is an External Storage reference:
 * `temporal.api.sdk.v1.ExternalStorageReference`.
 *
 * @internal
 * @experimental
 */
function isReferencePayload(payload) {
    const encodingValue = readMetadataString(payload, types_1.METADATA_ENCODING_KEY);
    if (encodingValue === EXTSTORE_REFERENCE_ENCODING) {
        return readMetadataString(payload, types_1.METADATA_MESSAGE_TYPE_KEY) === EXTSTORE_REFERENCE_MESSAGE_TYPE;
    }
    return false;
}
/**
 * Decode a reference payload from the wire format {@link ExternalStorageReference}.
 * Throws {@link ValueError} if the payload is not a reference or is malformed.
 * Callers should gate on {@link isReferencePayload} first.
 *
 * @internal
 * @experimental
 */
function decodeReferencePayload(payload) {
    const ref = storageReferenceConverter.fromPayload(payload);
    if (!ref.driverName) {
        // TODO: use the new stable error codes here
        throw new errors_1.ValueError("Reference payload field 'driverName' must be a non-empty string");
    }
    return {
        driverName: ref.driverName,
        claimData: { ...ref.claimData },
        sizeBytes: readSizeBytes(payload),
    };
}
/**
 * Encode a reference payload to wire format.
 *
 * @internal
 * @experimental
 */
function encodeReferencePayload({ driverName, claim, sizeBytes, }) {
    const ref = ExternalStorageReferenceProto.create({ driverName, claimData: claim.claimData });
    const payload = storageReferenceConverter.toPayload(ref);
    if (payload === undefined) {
        // TODO: use the new stable error codes here
        throw new errors_1.ValueError('Failed to serialize ExternalStorageReference');
    }
    return {
        ...payload,
        externalPayloads: [PayloadProto.ExternalPayloadDetails.create({ sizeBytes: long_1.default.fromNumber(sizeBytes) })],
    };
}
function readMetadataString(payload, key) {
    const raw = payload.metadata?.[key];
    if (!raw)
        return undefined;
    return (0, encoding_1.decode)(raw);
}
function readSizeBytes(payload) {
    const details = payload.externalPayloads?.[0];
    if (!details?.sizeBytes)
        return 0;
    return long_1.default.isLong(details.sizeBytes) ? details.sizeBytes.toNumber() : Number(details.sizeBytes);
}
//# sourceMappingURL=extstore-helpers.js.map