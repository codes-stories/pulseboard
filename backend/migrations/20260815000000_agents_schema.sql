-- +goose Up
CREATE TABLE IF NOT EXISTS agents (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    name text NOT NULL,
    hostname text NOT NULL DEFAULT '',
    device_id text NOT NULL DEFAULT '',
    server_id text NOT NULL DEFAULT '',
    version text NOT NULL DEFAULT '',
    region text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending',
    last_seen_at timestamptz NULL,
    cpu_usage double precision NOT NULL DEFAULT 0,
    memory_usage double precision NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agents_user_id_idx ON agents (user_id);
CREATE INDEX IF NOT EXISTS agents_status_idx ON agents (status);
CREATE INDEX IF NOT EXISTS agents_device_id_idx ON agents (device_id);

CREATE TABLE IF NOT EXISTS agent_api_keys (
    id text PRIMARY KEY,
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    expires_at timestamptz NULL,
    last_used_at timestamptz NULL,
    revoked_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_api_keys_agent_id_idx ON agent_api_keys (agent_id);
CREATE INDEX IF NOT EXISTS agent_api_keys_key_hash_idx ON agent_api_keys (key_hash);

CREATE TABLE IF NOT EXISTS agent_enrollment_tokens (
    id text PRIMARY KEY,
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz NULL,
    revoked_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_enrollment_tokens_token_hash_idx ON agent_enrollment_tokens (token_hash);
CREATE INDEX IF NOT EXISTS agent_enrollment_tokens_expires_at_idx ON agent_enrollment_tokens (expires_at);
CREATE INDEX IF NOT EXISTS agent_enrollment_tokens_agent_id_idx ON agent_enrollment_tokens (agent_id);

CREATE TABLE IF NOT EXISTS monitors (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    name text NOT NULL,
    url text NOT NULL,
    method text NOT NULL DEFAULT 'GET',
    interval_seconds integer NOT NULL DEFAULT 60,
    timeout_ms integer NOT NULL DEFAULT 5000,
    expected_status integer NOT NULL DEFAULT 200,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitors_user_id_idx ON monitors (user_id);

CREATE TABLE IF NOT EXISTS check_results (
    id text PRIMARY KEY,
    monitor_id text NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status_code integer NOT NULL DEFAULT 0,
    latency_ms integer NOT NULL DEFAULT 0,
    success boolean NOT NULL DEFAULT false,
    error_message text NOT NULL DEFAULT '',
    checked_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS check_results_monitor_id_idx ON check_results (monitor_id);
CREATE INDEX IF NOT EXISTS check_results_agent_id_idx ON check_results (agent_id);
CREATE INDEX IF NOT EXISTS check_results_checked_at_idx ON check_results (checked_at DESC);

-- +goose Down
DROP TABLE IF EXISTS check_results;
DROP TABLE IF EXISTS monitors;
DROP TABLE IF EXISTS agent_enrollment_tokens;
DROP TABLE IF EXISTS agent_api_keys;
DROP TABLE IF EXISTS agents;