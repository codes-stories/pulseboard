package agents

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// setupTestDB connects to a dedicated test database, applies migrations, and
// skips the test when TEST_DATABASE_URL is unset or unreachable. It never falls
// back to the development DATABASE_URL to avoid destructive migrations there.
// Each test gets its own pool and a freshly migrated schema, since tests insert
// rows with fixed identifiers.
func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database-backed tests")
	}

	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Skipf("cannot create pool from TEST_DATABASE_URL: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Skipf("database unreachable: %v", err)
	}

	// Clean any leftovers from a previous run (migrations in reverse order),
	// then apply all migrations in filename order for a fresh schema.
	runMigrations(t, pool, false)
	runMigrations(t, pool, true)

	t.Cleanup(func() {
		runMigrations(t, pool, false)
		pool.Close()
	})

	return pool
}

// runMigrations executes the -- +goose Up (up=true) or -- +goose Down (up=false)
// sections of every SQL file under backend/migrations directly, matching the
// goose CLI behavior without adding goose as a Go dependency.
func runMigrations(t *testing.T, pool *pgxpool.Pool, up bool) {
	t.Helper()

	files, err := filepath.Glob(filepath.Join("..", "..", "migrations", "*.sql"))
	if err != nil {
		t.Fatalf("glob migrations: %v", err)
	}
	sort.Strings(files)
	if !up {
		// Down migrations run in reverse order.
		for i, j := 0, len(files)-1; i < j; i, j = i+1, j-1 {
			files[i], files[j] = files[j], files[i]
		}
	}

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read migration %s: %v", file, err)
		}
		section := migrationSection(string(content), up)
		if section == "" {
			continue
		}
		if _, err := pool.Exec(context.Background(), section); err != nil {
			t.Fatalf("execute migration %s (up=%v): %v", file, up, err)
		}
	}
}

func migrationSection(content string, up bool) string {
	marker := "-- +goose Down"
	if up {
		marker = "-- +goose Up"
	}

	lines := strings.Split(content, "\n")
	var section []string
	capture := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "-- +goose") {
			capture = strings.Contains(trimmed, marker)
			continue
		}
		if capture {
			section = append(section, line)
		}
	}
	return strings.TrimSpace(strings.Join(section, "\n"))
}

func newTestService(t *testing.T) (*Service, *pgxpool.Pool) {
	t.Helper()
	pool := setupTestDB(t)
	return NewService(NewRepository(pool), Config{
		EnrollmentTokenTTL: 15 * time.Minute,
		APIKeyTTL:          24 * time.Hour,
	}), pool
}

func insertUser(t *testing.T, pool *pgxpool.Pool, email string) string {
	t.Helper()
	id := fmt.Sprintf("user-%s", email)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO auth_users (id, name, email, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, '', now(), now())
	`, id, "Test User", email)
	if err != nil {
		t.Fatalf("insert user: %v", err)
	}
	return id
}

func insertMonitor(t *testing.T, pool *pgxpool.Pool, id, userID, url string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO monitors (id, user_id, name, url, method, interval_seconds, timeout_ms, expected_status, enabled)
		VALUES ($1, $2, $3, $4, 'GET', 30, 5000, 200, true)
	`, id, userID, "mon-"+id, url)
	if err != nil {
		t.Fatalf("insert monitor: %v", err)
	}
}

