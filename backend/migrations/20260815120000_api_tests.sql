-- +goose Up
CREATE TABLE IF NOT EXISTS api_tests (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    name text NOT NULL,
    method text NOT NULL DEFAULT 'GET',
    url text NOT NULL,
    headers jsonb NOT NULL DEFAULT '{}'::jsonb,
    body text NOT NULL DEFAULT '',
    response_status integer NULL,
    response_body text NOT NULL DEFAULT '',
    response_time_ms integer NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_tests_user_id_idx ON api_tests (user_id);

-- +goose Down
DROP TABLE IF EXISTS api_tests;