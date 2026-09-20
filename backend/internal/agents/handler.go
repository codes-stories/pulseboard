package agents

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

type Handler struct {
	service  *Service
	logProxy *LogProxyService
}

func NewHandler(service *Service, logProxy *LogProxyService) *Handler {
	return &Handler{service: service, logProxy: logProxy}
}

// ---- User-facing handlers ----

// @Summary List agents
// @Tags Agents
// @Description List all agents owned by the authenticated user.
// @Security BearerAuth
// @Produce json
// @Success 200 {array} agents.AgentResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agents [get]
func (h *Handler) ListAgents(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	agents, err := h.service.ListAgents(r.Context(), user.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, agents)
}

// @Summary Create an agent
// @Tags Agents
// @Description Register a new (pending) agent for the authenticated user.
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body agents.CreateAgentRequest true "Agent details"
// @Success 201 {object} agents.AgentResponse
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agents [post]
func (h *Handler) CreateAgent(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req CreateAgentRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	agent, err := h.service.CreateAgent(r.Context(), user.ID, req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, agent)
}

// @Summary Get an agent
// @Tags Agents
// @Description Get a single agent owned by the authenticated user.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Success 200 {object} agents.AgentResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID} [get]
func (h *Handler) GetAgent(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	agent, err := h.service.GetAgent(r.Context(), user.ID, chi.URLParam(r, "agentID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, agent)
}

// @Summary Update an agent
// @Tags Agents
// @Description Update agent metadata. Only the owner may update their agent.
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param agentID path string true "Agent ID"
// @Param request body agents.UpdateAgentRequest true "Fields to update"
// @Success 200 {object} agents.AgentResponse
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID} [patch]
func (h *Handler) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req UpdateAgentRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	agent, err := h.service.UpdateAgent(r.Context(), user.ID, chi.URLParam(r, "agentID"), req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, agent)
}

// @Summary Delete an agent
// @Tags Agents
// @Description Delete an agent and all of its API keys. Only the owner may delete.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Success 204
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID} [delete]
func (h *Handler) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	if err := h.service.DeleteAgent(r.Context(), user.ID, chi.URLParam(r, "agentID")); err != nil {
		writeServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Create an agent API key
// @Tags API Keys
// @Description Issue a new agent API key. The plaintext key is returned exactly once.
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param agentID path string true "Agent ID"
// @Param request body agents.CreateAPIKeyRequest true "Key name"
// @Success 201 {object} agents.APIKeyCreatedResponse
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID}/api-keys [post]
func (h *Handler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req CreateAPIKeyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	key, err := h.service.CreateAPIKey(r.Context(), user.ID, chi.URLParam(r, "agentID"), req.Name)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, key)
}

