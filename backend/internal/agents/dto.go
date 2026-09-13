package agents

import "time"

type CreateAgentRequest struct {
	Name     string `json:"name"`
	Hostname string `json:"hostname,omitempty"`
	ServerID string `json:"server_id,omitempty"`
	Region   string `json:"region,omitempty"`
}

type UpdateAgentRequest struct {
	Name     *string `json:"name,omitempty"`
	Hostname *string `json:"hostname,omitempty"`
	Version  *string `json:"version,omitempty"`
	Region   *string `json:"region,omitempty"`
	Status   *string `json:"status,omitempty"`
}

type AgentResponse struct {
	ID          string      `json:"id"`
	UserID      string      `json:"user_id"`
	Name        string      `json:"name"`
	Hostname    string      `json:"hostname"`
	DeviceID    string      `json:"device_id"`
	ServerID    string      `json:"server_id"`
	Version     string      `json:"version"`
	Region      string      `json:"region"`
	Status      AgentStatus `json:"status"`
	LastSeenAt  *time.Time  `json:"last_seen_at,omitempty"`
	CPUUsage    float64     `json:"cpu_usage"`
	MemoryUsage float64     `json:"memory_usage"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type CreateAPIKeyRequest struct {
	Name string `json:"name"`
}

// APIKeyCreatedResponse returns the plaintext key exactly once at creation.
type APIKeyCreatedResponse struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Key       string     `json:"key"`
	Prefix    string     `json:"prefix"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// APIKeyResponse never contains the secret, only a display prefix.
type APIKeyResponse struct {
	ID         string     `json:"id"`
	AgentID    string     `json:"agent_id"`
	Name       string     `json:"name"`
	Prefix     string     `json:"prefix"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

type EnrollmentTokenResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type AgentEnrollRequest struct {
	EnrollmentToken string `json:"enrollment_token"`
	Hostname        string `json:"hostname"`
	DeviceID        string `json:"device_id"`
	Version         string `json:"version"`
	Region          string `json:"region"`
}

type AgentEnrollResponse struct {
	Agent  AgentResponse         `json:"agent"`
	APIKey APIKeyCreatedResponse `json:"api_key"`
}

type HeartbeatRequest struct {
	Hostname    string  `json:"hostname,omitempty"`
	Version     string  `json:"version,omitempty"`
	Region      string  `json:"region,omitempty"`
	CPUUsage    float64 `json:"cpu_usage,omitempty"`
	MemoryUsage float64 `json:"memory_usage,omitempty"`
}

type AgentJob struct {
	MonitorID       string `json:"monitor_id"`
	Name            string `json:"name"`
	URL             string `json:"url"`
	Method          string `json:"method"`
	TimeoutMS       int    `json:"timeout_ms"`
	ExpectedStatus  int    `json:"expected_status"`
	IntervalSeconds int    `json:"interval_seconds"`
}

type JobsResponse struct {
	Jobs []AgentJob `json:"jobs"`
}

type CheckResultRequest struct {
	MonitorID  string    `json:"monitor_id"`
	StatusCode int       `json:"status_code"`
	LatencyMS  int       `json:"latency_ms"`
	Success    bool      `json:"success"`
	Error      string    `json:"error,omitempty"`
	CheckedAt  time.Time `json:"checked_at"`
}

type InstallationResponse struct {
	InstallURL      string `json:"install_url"`
	DownloadBaseURL string `json:"download_base_url"`
	Version         string `json:"version"`
}

type AgentLogIngestRequest struct {
	Level   string                 `json:"level"`
	Message string                 `json:"message"`
	Context map[string]interface{} `json:"context,omitempty"`
}

type AgentLogResponse struct {
	ID        string                 `json:"id"`
	AgentID   string                 `json:"agent_id"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Context   map[string]interface{} `json:"context"`
	CreatedAt time.Time              `json:"created_at"`
}

type AgentLogsResponse struct {
	Logs []AgentLogResponse `json:"logs"`
}

type CheckResultResponse struct {
	ID           string    `json:"id"`
	MonitorID    string    `json:"monitor_id"`
	AgentID      string    `json:"agent_id"`
	StatusCode   int       `json:"status_code"`
	LatencyMS    int       `json:"latency_ms"`
	Success      bool      `json:"success"`
	ErrorMessage string    `json:"error_message"`
	CheckedAt    time.Time `json:"checked_at"`
	CreatedAt    time.Time `json:"created_at"`
}

type CheckResultsResponse struct {
	Results []CheckResultResponse `json:"results"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
