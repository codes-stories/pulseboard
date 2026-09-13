package agents

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"strings"
	"time"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
	"github.com/gaurav/pulseboard/internal/monitors"
)

type Config struct {
	EnrollmentTokenTTL time.Duration
	APIKeyTTL          time.Duration
	InstallURL         string
	DownloadBaseURL    string
	Version            string
	ErlangAgentURL     string
}

type Service struct {
	repository *Repository
	config     Config
}

func NewService(repository *Repository, config Config) *Service {
	if config.EnrollmentTokenTTL <= 0 {
		config.EnrollmentTokenTTL = 15 * time.Minute
	}
	if config.APIKeyTTL <= 0 {
		config.APIKeyTTL = 8760 * time.Hour
	}
	if config.InstallURL == "" {
		config.InstallURL = "https://install.pulseboard.dev"
	}
	if config.DownloadBaseURL == "" {
		config.DownloadBaseURL = "https://downloads.pulseboard.dev"
	}
	if config.Version == "" {
		config.Version = "0.1.0"
	}

	return &Service{repository: repository, config: config}
}

func (s *Service) CreateAgent(ctx context.Context, userID string, req CreateAgentRequest) (*AgentResponse, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, ErrInvalidInput
	}

	now := time.Now().UTC()
	agent := &Agent{
		ID:        newID(),
		UserID:    userID,
		Name:      strings.TrimSpace(req.Name),
		Hostname:  strings.TrimSpace(req.Hostname),
		ServerID:  strings.TrimSpace(req.ServerID),
		Region:    strings.TrimSpace(req.Region),
		Status:    AgentStatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repository.CreateAgent(ctx, agent); err != nil {
		return nil, err
	}

	return toAgentResponse(agent), nil
}

func (s *Service) ListAgents(ctx context.Context, userID string) ([]AgentResponse, error) {
	agents, err := s.repository.ListAgents(ctx, userID)
	if err != nil {
		return nil, err
	}

	responses := make([]AgentResponse, 0, len(agents))
	for i := range agents {
		responses = append(responses, *toAgentResponse(&agents[i]))
	}
	return responses, nil
}

func (s *Service) GetAgent(ctx context.Context, userID, agentID string) (*AgentResponse, error) {
	agent, err := s.repository.GetAgentByID(ctx, agentID, userID)
	if err != nil {
		return nil, err
	}
	return toAgentResponse(agent), nil
}

func (s *Service) UpdateAgent(ctx context.Context, userID, agentID string, req UpdateAgentRequest) (*AgentResponse, error) {
	agent, err := s.repository.GetAgentByID(ctx, agentID, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, ErrInvalidInput
		}
		agent.Name = name
	}
	if req.Hostname != nil {
		agent.Hostname = strings.TrimSpace(*req.Hostname)
	}
	if req.Version != nil {
		agent.Version = strings.TrimSpace(*req.Version)
	}
	if req.Region != nil {
		agent.Region = strings.TrimSpace(*req.Region)
	}
	if req.Status != nil {
		status := AgentStatus(strings.TrimSpace(*req.Status))
		if !status.Valid() {
			return nil, ErrInvalidInput
		}
		agent.Status = status
	}

	if err := s.repository.UpdateAgent(ctx, agent); err != nil {
		return nil, err
	}

	return toAgentResponse(agent), nil
}

func (s *Service) DeleteAgent(ctx context.Context, userID, agentID string) error {
	return s.repository.DeleteAgent(ctx, agentID, userID)
}

