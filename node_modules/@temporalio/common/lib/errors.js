"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalStorageNotConfiguredError = exports.CompleteAsyncError = exports.NamespaceNotFoundError = exports.WorkflowNotFoundError = exports.IllegalStateError = exports.PayloadConverterError = exports.ValueError = void 0;
const type_helpers_1 = require("./type-helpers");
/**
 * Thrown from code that receives a value that is unexpected or that it's unable to handle.
 */
let ValueError = class ValueError extends Error {
    cause;
    constructor(message, cause) {
        super(message ?? undefined);
        this.cause = cause;
    }
};
exports.ValueError = ValueError;
exports.ValueError = ValueError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('ValueError')
], ValueError);
/**
 * Thrown when a Payload Converter is misconfigured.
 */
let PayloadConverterError = class PayloadConverterError extends ValueError {
};
exports.PayloadConverterError = PayloadConverterError;
exports.PayloadConverterError = PayloadConverterError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('PayloadConverterError')
], PayloadConverterError);
/**
 * Signals that a requested operation can't be completed because it is illegal given the
 * current state of the object; e.g. trying to use a resource after it has been closed.
 */
let IllegalStateError = class IllegalStateError extends Error {
};
exports.IllegalStateError = IllegalStateError;
exports.IllegalStateError = IllegalStateError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('IllegalStateError')
], IllegalStateError);
/**
 * Thrown when a Workflow with the given Id is not known to Temporal Server.
 * It could be because:
 * - Id passed is incorrect
 * - Workflow is closed (for some calls, e.g. `terminate`)
 * - Workflow was deleted from the Server after reaching its retention limit
 */
let WorkflowNotFoundError = class WorkflowNotFoundError extends Error {
    workflowId;
    runId;
    constructor(message, workflowId, runId) {
        super(message);
        this.workflowId = workflowId;
        this.runId = runId;
    }
};
exports.WorkflowNotFoundError = WorkflowNotFoundError;
exports.WorkflowNotFoundError = WorkflowNotFoundError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('WorkflowNotFoundError')
], WorkflowNotFoundError);
/**
 * Thrown when the specified namespace is not known to Temporal Server.
 */
let NamespaceNotFoundError = class NamespaceNotFoundError extends Error {
    namespace;
    constructor(namespace) {
        super(`Namespace not found: '${namespace}'`);
        this.namespace = namespace;
    }
};
exports.NamespaceNotFoundError = NamespaceNotFoundError;
exports.NamespaceNotFoundError = NamespaceNotFoundError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('NamespaceNotFoundError')
], NamespaceNotFoundError);
/**
 * Throw this error from an Activity in order to make the Worker forget about this Activity.
 *
 * The Activity can then be completed asynchronously (from anywhere—usually outside the Worker) using
 * the Client's activity handle.
 *
 * @example
 *
 * ```ts
 *import { CompleteAsyncError } from '@temporalio/activity';
 *
 *export async function myActivity(): Promise<never> {
 *  // ...
 *  throw new CompleteAsyncError();
 *}
 * ```
 */
let CompleteAsyncError = class CompleteAsyncError extends Error {
};
exports.CompleteAsyncError = CompleteAsyncError;
exports.CompleteAsyncError = CompleteAsyncError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('CompleteAsyncError')
], CompleteAsyncError);
/**
 * Thrown when an inbound payload is detected as an external-storage reference
 * but no `ExternalStorage` is configured to resolve it.
 *
 * @experimental
 */
let ExternalStorageNotConfiguredError = class ExternalStorageNotConfiguredError extends Error {
    constructor(message = 'Detected externally stored payload(s) but external storage is not configured.') {
        super(`[TMPRL1105] ${message}`);
    }
};
exports.ExternalStorageNotConfiguredError = ExternalStorageNotConfiguredError;
exports.ExternalStorageNotConfiguredError = ExternalStorageNotConfiguredError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('ExternalStorageNotConfiguredError')
], ExternalStorageNotConfiguredError);
//# sourceMappingURL=errors.js.map