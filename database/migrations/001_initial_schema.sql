CREATE TABLE resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    resource_type TEXT NOT NULL,
    environment TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resource_relationships (
    id BIGSERIAL PRIMARY KEY,
    source_resource_id TEXT NOT NULL
        REFERENCES resources(id) ON DELETE CASCADE,
    target_resource_id TEXT NOT NULL
        REFERENCES resources(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT different_relationship_resources
        CHECK (source_resource_id <> target_resource_id),

    CONSTRAINT unique_resource_relationship
        UNIQUE (
            source_resource_id,
            target_resource_id,
            relationship_type
        )
);

CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    environment TEXT NOT NULL,
    symptom TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'RECEIVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_incident_status CHECK (
        status IN (
            'RECEIVED',
            'ANALYSING',
            'AWAITING_APPROVAL',
            'APPROVED',
            'REJECTED',
            'REMEDIATING',
            'RESOLVED',
            'ESCALATED',
            'FAILED'
        )
    )
);

CREATE TABLE changes (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL
        REFERENCES resources(id),
    change_type TEXT NOT NULL,
    description TEXT,
    version TEXT,
    environment TEXT NOT NULL,
    deployed_at TIMESTAMPTZ NOT NULL,
    source TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_results (
    id BIGSERIAL PRIMARY KEY,
    incident_id TEXT NOT NULL
        REFERENCES incidents(id) ON DELETE CASCADE,
    probable_change_id TEXT
        REFERENCES changes(id),
    confidence_score NUMERIC(5, 4),
    reasoning_summary TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '[]',
    recommended_action JSONB,
    analysis_status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_confidence_score CHECK (
        confidence_score IS NULL
        OR confidence_score BETWEEN 0 AND 1
    )
);

CREATE TABLE approval_requests (
    id BIGSERIAL PRIMARY KEY,
    incident_id TEXT NOT NULL
        REFERENCES incidents(id) ON DELETE CASCADE,
    analysis_id BIGINT NOT NULL
        REFERENCES analysis_results(id) ON DELETE CASCADE,
    requested_action JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    responded_by TEXT,
    comment TEXT,

    CONSTRAINT valid_approval_status CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    )
);

CREATE TABLE audit_events (
    id BIGSERIAL PRIMARY KEY,
    incident_id TEXT
        REFERENCES incidents(id) ON DELETE CASCADE,
    workflow_id TEXT,
    actor_type TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    input JSONB,
    output JSONB,
    status TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationships_source
    ON resource_relationships(source_resource_id);

CREATE INDEX idx_relationships_target
    ON resource_relationships(target_resource_id);

CREATE INDEX idx_changes_resource_time
    ON changes(resource_id, deployed_at DESC);

CREATE INDEX idx_incidents_status
    ON incidents(status);

CREATE INDEX idx_audit_events_incident_time
    ON audit_events(incident_id, timestamp);