// @Summary List agent API keys
// @Tags API Keys
// @Description List API keys for an agent. Secrets are never returned.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Success 200 {array} agents.APIKeyResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID}/api-keys [get]
func (h *Handler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	keys, err := h.service.ListAPIKeys(r.Context(), user.ID, chi.URLParam(r, "agentID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, keys)
}

// @Summary Revoke an agent API key
// @Tags API Keys
// @Description Revoke an agent API key. Revocation is permanent.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Param keyID path string true "API key ID"
// @Success 204
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID}/api-keys/{keyID}/revoke [post]
func (h *Handler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	if err := h.service.RevokeAPIKey(r.Context(), user.ID, chi.URLParam(r, "agentID"), chi.URLParam(r, "keyID")); err != nil {
		writeServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Rotate an agent API key
// @Tags API Keys
// @Description Revoke the current key and issue a fresh one. The new plaintext key is returned exactly once.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Param keyID path string true "API key ID"
// @Success 200 {object} agents.APIKeyCreatedResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID}/api-keys/{keyID}/rotate [post]
func (h *Handler) RotateAPIKey(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	key, err := h.service.RotateAPIKey(r.Context(), user.ID, chi.URLParam(r, "agentID"), chi.URLParam(r, "keyID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, key)
}

// @Summary Create an enrollment token
// @Tags Enrollment
// @Description Issue a short-lived single-use enrollment token for an agent.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Success 201 {object} agents.EnrollmentTokenResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agents/{agentID}/enrollment-token [post]
func (h *Handler) CreateEnrollmentToken(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	token, err := h.service.CreateEnrollmentToken(r.Context(), user.ID, chi.URLParam(r, "agentID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, token)
}

// @Summary Agent installation metadata
// @Tags Agents
// @Description Installation command and download metadata for the frontend.
// @Security BearerAuth
// @Produce json
// @Success 200 {object} agents.InstallationResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agents/installation [get]
func (h *Handler) InstallationInfo(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.service.InstallationInfo())
}

// ---- Agent-facing handlers ----

// @Summary Enroll an agent
// @Tags Agent API
// @Description Consume a single-use enrollment token to bind an agent and issue its first API key.
// @Accept json
// @Produce json
// @Param request body agents.AgentEnrollRequest true "Enrollment details"
// @Success 200 {object} agents.AgentEnrollResponse
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agent/enroll [post]
func (h *Handler) Enroll(w http.ResponseWriter, r *http.Request) {
	var req AgentEnrollRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.service.EnrollAgent(r.Context(), req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// @Summary Rotate the agent's own API key
// @Tags Agent API
// @Description Revoke the API key used for this request and issue a fresh one. The new plaintext key is returned exactly once.
// @Security AgentAuth
// @Produce json
// @Success 200 {object} agents.APIKeyCreatedResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agent/api-key/rotate [post]
func (h *Handler) RotateAPIKeyByAgent(w http.ResponseWriter, r *http.Request) {
	agent, ok := authmw.AgentFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid agent credentials")
		return
	}

	key, err := h.service.RotateAPIKey(r.Context(), agent.UserID, agent.AgentID, agent.KeyID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, key)
}

// @Summary Agent heartbeat
// @Tags Agent API
// @Description Update agent status and telemetry. Called periodically by the agent.
// @Security AgentAuth
// @Accept json
// @Produce json
// @Param request body agents.HeartbeatRequest true "Heartbeat payload"
// @Success 204
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agent/heartbeat [post]
func (h *Handler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	agent, ok := authmw.AgentFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid agent credentials")
		return
	}

	var req HeartbeatRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.Heartbeat(r.Context(), agent.AgentID, req); err != nil {
		writeServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary List agent jobs
// @Tags Agent API
// @Description Return monitoring jobs assigned to the agent's owner.
// @Security AgentAuth
// @Produce json
// @Success 200 {object} agents.JobsResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agent/jobs [get]
func (h *Handler) ListJobs(w http.ResponseWriter, r *http.Request) {
	agent, ok := authmw.AgentFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid agent credentials")
		return
	}

	jobs, err := h.service.ListJobs(r.Context(), agent.UserID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, jobs)
}

// @Summary Ingest a check result
// @Tags Agent API
// @Description Report a monitoring check result from the agent.
// @Security AgentAuth
// @Accept json
// @Produce json
// @Param request body agents.CheckResultRequest true "Check result"
// @Success 204
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 404 {object} agents.ErrorResponse
// @Router /agent/check-results [post]
func (h *Handler) IngestCheckResult(w http.ResponseWriter, r *http.Request) {
	agent, ok := authmw.AgentFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid agent credentials")
		return
	}

	var req CheckResultRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.IngestCheckResult(r.Context(), agent.AgentID, agent.UserID, req); err != nil {
		writeServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Ingest an agent log
// @Tags Agent API
// @Description Submit a log entry from the agent to be stored in the backend.
// @Security AgentAuth
// @Accept json
// @Produce json
// @Param request body agents.AgentLogIngestRequest true "Log entry"
// @Success 201 {object} agents.AgentLogResponse
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agent/logs [post]
func (h *Handler) IngestAgentLog(w http.ResponseWriter, r *http.Request) {
	agent, ok := authmw.AgentFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid agent credentials")
		return
	}

	var req AgentLogIngestRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	log, err := h.service.IngestAgentLog(r.Context(), agent.AgentID, req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, log)
}

// @Summary List agent logs
// @Tags Agent API
// @Description List logs for a specific agent.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Param limit query int false "Max results (default 100)"
// @Param cursor query string false "Cursor for pagination"
// @Success 200 {object} agents.AgentLogsResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agents/{agentID}/logs [get]
func (h *Handler) ListAgentLogs(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	agentID := chi.URLParam(r, "agentID")
	if _, err := h.service.GetAgent(r.Context(), user.ID, agentID); err != nil {
		writeServiceError(w, err)
		return
	}

	limit := 100
	cursor := r.URL.Query().Get("cursor")

	logs, err := h.service.ListAgentLogs(r.Context(), agentID, limit, cursor)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	resp := make([]AgentLogResponse, 0, len(logs))
	for _, l := range logs {
		resp = append(resp, AgentLogResponse{
			ID:        l.ID,
			AgentID:   l.AgentID,
			Level:     l.Level,
			Message:   l.Message,
			Context:   l.Context,
			CreatedAt: l.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, AgentLogsResponse{Logs: resp})
}

// @Summary List check results for an agent
// @Tags Agent API
// @Description List check results submitted by a specific agent.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Param limit query int false "Max results (default 100)"
// @Success 200 {object} agents.CheckResultsResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agents/{agentID}/results [get]
func (h *Handler) ListAgentCheckResults(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	agentID := chi.URLParam(r, "agentID")
	if _, err := h.service.GetAgent(r.Context(), user.ID, agentID); err != nil {
		writeServiceError(w, err)
		return
	}

	limit := 100
	results, err := h.service.ListCheckResultsByAgent(r.Context(), agentID, limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	resp := make([]CheckResultResponse, 0, len(results))
	for _, r := range results {
		resp = append(resp, CheckResultResponse{
			ID:           r.ID,
			MonitorID:    r.MonitorID,
			AgentID:      r.AgentID,
			StatusCode:   r.StatusCode,
			LatencyMS:    r.LatencyMS,
			Success:      r.Success,
			ErrorMessage: r.ErrorMessage,
			CheckedAt:    r.CheckedAt,
			CreatedAt:    r.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, CheckResultsResponse{Results: resp})
}

// @Summary Ingest system metrics from agent
// @Tags Agent API
// @Description Submit system metrics (scraped from Go backend) to be stored.
// @Security AgentAuth
// @Accept json
// @Produce json
// @Param request body agents.SystemMetricsIngestRequest true "System metrics"
// @Success 204
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agent/system-metrics [post]
func (h *Handler) IngestSystemMetrics(w http.ResponseWriter, r *http.Request) {
	agent, ok := authmw.AgentFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid agent credentials")
		return
	}

	var req SystemMetricsIngestRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.IngestSystemMetrics(r.Context(), agent.AgentID, req); err != nil {
		writeServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary List system metrics for an agent
// @Tags Agents
// @Description List system metrics collected for a specific agent.
// @Security BearerAuth
// @Produce json
// @Param agentID path string true "Agent ID"
// @Param limit query int false "Max results (default 100)"
// @Success 200 {object} agents.SystemMetricsListResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /agents/{agentID}/system-metrics [get]
func (h *Handler) ListSystemMetrics(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	agentID := chi.URLParam(r, "agentID")
	if _, err := h.service.GetAgent(r.Context(), user.ID, agentID); err != nil {
		writeServiceError(w, err)
		return
	}

	limit := 100
	metrics, err := h.service.ListSystemMetrics(r.Context(), agentID, limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, SystemMetricsListResponse{Metrics: metrics})
}

// ---- helpers ----

func decodeJSON(r *http.Request, dst any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(dst)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, ErrorResponse{Error: message})
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrAgentNotFound), errors.Is(err, ErrAPIKeyNotFound), errors.Is(err, ErrMonitorNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrAgentDisabled):
		writeError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, ErrRateLimitExceeded):
		writeError(w, http.StatusTooManyRequests, err.Error())
	case errors.Is(err, ErrInvalidCredentials),
		errors.Is(err, ErrEnrollmentTokenNotFound),
		errors.Is(err, ErrEnrollmentTokenExpired),
		errors.Is(err, ErrEnrollmentTokenUsed),
		errors.Is(err, ErrEnrollmentTokenRevoked):
		writeError(w, http.StatusUnauthorized, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

// =========================================================================
// Logs Proxy Handlers (proxied to Erlang agent)
// =========================================================================

// @Summary List logs from Erlang agent
// @Tags Logs
// @Description List logs from the Erlang agent
// @Security BearerAuth
// @Produce json
// @Success 200 {object} agents.LogsResponse
// @Failure 401 {object} agents.ErrorResponse
// @Failure 500 {object} agents.ErrorResponse
// @Router /logs [get]
func (h *Handler) ListLogsHandler(w http.ResponseWriter, r *http.Request) {
	logs, err := h.logProxy.ListLogs(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch logs from agent")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status": "ok",
		"logs":   logs,
	})
}

// @Summary Append log to Erlang agent
// @Tags Logs
// @Description Append a log entry to the Erlang agent
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body agents.AppendLogRequest true "Log entry"
// @Success 201 {object} agents.AppendLogResponse
// @Failure 400 {object} agents.ErrorResponse
// @Failure 401 {object} agents.ErrorResponse
// @Router /logs [post]
func (h *Handler) AppendLogHandler(w http.ResponseWriter, r *http.Request) {
	var req AppendLogRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	log, err := h.logProxy.AppendLog(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to append log to agent")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"status": "ok",
		"action": "log",
		"log":    log,
	})
}
