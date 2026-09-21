import type { Change } from "./change.types.js";

export interface IncidentForRanking {
  id: string;
  service: string;
  environment: string;
  detected_at: Date | string;
}

export interface RankingEvidence {
  type: string;
  description: string;
  score: number;
}

export interface RankedCandidate {
  change: Change;
  raw_score: number;
  normalized_score: number;
  dependency_distance: number | null;
  evidence: RankingEvidence[];
}