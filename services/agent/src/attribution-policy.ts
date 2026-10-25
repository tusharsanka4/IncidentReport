import { isRecord } from "./helpers/tool-data.js";

// These are conservative decision rules, not calibrated probabilities.
export const MINIMUM_ATTRIBUTION_SCORE = 40;
export const MINIMUM_SCORE_MARGIN = 10;
const EVIDENCE_WINDOW_MS = 6 * 60 * 60 * 1000;

export function assessAttribution(
  incident: Record<string, unknown>,
  candidates: Record<string, unknown>[]
): { changeId: string | null; reason: string } {
  const eligible = candidates.filter(candidate => {
    const change = candidate.change;
    if (!isRecord(change) || typeof change.id !== "string") return false;
    if (typeof candidate.raw_score !== "number" || !Number.isFinite(candidate.raw_score)) {
      return false;
    }
    if (change.environment !== incident.environment) return false;
    if (!Number.isInteger(candidate.dependency_distance) || Number(candidate.dependency_distance) < 0) {
      return false;
    }
    const detected = Date.parse(String(incident.detected_at));
    const deployed = Date.parse(String(change.deployed_at));
    return Number.isFinite(detected) && Number.isFinite(deployed) &&
      deployed <= detected && detected - deployed <= EVIDENCE_WINDOW_MS;
  }).sort((a, b) => Number(b.raw_score) - Number(a.raw_score));

  const strongest = eligible[0];
  if (!strongest || Number(strongest.raw_score) < MINIMUM_ATTRIBUTION_SCORE) {
    return {
      changeId: null,
      reason: "No sufficiently supported, related, same-environment candidate exists."
    };
  }
  if (eligible[1] && Number(strongest.raw_score) - Number(eligible[1].raw_score) < MINIMUM_SCORE_MARGIN) {
    return {
      changeId: null,
      reason: "Candidate evidence is ambiguous: the leading score margin is below 10."
    };
  }
  return {
    changeId: String((strongest.change as Record<string, unknown>).id),
    reason: "A distinct supported candidate exists."
  };
}
