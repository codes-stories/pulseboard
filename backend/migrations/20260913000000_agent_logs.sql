-- +goose Up
CREATE TABLE IF NOT EXISTS agent_logs (
    id text PRIMARY KEY,
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    level text NOT NULL DEFAULT 'info',
    message text NOT NULL,
    context jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_logs_agent_id_idx ON agent_logs (agent_id);
CREATE INDEX IF NOT EXISTS agent_logs_created_at_idx ON agent_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_logs_level_idx ON agent_logs (level);

-- +goose Down
DROP TABLE IF EXISTS agent_logs;
