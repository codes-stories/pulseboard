package monitors

import "time"

type CheckResult struct {
	ID string `json:"id"`

	MonitorID string `json:"monitor_id"`

	AgentID string `json:"agent_id"`

	StatusCode int `json:"status_code"`

	ResponseTimeMS int `json:"response_time_ms"`

	Success bool `json:"success"`

	Error string `json:"error,omitempty"`

	CheckedAt time.Time `json:"checked_at"`
}