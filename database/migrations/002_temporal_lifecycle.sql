-- Nullable workflow IDs preserve analyses and approvals created before Temporal.
ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS workflow_id TEXT UNIQUE;

ALTER TABLE approval_requests
    ADD COLUMN IF NOT EXISTS workflow_id TEXT UNIQUE;

ALTER TABLE audit_events
    ADD COLUMN IF NOT EXISTS event_key TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS remediation_attempts (
    workflow_id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    approval_request_id BIGINT NOT NULL
        REFERENCES approval_requests(id),
    requested_action JSONB NOT NULL,
    simulation TEXT NOT NULL CHECK (
        simulation IN ('SUCCESS', 'REMEDIATION_FAILURE', 'UNHEALTHY')
    ),
    result JSONB NOT NULL,
    health_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