// CreateAPIKey issues a new agent API key and returns the plaintext exactly
// once. Only the hash and a display prefix are persisted.
func (s *Service) CreateAPIKey(ctx context.Context, userID, agentID, name string) (*APIKeyCreatedResponse, error) {
	if strings.TrimSpace(name) == "" {
		return nil, ErrInvalidInput
	}
	if _, err := s.repository.GetAgentByID(ctx, agentID, userID); err != nil {
		return nil, err
	}

	plaintext, prefix, hash, err := GenerateAPIKey()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	expiresAt := now.Add(s.config.APIKeyTTL)
	key := &APIKey{
		ID:        newID(),
		AgentID:   agentID,
		Name:      strings.TrimSpace(name),
		KeyPrefix: prefix,
		KeyHash:   hash,
		ExpiresAt: &expiresAt,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repository.CreateAPIKey(ctx, key); err != nil {
		return nil, err
	}

	return &APIKeyCreatedResponse{
		ID:        key.ID,
		Name:      key.Name,
		Key:       plaintext,
		Prefix:    key.KeyPrefix,
		ExpiresAt: key.ExpiresAt,
		CreatedAt: key.CreatedAt,
	}, nil
}

func (s *Service) ListAPIKeys(ctx context.Context, userID, agentID string) ([]APIKeyResponse, error) {
	keys, err := s.repository.ListAPIKeys(ctx, agentID, userID)
	if err != nil {
		return nil, err
	}

	responses := make([]APIKeyResponse, 0, len(keys))
	for i := range keys {
		responses = append(responses, toAPIKeyResponse(&keys[i]))
	}
	return responses, nil
}

func (s *Service) RevokeAPIKey(ctx context.Context, userID, agentID, keyID string) error {
	if _, err := s.repository.GetAgentByID(ctx, agentID, userID); err != nil {
		return err
	}
	return s.repository.RevokeAPIKey(ctx, keyID, agentID, userID)
}

// RotateAPIKey revokes the existing key and issues a fresh one atomically. The
// new plaintext key is returned exactly once.
func (s *Service) RotateAPIKey(ctx context.Context, userID, agentID, keyID string) (*APIKeyCreatedResponse, error) {
	if _, err := s.repository.GetAgentByID(ctx, agentID, userID); err != nil {
		return nil, err
	}

	plaintext, prefix, hash, err := GenerateAPIKey()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	expiresAt := now.Add(s.config.APIKeyTTL)
	newKey := &APIKey{
		ID:        newID(),
		AgentID:   agentID,
		Name:      "rotated",
		KeyPrefix: prefix,
		KeyHash:   hash,
		ExpiresAt: &expiresAt,
		CreatedAt: now,
		UpdatedAt: now,
	}

	created, err := s.repository.RotateAPIKey(ctx, keyID, agentID, userID, newKey)
	if err != nil {
		return nil, err
	}

	return &APIKeyCreatedResponse{
		ID:        created.ID,
		Name:      created.Name,
		Key:       plaintext,
		Prefix:    created.KeyPrefix,
		ExpiresAt: created.ExpiresAt,
		CreatedAt: created.CreatedAt,
	}, nil
}

// CreateEnrollmentToken issues a short-lived single-use enrollment token for an
// agent. The plaintext token is returned exactly once; only its hash is stored.
func (s *Service) CreateEnrollmentToken(ctx context.Context, userID, agentID string) (*EnrollmentTokenResponse, error) {
	if _, err := s.repository.GetAgentByID(ctx, agentID, userID); err != nil {
		return nil, err
	}

	plaintext, hash, err := GenerateEnrollmentToken()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	token := &EnrollmentToken{
		ID:        newID(),
		AgentID:   agentID,
		TokenHash: hash,
		ExpiresAt: now.Add(s.config.EnrollmentTokenTTL),
		CreatedAt: now,
	}

	if err := s.repository.CreateEnrollmentToken(ctx, token); err != nil {
		return nil, err
	}

	return &EnrollmentTokenResponse{Token: plaintext, ExpiresAt: token.ExpiresAt}, nil
}

// AuthenticateAgent validates an agent API key and resolves the owning agent
// and user. It is the storage-backed half of the agent auth middleware.
func (s *Service) AuthenticateAgent(ctx context.Context, apiKey string) (*authmw.AuthenticatedAgent, error) {
	if !strings.HasPrefix(apiKey, apiKeyPrefix) {
		return nil, ErrInvalidCredentials
	}

	key, agent, err := s.repository.GetAPIKeyByHash(ctx, hashCredential(apiKey))
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if key.RevokedAt != nil {
		return nil, ErrInvalidCredentials
	}
	if key.ExpiresAt != nil && time.Now().UTC().After(*key.ExpiresAt) {
		return nil, ErrInvalidCredentials
	}
	if agent.Status == AgentStatusDisabled {
		return nil, ErrInvalidCredentials
	}

	_ = s.repository.UpdateAPIKeyLastUsed(ctx, key.ID)

	return &authmw.AuthenticatedAgent{AgentID: agent.ID, UserID: agent.UserID, Name: agent.Name, KeyID: key.ID}, nil
}

// EnrollAgent consumes an enrollment token, binds the agent, and issues its
// first API key. The enrollment flow is atomic and single-use.
func (s *Service) EnrollAgent(ctx context.Context, req AgentEnrollRequest) (*AgentEnrollResponse, error) {
	if strings.TrimSpace(req.EnrollmentToken) == "" {
		return nil, ErrInvalidInput
	}

	now := time.Now().UTC()
	expiresAt := now.Add(s.config.APIKeyTTL)
	plaintext, prefix, hash, err := GenerateAPIKey()
	if err != nil {
		return nil, err
	}

	newKey := &APIKey{
		ID:        newID(),
		AgentID:   "", // bound inside the transaction from the token's agent
		Name:      "enrollment",
		KeyPrefix: prefix,
		KeyHash:   hash,
		ExpiresAt: &expiresAt,
		CreatedAt: now,
		UpdatedAt: now,
	}

	params := enrollParams{
		TokenHash: hashCredential(strings.TrimSpace(req.EnrollmentToken)),
		Hostname:  strings.TrimSpace(req.Hostname),
		DeviceID:  strings.TrimSpace(req.DeviceID),
		Version:   strings.TrimSpace(req.Version),
		Region:    strings.TrimSpace(req.Region),
		NewKey:    newKey,
	}

	agent, issuedKey, err := s.repository.EnrollAgent(ctx, params)
	if err != nil {
		return nil, err
	}
	if issuedKey == nil {
		return nil, ErrInvalidInput
	}

	return &AgentEnrollResponse{
		Agent: *toAgentResponse(agent),
		APIKey: APIKeyCreatedResponse{
			ID:        issuedKey.ID,
			Name:      issuedKey.Name,
			Key:       plaintext,
			Prefix:    issuedKey.KeyPrefix,
			ExpiresAt: issuedKey.ExpiresAt,
			CreatedAt: issuedKey.CreatedAt,
		},
	}, nil
}

func (s *Service) Heartbeat(ctx context.Context, agentID string, req HeartbeatRequest) error {
	return s.repository.UpdateAgentHeartbeat(ctx, agentID, req)
}

func (s *Service) ListJobs(ctx context.Context, userID string) (*JobsResponse, error) {
	jobs, err := s.repository.ListAgentJobs(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &JobsResponse{Jobs: jobs}, nil
}

func (s *Service) IngestCheckResult(ctx context.Context, agentID, userID string, req CheckResultRequest) error {
	if strings.TrimSpace(req.MonitorID) == "" {
		return ErrInvalidInput
	}

	owned, err := s.repository.MonitorBelongsToUser(ctx, req.MonitorID, userID)
	if err != nil {
		return err
	}
	if !owned {
		return ErrMonitorNotFound
	}

	checkedAt := req.CheckedAt
	if checkedAt.IsZero() {
		checkedAt = time.Now().UTC()
	}

	result := &monitors.CheckResult{
		ID:           newID(),
		MonitorID:    req.MonitorID,
		AgentID:      agentID,
		StatusCode:   req.StatusCode,
		LatencyMS:    req.LatencyMS,
		Success:      req.Success,
		ErrorMessage: req.Error,
		CheckedAt:    checkedAt,
		CreatedAt:    time.Now().UTC(),
	}

	return s.repository.InsertCheckResult(ctx, result)
}

func (s *Service) InstallationInfo() InstallationResponse {
	return InstallationResponse{
		InstallURL:      s.config.InstallURL,
		DownloadBaseURL: s.config.DownloadBaseURL,
		Version:         s.config.Version,
	}
}

func (s *Service) IngestAgentLog(ctx context.Context, agentID string, req AgentLogIngestRequest) (*AgentLog, error) {
	if strings.TrimSpace(req.Message) == "" {
		return nil, ErrInvalidInput
	}

	level := strings.TrimSpace(req.Level)
	if level == "" {
		level = "info"
	}

	log := &AgentLog{
		ID:        newID(),
		AgentID:   agentID,
		Level:     level,
		Message:   req.Message,
		Context:   req.Context,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.repository.InsertAgentLog(ctx, log); err != nil {
		return nil, err
	}

	return log, nil
}

func (s *Service) ListAgentLogs(ctx context.Context, agentID string, limit int, cursor string) ([]AgentLog, error) {
	return s.repository.ListAgentLogs(ctx, agentID, limit, cursor)
}

func (s *Service) ListCheckResults(ctx context.Context, monitorID string, limit int) ([]monitors.CheckResult, error) {
	return s.repository.ListCheckResults(ctx, monitorID, limit)
}

func (s *Service) ListCheckResultsByAgent(ctx context.Context, agentID string, limit int) ([]monitors.CheckResult, error) {
	return s.repository.ListCheckResultsByAgent(ctx, agentID, limit)
}

func toAgentResponse(agent *Agent) *AgentResponse {
	return &AgentResponse{
		ID:          agent.ID,
		UserID:      agent.UserID,
		Name:        agent.Name,
		Hostname:    agent.Hostname,
		DeviceID:    agent.DeviceID,
		ServerID:    agent.ServerID,
		Version:     agent.Version,
		Region:      agent.Region,
		Status:      agent.Status,
		LastSeenAt:  agent.LastSeenAt,
		CPUUsage:    agent.CPUUsage,
		MemoryUsage: agent.MemoryUsage,
		CreatedAt:   agent.CreatedAt,
		UpdatedAt:   agent.UpdatedAt,
	}
}

func toAPIKeyResponse(key *APIKey) APIKeyResponse {
	return APIKeyResponse{
		ID:         key.ID,
		AgentID:    key.AgentID,
		Name:       key.Name,
		Prefix:     key.KeyPrefix,
		LastUsedAt: key.LastUsedAt,
		ExpiresAt:  key.ExpiresAt,
		RevokedAt:  key.RevokedAt,
		CreatedAt:  key.CreatedAt,
	}
}

func newID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(buffer)
}
