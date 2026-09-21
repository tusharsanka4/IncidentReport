# Candidate-Change Ranking

## Purpose

The candidate-change ranking system identifies recent application or
infrastructure changes that may have caused an incident.

Ranking is deterministic and occurs before any LLM analysis. The LLM
does not discover candidates from scratch and cannot silently modify
the deterministic scores.

## Inputs

The ranking function receives:

- The affected service
- The incident environment
- The incident detection time
- Recent application and infrastructure changes
- Resource dependency relationships

Only changes from the configured lookback window are retrieved. The
current API uses a six-hour lookback window.

## Scoring Factors

| Factor | Score |
|---|---:|
| Change directly modified the affected service | +40 |
| Change modified a direct dependency | +25 |
| Change modified an indirect dependency | +10 |
| No dependency path exists | -30 |
| Change occurred within 15 minutes | +25 |
| Change occurred within 60 minutes | +15 |
| Change occurred within three hours | +5 |
| Change occurred more than three hours earlier | -15 |
| Change occurred after incident detection | -25 |
| Change occurred in the same environment | +10 |
| Change occurred in a different environment | -20 |
| Deployment change | +10 |
| Configuration change | +8 |
| Other change type | 0 |

## Dependency Distance

Dependency distance is calculated using breadth-first search over the
architecture graph.

- Distance 0: the changed resource is the affected service.
- Distance 1: the changed resource is a direct dependency.
- Distance 2 or greater: the resource is an indirect dependency.
- Null: no dependency path exists.

Relationships are traversed from their source resource to their target
resource.

## Normalization

The highest possible configured score is 85:

- Direct resource match: 40
- Within 15 minutes: 25
- Same environment: 10
- Deployment: 10

The normalized score is calculated as:

    normalized_score = clamp(raw_score / 85, 0, 1)

The result is rounded to four decimal places.

This normalized ranking score is not the final agent confidence. The
LangGraph agent may later consider additional supporting or conflicting
evidence when producing its conclusion.

## Tie Breaking

Candidates are first ordered by raw score. If two candidates have the
same raw score, the most recently deployed change is ranked first.

## Explainability

Every scoring decision produces a structured evidence item containing:

- Evidence type
- Human-readable description
- Points added or deducted

This makes every result auditable and independently testable.