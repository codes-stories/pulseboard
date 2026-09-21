package agents

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gaurav/pulseboard/internal/monitors"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) available() error {
	if r == nil || r.db == nil {
		return ErrStoreUnavailable
	}
	return nil
}

const agentColumns = `id, user_id, name, hostname, device_id, server_id, version, region, status, last_seen_at, cpu_usage, memory_usage, created_at, updated_at`

func (r *Repository) CreateAgent(ctx context.Context, agent *Agent) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO agents (`+agentColumns+`)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`, agent.ID, agent.UserID, agent.Name, agent.Hostname, agent.DeviceID, agent.ServerID,
		agent.Version, agent.Region, string(agent.Status), agent.LastSeenAt,
		agent.CPUUsage, agent.MemoryUsage, agent.CreatedAt, agent.UpdatedAt)
	return err
}

func (r *Repository) GetAgentByID(ctx context.Context, agentID, userID string) (*Agent, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT `+agentColumns+`
		FROM agents
		WHERE id = $1 AND user_id = $2
	`, agentID, userID)

	return scanAgent(row)
}

func (r *Repository) ListAgents(ctx context.Context, userID string) ([]Agent, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT `+agentColumns+`
		FROM agents
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	agents := make([]Agent, 0)
	for rows.Next() {
		agent, err := scanAgent(rows)
		if err != nil {
			return nil, err
		}
		agents = append(agents, *agent)
	}
	return agents, rows.Err()
}

func (r *Repository) UpdateAgent(ctx context.Context, agent *Agent) error {
	if err := r.available(); err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, `
		UPDATE agents
		SET name = $3,
			hostname = $4,
			version = $5,
			region = $6,
			status = $7,
			updated_at = now()
		WHERE id = $1 AND user_id = $2
	`, agent.ID, agent.UserID, agent.Name, agent.Hostname, agent.Version, agent.Region, string(agent.Status))
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrAgentNotFound
	}
	return nil
}

func (r *Repository) DeleteAgent(ctx context.Context, agentID, userID string) error {
	if err := r.available(); err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, `
		DELETE FROM agents
		WHERE id = $1 AND user_id = $2
	`, agentID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrAgentNotFound
	}
	return nil
}

func scanAgent(row pgx.Row) (*Agent, error) {
	var agent Agent
	if err := row.Scan(
		&agent.ID, &agent.UserID, &agent.Name, &agent.Hostname, &agent.DeviceID,
		&agent.ServerID, &agent.Version, &agent.Region, &agent.Status,
		&agent.LastSeenAt, &agent.CPUUsage, &agent.MemoryUsage,
		&agent.CreatedAt, &agent.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAgentNotFound
		}
		return nil, err
	}

	return &agent, nil
}

// ---- API keys ----

func (r *Repository) CreateAPIKey(ctx context.Context, key *APIKey) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO agent_api_keys (
			id, agent_id, name, key_prefix, key_hash, expires_at, last_used_at, revoked_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, key.ID, key.AgentID, key.Name, key.KeyPrefix, key.KeyHash, key.ExpiresAt,
		key.LastUsedAt, key.RevokedAt, key.CreatedAt, key.UpdatedAt)
	return err
}

func (r *Repository) ListAPIKeys(ctx context.Context, agentID, userID string) ([]APIKey, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	var owned bool
	if err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM agents WHERE id = $1 AND user_id = $2)`,
		agentID, userID,
	).Scan(&owned); err != nil {
		return nil, err
	}
	if !owned {
		return nil, ErrAgentNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, agent_id, name, key_prefix, key_hash,
		       expires_at, last_used_at, revoked_at, created_at, updated_at
		FROM agent_api_keys
		WHERE agent_id = $1
		ORDER BY created_at DESC
	`, agentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := make([]APIKey, 0)
	for rows.Next() {
		key, err := scanAPIKey(rows)
		if err != nil {
			return nil, err
		}
		keys = append(keys, *key)
	}
	return keys, rows.Err()
}

