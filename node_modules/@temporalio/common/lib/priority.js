"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePriority = decodePriority;
exports.compilePriority = compilePriority;
/**
 * Turn a proto compatible Priority into a TS Priority
 */
function decodePriority(priority) {
    return {
        priorityKey: priority?.priorityKey ?? undefined,
        fairnessKey: priority?.fairnessKey ?? undefined,
        fairnessWeight: priority?.fairnessWeight ?? undefined,
    };
}
/**
 * Turn a TS Priority into a proto compatible Priority
 */
function compilePriority(priority) {
    if (priority.priorityKey !== undefined && priority.priorityKey !== null) {
        if (!Number.isInteger(priority.priorityKey)) {
            throw new TypeError('priorityKey must be an integer');
        }
        if (priority.priorityKey < 0) {
            throw new RangeError('priorityKey must be a positive integer');
        }
    }
    return {
        priorityKey: priority.priorityKey ?? 0,
        fairnessKey: priority.fairnessKey ?? '',
        fairnessWeight: priority.fairnessWeight ?? 0,
    };
}
//# sourceMappingURL=priority.js.map