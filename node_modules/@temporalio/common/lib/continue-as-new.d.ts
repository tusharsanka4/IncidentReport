import type { temporal } from '@temporalio/proto';
/**
 * Reason(s) why continue as new is suggested. Can potentially be multiple reasons.
 *
 * @experimental May be removed or changed in the future.
 */
export declare const SuggestContinueAsNewReason: {
    readonly HISTORY_SIZE_TOO_LARGE: "HISTORY_SIZE_TOO_LARGE";
    readonly TOO_MANY_HISTORY_EVENTS: "TOO_MANY_HISTORY_EVENTS";
    readonly TOO_MANY_UPDATES: "TOO_MANY_UPDATES";
};
export type SuggestContinueAsNewReason = (typeof SuggestContinueAsNewReason)[keyof typeof SuggestContinueAsNewReason];
export declare const encodeSuggestContinueAsNewReason: (input: "HISTORY_SIZE_TOO_LARGE" | "TOO_MANY_HISTORY_EVENTS" | "TOO_MANY_UPDATES" | temporal.api.enums.v1.SuggestContinueAsNewReason | "SUGGEST_CONTINUE_AS_NEW_REASON_HISTORY_SIZE_TOO_LARGE" | "SUGGEST_CONTINUE_AS_NEW_REASON_TOO_MANY_HISTORY_EVENTS" | "SUGGEST_CONTINUE_AS_NEW_REASON_TOO_MANY_UPDATES" | null | undefined) => temporal.api.enums.v1.SuggestContinueAsNewReason | undefined, decodeSuggestContinueAsNewReason: (input: temporal.api.enums.v1.SuggestContinueAsNewReason | null | undefined) => "HISTORY_SIZE_TOO_LARGE" | "TOO_MANY_HISTORY_EVENTS" | "TOO_MANY_UPDATES" | undefined;
export declare function suggestContinueAsNewReasonsFromProto(reasons: temporal.api.enums.v1.SuggestContinueAsNewReason[] | null | undefined): SuggestContinueAsNewReason[] | undefined;