func (r *Repository) GetAPIKeyByID(ctx context.Context, keyID, agentID, userID string) (*APIKey, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT k.id, k.agent_id, k.name, k.key_prefix, k.key_hash,
		       k.expires_at, k.last_used_at, k.revoked_at, k.created_at, k.updated_at
		FROM agent_api_keys k
		JOIN agents a ON a.id = k.agent_id
		WHERE k.id = $1 AND k.agent_id = $2 AND a.user_id = $3
	`, keyID, agentID, userID)

	return scanAPIKey(row)
}

func (r *Repository) RevokeAPIKey(ctx context.Context, keyID, agentID, userID string) error {
	if err := r.available(); err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, `
		UPDATE agent_api_keys k
		SET revoked_at = now(), updated_at = now()
		FROM agents a
		WHERE k.id = $1 AND k.agent_id = $2 AND a.id = k.agent_id AND a.user_id = $3 AND k.revoked_at IS NULL
	`, keyID, agentID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrAPIKeyNotFound
	}
	return nil
}

// RotateAPIKey revokes the old key and inserts a new one inside a single
// transaction so a rotation is atomic.
func (r *Repository) RotateAPIKey(ctx context.Context, oldKeyID, agentID, userID string, newKey *APIKey) (*APIKey, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	result, err := tx.Exec(ctx, `
		UPDATE agent_api_keys k
		SET revoked_at = now(), updated_at = now()
		FROM agents a
		WHERE k.id = $1 AND k.agent_id = $2 AND a.id = k.agent_id AND a.user_id = $3 AND k.revoked_at IS NULL
	`, oldKeyID, agentID, userID)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, ErrAPIKeyNotFound
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO agent_api_keys (
			id, agent_id, name, key_prefix, key_hash, expires_at, last_used_at, revoked_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, newKey.ID, newKey.AgentID, newKey.Name, newKey.KeyPrefix, newKey.KeyHash,
		newKey.ExpiresAt, newKey.LastUsedAt, newKey.RevokedAt, newKey.CreatedAt, newKey.UpdatedAt); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return newKey, nil
}

// GetAPIKeyByHash returns the key and its owning agent. Used by agent
// authentication; never returns the plaintext secret.
func (r *Repository) GetAPIKeyByHash(ctx context.Context, hash string) (*APIKey, *Agent, error) {
	if err := r.available(); err != nil {
		return nil, nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT id, agent_id, name, key_prefix, key_hash,
		       expires_at, last_used_at, revoked_at, created_at, updated_at
		FROM agent_api_keys
		WHERE key_hash = $1
	`, hash)
	key, err := scanAPIKey(row)
	if err != nil {
		return nil, nil, err
	}

	agentRow := r.db.QueryRow(ctx, `
		SELECT `+agentColumns+`
		FROM agents
		WHERE id = $1
	`, key.AgentID)
	agent, err := scanAgent(agentRow)
	if err != nil {
		return nil, nil, err
	}

	return key, agent, nil
}

func (r *Repository) UpdateAPIKeyLastUsed(ctx context.Context, keyID string) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		UPDATE agent_api_keys
		SET last_used_at = now(), updated_at = now()
		WHERE id = $1
	`, keyID)
	return err
}

func scanAPIKey(row pgx.Row) (*APIKey, error) {
	var key APIKey
	if err := row.Scan(
		&key.ID, &key.AgentID, &key.Name, &key.KeyPrefix, &key.KeyHash,
		&key.ExpiresAt, &key.LastUsedAt, &key.RevokedAt, &key.CreatedAt, &key.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, err
	}

	return &key, nil
}

// ---- Enrollment tokens ----

func (r *Repository) CreateEnrollmentToken(ctx context.Context, token *EnrollmentToken) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO agent_enrollment_tokens (
			id, agent_id, token_hash, expires_at, used_at, revoked_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, token.ID, token.AgentID, token.TokenHash, token.ExpiresAt, token.UsedAt, token.RevokedAt, token.CreatedAt)
	return err
}

// RevokeEnrollmentTokens revokes every outstanding token for an agent.
func (r *Repository) RevokeEnrollmentTokens(ctx context.Context, agentID string) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		UPDATE agent_enrollment_tokens
		SET revoked_at = now()
		WHERE agent_id = $1 AND used_at IS NULL AND revoked_at IS NULL
	`, agentID)
	return err
}

type enrollParams struct {
	TokenHash string
	Hostname  string
	DeviceID  string
	Version   string
	Region    string
	NewKey    *APIKey
}

