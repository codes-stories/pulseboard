package agents

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"
)

type LogProxyService struct {
	erlangAgentURL string
	httpClient     *http.Client
}

func NewLogProxyService(erlangAgentURL string) *LogProxyService {
	return &LogProxyService{
		erlangAgentURL: erlangAgentURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// LogEntry represents a log entry from the Erlang agent
type LogEntry struct {
	ID        string                 `json:"id"`
	AgentID   string                 `json:"agent_id"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Context   map[string]interface{} `json:"context"`
	Timestamp string                 `json:"timestamp"`
}

type LogsResponse struct {
	Status string     `json:"status"`
	Logs   []LogEntry `json:"logs"`
}

type AppendLogRequest struct {
	AgentID string                 `json:"agent_id"`
	Level   string                 `json:"level"`
	Message string                 `json:"message"`
	Context map[string]interface{} `json:"context"`
}

type AppendLogResponse struct {
	Status string   `json:"status"`
	Action string   `json:"action"`
	Log    LogEntry `json:"log"`
}

// ListLogs fetches logs from the Erlang agent
func (s *LogProxyService) ListLogs(ctx context.Context) ([]LogEntry, error) {
	url := s.erlangAgentURL + "/api/v1/logs"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req.WithContext(ctx))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, ErrInvalidInput
	}

	var response LogsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return response.Logs, nil
}

// AppendLog sends a log entry to the Erlang agent
func (s *LogProxyService) AppendLog(ctx context.Context, req AppendLogRequest) (*LogEntry, error) {
	url := s.erlangAgentURL + "/api/v1/logs"

	payload := map[string]interface{}{
		"agent_id": req.AgentID,
		"level":    req.Level,
		"message":  req.Message,
		"context":  req.Context,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, ErrInvalidInput
	}

	var response struct {
		Status string `json:"status"`
		Action string `json:"action"`
		Log    struct {
			ID        string                 `json:"id"`
			AgentID   string                 `json:"agent_id"`
			Level     string                 `json:"level"`
			Message   string                 `json:"message"`
			Context   map[string]interface{} `json:"context"`
			Timestamp string                 `json:"timestamp"`
		} `json:"log"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return &LogEntry{
		ID:        response.Log.ID,
		AgentID:   response.Log.AgentID,
		Level:     response.Log.Level,
		Message:   response.Log.Message,
		Context:   response.Log.Context,
		Timestamp: response.Log.Timestamp,
	}, nil
}

// ListLogsHandler handles GET /logs - lists logs from Erlang agent
func (s *LogProxyService) ListLogsHandler(w http.ResponseWriter, r *http.Request) {
	logs, err := s.ListLogs(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch logs from agent", http.StatusBadGateway)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status": "ok",
		"logs":   logs,
	})
}

// AppendLogHandler handles POST /logs - appends a log to the Erlang agent
func (s *LogProxyService) AppendLogHandler(w http.ResponseWriter, r *http.Request) {
	var req AppendLogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	log, err := s.AppendLog(r.Context(), req)
	if err != nil {
		http.Error(w, "failed to append log to agent", http.StatusBadGateway)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"status": "ok",
		"action": "log",
		"log":    log,
	})
}
