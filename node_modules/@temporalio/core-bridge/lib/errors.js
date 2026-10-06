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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var ServiceError_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IllegalStateError = exports.NativePromiseDroppedError = exports.ServiceError = exports.UnexpectedError = exports.TransportError = exports.ShutdownError = void 0;
exports.convertFromNamedError = convertFromNamedError;
const grpc = __importStar(require("@grpc/grpc-js"));
const common_1 = require("@temporalio/common");
Object.defineProperty(exports, "IllegalStateError", { enumerable: true, get: function () { return common_1.IllegalStateError; } });
const type_helpers_1 = require("@temporalio/common/lib/type-helpers");
/**
 * The worker has been shut down
 */
let ShutdownError = class ShutdownError extends Error {
};
exports.ShutdownError = ShutdownError;
exports.ShutdownError = ShutdownError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('ShutdownError')
], ShutdownError);
/**
 * Thrown after shutdown was requested as a response to a poll function, JS should stop polling
 * once this error is encountered
 */
let TransportError = class TransportError extends Error {
};
exports.TransportError = TransportError;
exports.TransportError = TransportError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('TransportError')
], TransportError);
/**
 * Something unexpected happened, considered fatal
 */
let UnexpectedError = class UnexpectedError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
    }
};
exports.UnexpectedError = UnexpectedError;
exports.UnexpectedError = UnexpectedError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('UnexpectedError')
], UnexpectedError);
/**
 * A gRPC call failed. The error carries the gRPC status code, message, and other details.
 */
let ServiceError = ServiceError_1 = class ServiceError extends Error {
    code;
    details;
    metadata;
    constructor(message, code, details, metadata) {
        super(message);
        this.code = code;
        this.details = details;
        this.metadata = metadata;
    }
    static fromNative(err) {
        const metadata = new grpc.Metadata();
        for (const [k, v] of Object.entries(err.metadata ?? {})) {
            metadata.set(k, v);
        }
        return new ServiceError_1(err.message, err.code ?? 0, err.details ?? '', metadata);
    }
};
exports.ServiceError = ServiceError;
exports.ServiceError = ServiceError = ServiceError_1 = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('ServiceError')
], ServiceError);
/**
 * Something unexpected happened, considered fatal
 */
let NativePromiseDroppedError = class NativePromiseDroppedError extends UnexpectedError {
    constructor(message) {
        super(message);
    }
};
exports.NativePromiseDroppedError = NativePromiseDroppedError;
exports.NativePromiseDroppedError = NativePromiseDroppedError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('NativePromiseDroppedError')
], NativePromiseDroppedError);
// Check if the error's class is exactly Error (not a descendant of it), in a realm-safe way
function isBareError(e) {
    return (0, type_helpers_1.isError)(e) && Object.getPrototypeOf(e)?.name === 'Error';
}
function convertFromNamedError(e, keepStackTrace) {
    if (isBareError(e)) {
        let newerr;
        switch (e.name) {
            case 'TransportError':
                newerr = new TransportError(e.message);
                newerr.stack = keepStackTrace ? e.stack : undefined;
                return newerr;
            case 'IllegalStateError':
                newerr = new common_1.IllegalStateError(e.message);
                newerr.stack = keepStackTrace ? e.stack : undefined;
                return newerr;
            case 'ShutdownError':
                newerr = new ShutdownError(e.message);
                newerr.stack = keepStackTrace ? e.stack : undefined;
                return newerr;
            case 'UnexpectedError':
                newerr = new UnexpectedError(e.message, e);
                newerr.stack = keepStackTrace ? e.stack : undefined;
                return newerr;
            case 'ServiceError':
                newerr = ServiceError.fromNative(e);
                newerr.stack = keepStackTrace ? e.stack : undefined;
                return newerr;
        }
        // Neon ensures that dropping an unsettled Promise results in a rejection, which is
        // much better than just hanging the JS process. Sad though that it does so with an
        // error message that would mean nothing to a user.
        if (e.message === '`neon::types::Deferred` was dropped without being settled') {
            newerr = new NativePromiseDroppedError('Native Promise was dropped without being settled');
            newerr.stack = keepStackTrace ? e.stack : undefined;
            return newerr;
        }
    }
    return e;
}
//# sourceMappingURL=errors.js.map