// EnrollAgent consumes a single-use enrollment token and binds the agent in one
// transaction. It returns the enrolled agent and the freshly issued API key.
func (r *Repository) EnrollAgent(ctx context.Context, params enrollParams) (*Agent, *APIKey, error) {
	if err := r.available(); err != nil {
		return nil, nil, err
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var token EnrollmentToken
	err = tx.QueryRow(ctx, `
		SELECT id, agent_id, token_hash, expires_at, used_at, revoked_at, created_at
		FROM agent_enrollment_tokens
		WHERE token_hash = $1
		FOR UPDATE
	`, params.TokenHash).Scan(
		&token.ID, &token.AgentID, &token.TokenHash, &token.ExpiresAt,
		&token.UsedAt, &token.RevokedAt, &token.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, ErrEnrollmentTokenNotFound
	}
	if err != nil {
		return nil, nil, err
	}

	if token.RevokedAt != nil {
		return nil, nil, ErrEnrollmentTokenRevoked
	}
	if token.UsedAt != nil {
		return nil, nil, ErrEnrollmentTokenUsed
	}
	if time.Now().UTC().After(token.ExpiresAt) {
		return nil, nil, ErrEnrollmentTokenExpired
	}

	var agent Agent
	row := tx.QueryRow(ctx, `
		SELECT `+agentColumns+`
		FROM agents
		WHERE id = $1
		FOR UPDATE
	`, token.AgentID)
	agentPtr, err := scanAgent(row)
	if err != nil {
		return nil, nil, err
	}
	agent = *agentPtr

	if agent.Status == AgentStatusDisabled {
		return nil, nil, ErrAgentDisabled
	}

	now := time.Now().UTC()
	agent.Hostname = params.Hostname
	agent.DeviceID = params.DeviceID
	agent.Version = params.Version
	agent.Region = params.Region
	agent.Status = AgentStatusOnline
	agent.LastSeenAt = &now
	agent.UpdatedAt = now

	if _, err := tx.Exec(ctx, `
		UPDATE agents
		SET hostname = $2, device_id = $3, version = $4, region = $5,
			status = 'online', last_seen_at = now(), updated_at = now()
		WHERE id = $1
	`, agent.ID, agent.Hostname, agent.DeviceID, agent.Version, agent.Region); err != nil {
		return nil, nil, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE agent_enrollment_tokens
		SET used_at = now()
		WHERE id = $1
	`, token.ID); err != nil {
		return nil, nil, err
	}

	if params.NewKey != nil {
		params.NewKey.AgentID = agent.ID
		if _, err := tx.Exec(ctx, `
			INSERT INTO agent_api_keys (
				id, agent_id, name, key_prefix, key_hash, expires_at, last_used_at, revoked_at, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, params.NewKey.ID, params.NewKey.AgentID, params.NewKey.Name, params.NewKey.KeyPrefix,
			params.NewKey.KeyHash, params.NewKey.ExpiresAt, params.NewKey.LastUsedAt,
			params.NewKey.RevokedAt, params.NewKey.CreatedAt, params.NewKey.UpdatedAt); err != nil {
			return nil, nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	return &agent, params.NewKey, nil
}

// ---- Agent logs ----

func (r *Repository) InsertAgentLog(ctx context.Context, log *AgentLog) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO agent_logs (id, agent_id, level, message, context, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, log.ID, log.AgentID, log.Level, log.Message, log.Context, log.CreatedAt)
	return err
}

func (r *Repository) ListAgentLogs(ctx context.Context, agentID string, limit int, cursor string) ([]AgentLog, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 100
	}

	var rows pgx.Rows
	var err error
	if cursor != "" {
		rows, err = r.db.Query(ctx, `
			SELECT id, agent_id, level, message, context, created_at
			FROM agent_logs
			WHERE agent_id = $1 AND created_at < (SELECT created_at FROM agent_logs WHERE id = $2)
			ORDER BY created_at DESC
			LIMIT $3
		`, agentID, cursor, limit)
	} else {
		rows, err = r.db.Query(ctx, `
			SELECT id, agent_id, level, message, context, created_at
			FROM agent_logs
			WHERE agent_id = $1
			ORDER BY created_at DESC
			LIMIT $2
		`, agentID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]AgentLog, 0)
	for rows.Next() {
		var log AgentLog
		if err := rows.Scan(&log.ID, &log.AgentID, &log.Level, &log.Message, &log.Context, &log.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, rows.Err()
}

// ---- Check results ----

func (r *Repository) ListCheckResults(ctx context.Context, monitorID string, limit int) ([]monitors.CheckResult, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 100
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, monitor_id, agent_id, status_code, latency_ms, success, error_message, checked_at, created_at
		FROM check_results
		WHERE monitor_id = $1
		ORDER BY checked_at DESC
		LIMIT $2
	`, monitorID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]monitors.CheckResult, 0)
	for rows.Next() {
		var result monitors.CheckResult
		if err := rows.Scan(&result.ID, &result.MonitorID, &result.AgentID, &result.StatusCode,
			&result.LatencyMS, &result.Success, &result.ErrorMessage, &result.CheckedAt, &result.CreatedAt); err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, rows.Err()
}

func (r *Repository) ListCheckResultsByAgent(ctx context.Context, agentID string, limit int) ([]monitors.CheckResult, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 100
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, monitor_id, agent_id, status_code, latency_ms, success, error_message, checked_at, created_at
		FROM check_results
		WHERE agent_id = $1
		ORDER BY checked_at DESC
		LIMIT $2
	`, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]monitors.CheckResult, 0)
	for rows.Next() {
		var result monitors.CheckResult
		if err := rows.Scan(&result.ID, &result.MonitorID, &result.AgentID, &result.StatusCode,
			&result.LatencyMS, &result.Success, &result.ErrorMessage, &result.CheckedAt, &result.CreatedAt); err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, rows.Err()
}

// ---- Agent-facing endpoints ----

func (r *Repository) UpdateAgentHeartbeat(ctx context.Context, agentID string, req HeartbeatRequest) error {
	if err := r.available(); err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, `
		UPDATE agents
		SET hostname = COALESCE(NULLIF($2, ''), hostname),
			version = COALESCE(NULLIF($3, ''), version),
			region = COALESCE(NULLIF($4, ''), region),
			cpu_usage = $5,
			memory_usage = $6,
			status = 'online',
			last_seen_at = now(),
			updated_at = now()
		WHERE id = $1
	`, agentID, strings.TrimSpace(req.Hostname), strings.TrimSpace(req.Version),
		strings.TrimSpace(req.Region), req.CPUUsage, req.MemoryUsage)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrAgentNotFound
	}
	return nil
}

