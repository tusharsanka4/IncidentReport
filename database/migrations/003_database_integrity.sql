ALTER TABLE incidents DROP CONSTRAINT valid_incident_status;

ALTER TABLE incidents ADD CONSTRAINT valid_incident_status CHECK (
    status IN (
        'RECEIVED', 'ANALYSING', 'AWAITING_APPROVAL', 'APPROVED',
        'REJECTED', 'REMEDIATING', 'VERIFYING_HEALTH', 'RESOLVED',
        'ESCALATED', 'FAILED'
    )
);

-- Historical rows remain intact. Invalid historical decisions fail migration
-- validation instead of being silently rewritten or deleted.
ALTER TABLE approval_requests ADD CONSTRAINT complete_approval_decision CHECK (
    status NOT IN ('APPROVED', 'REJECTED') OR (
        responded_at IS NOT NULL AND responded_by IS NOT NULL
        AND LENGTH(BTRIM(responded_by)) > 0
    )
);

CREATE INDEX idx_analysis_incident_time
    ON analysis_results(incident_id, created_at DESC, id DESC);

CREATE INDEX idx_approval_incident ON approval_requests(incident_id);
CREATE INDEX idx_approval_analysis ON approval_requests(analysis_id);
CREATE INDEX idx_remediation_incident ON remediation_attempts(incident_id);
CREATE INDEX idx_changes_deployed_at ON changes(deployed_at DESC);
CREATE INDEX idx_incidents_detected_at ON incidents(detected_at DESC);