func TestAgentCRUDAndOwnership(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userA := insertUser(t, pool, "crud-a@test.dev")
	userB := insertUser(t, pool, "crud-b@test.dev")

	created, err := service.CreateAgent(ctx, userA, CreateAgentRequest{Name: "prod-server"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}
	if created.Status != AgentStatusPending {
		t.Fatalf("expected pending status, got %s", created.Status)
	}

	got, err := service.GetAgent(ctx, userA, created.ID)
	if err != nil || got.ID != created.ID {
		t.Fatalf("owner get failed: agent=%v err=%v", got, err)
	}

	if _, err := service.GetAgent(ctx, userB, created.ID); err != ErrAgentNotFound {
		t.Fatalf("user B must not see user A's agent, got %v", err)
	}

	name := "renamed"
	if _, err := service.UpdateAgent(ctx, userA, created.ID, UpdateAgentRequest{Name: &name}); err != nil {
		t.Fatalf("owner update failed: %v", err)
	}
	if _, err := service.UpdateAgent(ctx, userB, created.ID, UpdateAgentRequest{Name: &name}); err != ErrAgentNotFound {
		t.Fatalf("user B must not update user A's agent, got %v", err)
	}

	listA, err := service.ListAgents(ctx, userA)
	if err != nil || len(listA) != 1 {
		t.Fatalf("expected 1 agent for A, got %v err=%v", listA, err)
	}
	listB, err := service.ListAgents(ctx, userB)
	if err != nil || len(listB) != 0 {
		t.Fatalf("expected 0 agents for B, got %v err=%v", listB, err)
	}

	if err := service.DeleteAgent(ctx, userB, created.ID); err != ErrAgentNotFound {
		t.Fatalf("user B must not delete user A's agent, got %v", err)
	}
	if err := service.DeleteAgent(ctx, userA, created.ID); err != nil {
		t.Fatalf("owner delete failed: %v", err)
	}
}

func TestCreateAgentRequiresName(t *testing.T) {
	service, pool := newTestService(t)
	userID := insertUser(t, pool, "name@test.dev")

	if _, err := service.CreateAgent(context.Background(), userID, CreateAgentRequest{}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput for empty name, got %v", err)
	}
}

func TestAPIKeyLifecycle(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userID := insertUser(t, pool, "keys@test.dev")
	agent, err := service.CreateAgent(ctx, userID, CreateAgentRequest{Name: "worker"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	created, err := service.CreateAPIKey(ctx, userID, agent.ID, "production")
	if err != nil {
		t.Fatalf("create key: %v", err)
	}
	if created.Key == "" || created.Prefix == "" {
		t.Fatalf("plaintext and prefix must be returned at creation")
	}

	// The plaintext must not be persisted.
	var storedHash, storedPrefix string
	err = pool.QueryRow(ctx, `SELECT key_hash, key_prefix FROM agent_api_keys WHERE id = $1`, created.ID).
		Scan(&storedHash, &storedPrefix)
	if err != nil {
		t.Fatalf("read stored key: %v", err)
	}
	if storedHash == created.Key {
		t.Fatalf("plaintext key must never be persisted")
	}
	if storedPrefix != created.Prefix {
		t.Fatalf("expected stored prefix %q, got %q", created.Prefix, storedPrefix)
	}

	// Listing never exposes the secret.
	keys, err := service.ListAPIKeys(ctx, userID, agent.ID)
	if err != nil || len(keys) != 1 {
		t.Fatalf("expected 1 key, got %v err=%v", keys, err)
	}
	if keys[0].ID != created.ID || keys[0].Prefix != created.Prefix {
		t.Fatalf("unexpected key listing: %+v", keys[0])
	}

	// The issued key authenticates.
	authed, err := service.AuthenticateAgent(ctx, created.Key)
	if err != nil {
		t.Fatalf("fresh key must authenticate: %v", err)
	}
	if authed.AgentID != agent.ID || authed.UserID != userID {
		t.Fatalf("unexpected auth identity: %+v", authed)
	}

	// Revocation takes effect.
	if err := service.RevokeAPIKey(ctx, userID, agent.ID, created.ID); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if _, err := service.AuthenticateAgent(ctx, created.Key); err != ErrInvalidCredentials {
		t.Fatalf("revoked key must be rejected, got %v", err)
	}

	// Rotation issues a fresh key and invalidates the previous one.
	fresh, err := service.CreateAPIKey(ctx, userID, agent.ID, "rotation")
	if err != nil {
		t.Fatalf("create key for rotation: %v", err)
	}
	rotated, err := service.RotateAPIKey(ctx, userID, agent.ID, fresh.ID)
	if err != nil {
		t.Fatalf("rotate: %v", err)
	}
	if rotated.Key == "" || rotated.Key == fresh.Key {
		t.Fatalf("rotation must return a new plaintext key")
	}
	if _, err := service.AuthenticateAgent(ctx, rotated.Key); err != nil {
		t.Fatalf("rotated key must authenticate: %v", err)
	}
	oldAuthed, err := service.AuthenticateAgent(ctx, fresh.Key)
	if err != ErrInvalidCredentials || oldAuthed != nil {
		t.Fatalf("rotated-away key must be rejected")
	}
}

func TestAPIKeyOwnership(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userA := insertUser(t, pool, "owner-a@test.dev")
	userB := insertUser(t, pool, "owner-b@test.dev")
	agent, err := service.CreateAgent(ctx, userA, CreateAgentRequest{Name: "a-agent"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	if _, err := service.CreateAPIKey(ctx, userB, agent.ID, "evil"); err != ErrAgentNotFound {
		t.Fatalf("user B must not create a key on user A's agent, got %v", err)
	}

	key, err := service.CreateAPIKey(ctx, userA, agent.ID, "legit")
	if err != nil {
		t.Fatalf("create key: %v", err)
	}

	if _, err := service.ListAPIKeys(ctx, userB, agent.ID); err != ErrAgentNotFound {
		t.Fatalf("user B must not list user A's keys, got %v", err)
	}

	if err := service.RevokeAPIKey(ctx, userB, agent.ID, key.ID); err != ErrAgentNotFound {
		t.Fatalf("user B must not revoke user A's key, got %v", err)
	}

	if _, err := service.RotateAPIKey(ctx, userB, agent.ID, key.ID); err != ErrAgentNotFound {
		t.Fatalf("user B must not rotate user A's key, got %v", err)
	}
}

func TestAuthenticateAgentFailures(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userID := insertUser(t, pool, "authfail@test.dev")

	if _, err := service.AuthenticateAgent(ctx, "not-an-agent-key"); err != ErrInvalidCredentials {
		t.Fatalf("garbage key must be rejected, got %v", err)
	}
	if _, err := service.AuthenticateAgent(ctx, "pb_agent_wrongsecret"); err != ErrInvalidCredentials {
		t.Fatalf("unknown key must be rejected, got %v", err)
	}

	agent, err := service.CreateAgent(ctx, userID, CreateAgentRequest{Name: "failing"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	// Expired key.
	expiredKey, _, hash, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	past := time.Now().UTC().Add(-time.Hour)
	if err := service.repository.CreateAPIKey(ctx, &APIKey{
		ID: "expired-key", AgentID: agent.ID, Name: "expired",
		KeyPrefix: "pb_agent_exp", KeyHash: hash, ExpiresAt: &past,
		CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("insert expired key: %v", err)
	}
	if _, err := service.AuthenticateAgent(ctx, expiredKey); err != ErrInvalidCredentials {
		t.Fatalf("expired key must be rejected, got %v", err)
	}

	// Disabled agent.
	disabledAgent, err := service.CreateAgent(ctx, userID, CreateAgentRequest{Name: "disabled"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}
	disabledStatus := string(AgentStatusDisabled)
	if _, err := service.UpdateAgent(ctx, userID, disabledAgent.ID, UpdateAgentRequest{Status: &disabledStatus}); err != nil {
		t.Fatalf("disable agent: %v", err)
	}
	disabledKey, err := service.CreateAPIKey(ctx, userID, disabledAgent.ID, "never")
	if err != nil {
		t.Fatalf("create key for disabled agent: %v", err)
	}
	if _, err := service.AuthenticateAgent(ctx, disabledKey.Key); err != ErrInvalidCredentials {
		t.Fatalf("key on disabled agent must be rejected, got %v", err)
	}
}

func TestEnrollmentFlow(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userID := insertUser(t, pool, "enroll@test.dev")
	agent, err := service.CreateAgent(ctx, userID, CreateAgentRequest{Name: "new-install"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	tokenResp, err := service.CreateEnrollmentToken(ctx, userID, agent.ID)
	if err != nil {
		t.Fatalf("create enrollment token: %v", err)
	}
	if tokenResp.Token == "" || !time.Now().UTC().Before(tokenResp.ExpiresAt) {
		t.Fatalf("expected a future token, got %+v", tokenResp)
	}

	// Token must be stored hashed only.
	var storedTokenHash string
	if err := pool.QueryRow(ctx, `SELECT token_hash FROM agent_enrollment_tokens WHERE agent_id = $1`, agent.ID).
		Scan(&storedTokenHash); err != nil {
		t.Fatalf("read token: %v", err)
	}
	if storedTokenHash == tokenResp.Token {
		t.Fatalf("enrollment token must never be stored in plaintext")
	}

	enrolled, err := service.EnrollAgent(ctx, AgentEnrollRequest{
		EnrollmentToken: tokenResp.Token,
		Hostname:        "server-01",
		DeviceID:        "device-123",
		Version:         "0.1.0",
		Region:          "us-east",
	})
	if err != nil {
		t.Fatalf("enroll: %v", err)
	}
	if enrolled.Agent.Status != AgentStatusOnline {
		t.Fatalf("expected online after enrollment, got %s", enrolled.Agent.Status)
	}
	if enrolled.Agent.Hostname != "server-01" || enrolled.Agent.DeviceID != "device-123" {
		t.Fatalf("agent metadata not bound: %+v", enrolled.Agent)
	}
	if enrolled.APIKey.Key == "" {
		t.Fatalf("enrollment must issue an API key")
	}
	if _, err := service.AuthenticateAgent(ctx, enrolled.APIKey.Key); err != nil {
		t.Fatalf("issued key must authenticate: %v", err)
	}

	// Single-use: a second attempt must fail.
	if _, err := service.EnrollAgent(ctx, AgentEnrollRequest{EnrollmentToken: tokenResp.Token}); err != ErrEnrollmentTokenUsed {
		t.Fatalf("expected ErrEnrollmentTokenUsed on replay, got %v", err)
	}
}

func TestEnrollmentTokenExpiredAndRevoked(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userID := insertUser(t, pool, "enroll-exp@test.dev")
	agent, err := service.CreateAgent(ctx, userID, CreateAgentRequest{Name: "expired-token"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	// Directly insert a token that is already expired.
	expiredPlaintext, expiredHash, err := GenerateEnrollmentToken()
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	past := time.Now().UTC().Add(-time.Minute)
	if err := service.repository.CreateEnrollmentToken(ctx, &EnrollmentToken{
		ID: "expired-token", AgentID: agent.ID, TokenHash: expiredHash,
		ExpiresAt: past, CreatedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("insert expired token: %v", err)
	}
	if _, err := service.EnrollAgent(ctx, AgentEnrollRequest{EnrollmentToken: expiredPlaintext}); err != ErrEnrollmentTokenExpired {
		t.Fatalf("expected ErrEnrollmentTokenExpired, got %v", err)
	}

	// Revoked token.
	revokedPlaintext, revokedHash, err := GenerateEnrollmentToken()
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	future := time.Now().UTC().Add(time.Hour)
	if err := service.repository.CreateEnrollmentToken(ctx, &EnrollmentToken{
		ID: "revoked-token", AgentID: agent.ID, TokenHash: revokedHash,
		ExpiresAt: future, CreatedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("insert revoked token: %v", err)
	}
	if err := service.repository.RevokeEnrollmentTokens(ctx, agent.ID); err != nil {
		t.Fatalf("revoke tokens: %v", err)
	}
	if _, err := service.EnrollAgent(ctx, AgentEnrollRequest{EnrollmentToken: revokedPlaintext}); err != ErrEnrollmentTokenRevoked {
		t.Fatalf("expected ErrEnrollmentTokenRevoked, got %v", err)
	}
}

func TestConcurrentEnrollmentSingleUse(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userID := insertUser(t, pool, "enroll-conc@test.dev")
	agent, err := service.CreateAgent(ctx, userID, CreateAgentRequest{Name: "concurrent"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	tokenResp, err := service.CreateEnrollmentToken(ctx, userID, agent.ID)
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	const attempts = 12
	var wg sync.WaitGroup
	results := make(chan error, attempts)
	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := service.EnrollAgent(ctx, AgentEnrollRequest{EnrollmentToken: tokenResp.Token})
			results <- err
		}()
	}
	wg.Wait()
	close(results)

	successes, usedFailures := 0, 0
	for err := range results {
		switch err {
		case nil:
			successes++
		case ErrEnrollmentTokenUsed:
			usedFailures++
		default:
			t.Fatalf("unexpected enrollment error: %v", err)
		}
	}
	if successes != 1 {
		t.Fatalf("exactly one concurrent enrollment must succeed, got %d", successes)
	}
	if usedFailures != attempts-1 {
		t.Fatalf("expected %d used failures, got %d", attempts-1, usedFailures)
	}
}

func TestHeartbeatUpdatesExistingAgent(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userID := insertUser(t, pool, "hb@test.dev")
	agent, err := service.CreateAgent(ctx, userID, CreateAgentRequest{Name: "hb-agent", Hostname: "old-host"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	if err := service.Heartbeat(ctx, agent.ID, HeartbeatRequest{
		Hostname: "new-host", Version: "0.2.0", Region: "eu-west",
		CPUUsage: 21.5, MemoryUsage: 42.3,
	}); err != nil {
		t.Fatalf("heartbeat: %v", err)
	}

	updated, err := service.GetAgent(ctx, userID, agent.ID)
	if err != nil {
		t.Fatalf("get agent: %v", err)
	}
	if updated.Status != AgentStatusOnline || updated.Hostname != "new-host" {
		t.Fatalf("heartbeat fields not applied: %+v", updated)
	}
	if updated.LastSeenAt == nil {
		t.Fatalf("last_seen_at must be updated")
	}

	// Heartbeats must never create new agent rows.
	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM agents WHERE user_id = $1`, userID).Scan(&count); err != nil {
		t.Fatalf("count agents: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 agent row after heartbeats, got %d", count)
	}
}

func TestJobsAndCheckResults(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userA := insertUser(t, pool, "jobs-a@test.dev")
	userB := insertUser(t, pool, "jobs-b@test.dev")
	agent, err := service.CreateAgent(ctx, userA, CreateAgentRequest{Name: "monitoring"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	insertMonitor(t, pool, "mon-1", userA, "https://api.example.com/health")
	insertMonitor(t, pool, "mon-2", userB, "https://other.example.com/health")

	jobs, err := service.ListJobs(ctx, userA)
	if err != nil {
		t.Fatalf("list jobs: %v", err)
	}
	if len(jobs.Jobs) != 1 {
		t.Fatalf("expected 1 job for user A, got %+v", jobs)
	}
	if jobs.Jobs[0].MonitorID != "mon-1" {
		t.Fatalf("unexpected job: %+v", jobs.Jobs[0])
	}

	// Ingesting a result for a monitor owned by another user must fail.
	if err := service.IngestCheckResult(ctx, agent.ID, userA, CheckResultRequest{
		MonitorID: "mon-2", StatusCode: 200, LatencyMS: 82, Success: true,
		CheckedAt: time.Now().UTC(),
	}); err != ErrMonitorNotFound {
		t.Fatalf("expected ErrMonitorNotFound for foreign monitor, got %v", err)
	}

	// Ingesting a result for an owned monitor persists a row.
	if err := service.IngestCheckResult(ctx, agent.ID, userA, CheckResultRequest{
		MonitorID: "mon-1", StatusCode: 200, LatencyMS: 82, Success: true,
		CheckedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("ingest check result: %v", err)
	}

	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM check_results WHERE monitor_id = 'mon-1'`).Scan(&count); err != nil {
		t.Fatalf("count check results: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 check result, got %d", count)
	}
}

func TestEnrollmentOwnership(t *testing.T) {
	service, pool := newTestService(t)
	ctx := context.Background()

	userA := insertUser(t, pool, "enroll-owner-a@test.dev")
	userB := insertUser(t, pool, "enroll-owner-b@test.dev")
	agent, err := service.CreateAgent(ctx, userA, CreateAgentRequest{Name: "owner-check"})
	if err != nil {
		t.Fatalf("create agent: %v", err)
	}

	if _, err := service.CreateEnrollmentToken(ctx, userB, agent.ID); err != ErrAgentNotFound {
		t.Fatalf("user B must not create tokens for user A's agent, got %v", err)
	}
}