func (r *Repository) ListAgentJobs(ctx context.Context, userID string) ([]AgentJob, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, name, url, method, timeout_ms, expected_status, interval_seconds
		FROM monitors
		WHERE user_id = $1 AND enabled = true
		ORDER BY created_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := make([]AgentJob, 0)
	for rows.Next() {
		var job AgentJob
		if err := rows.Scan(
			&job.MonitorID, &job.Name, &job.URL, &job.Method,
			&job.TimeoutMS, &job.ExpectedStatus, &job.IntervalSeconds,
		); err != nil {
			return nil, err
		}
		jobs = append(jobs, job)
	}
	return jobs, rows.Err()
}

func (r *Repository) MonitorBelongsToUser(ctx context.Context, monitorID, userID string) (bool, error) {
	if err := r.available(); err != nil {
		return false, err
	}

	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM monitors WHERE id = $1 AND user_id = $2)
	`, monitorID, userID).Scan(&exists)
	return exists, err
}

func (r *Repository) InsertCheckResult(ctx context.Context, result *monitors.CheckResult) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO check_results (
			id, monitor_id, agent_id, status_code, latency_ms, success, error_message, checked_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, result.ID, result.MonitorID, result.AgentID, result.StatusCode,
		result.LatencyMS, result.Success, result.ErrorMessage, result.CheckedAt, result.CreatedAt)
	return err
}

// ---- System metrics ----

func (r *Repository) InsertSystemMetrics(ctx context.Context, id, agentID string, metricsData map[string]interface{}, collectedAt, createdAt time.Time) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO system_metrics (id, agent_id, metrics, collected_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, id, agentID, metricsData, collectedAt, createdAt)
	return err
}

func (r *Repository) ListSystemMetrics(ctx context.Context, agentID string, limit int) ([]SystemMetricsResponse, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 100
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, agent_id, metrics, collected_at, created_at
		FROM system_metrics
		WHERE agent_id = $1
		ORDER BY collected_at DESC
		LIMIT $2
	`, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	metrics := make([]SystemMetricsResponse, 0)
	for rows.Next() {
		var m SystemMetricsResponse
		if err := rows.Scan(&m.ID, &m.AgentID, &m.Metrics, &m.CollectedAt, &m.CreatedAt); err != nil {
			return nil, err
		}
		metrics = append(metrics, m)
	}
	return metrics, rows.Err()
}
