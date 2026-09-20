-- +goose Up
CREATE TABLE IF NOT EXISTS system_metrics (
    id text PRIMARY KEY,
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    metrics jsonb NOT NULL DEFAULT '{}',
    collected_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_metrics_agent_id_idx ON system_metrics (agent_id);
CREATE INDEX IF NOT EXISTS system_metrics_collected_at_idx ON system_metrics (collected_at DESC);

-- +goose Down
DROP TABLE IF EXISTS system_metrics;
