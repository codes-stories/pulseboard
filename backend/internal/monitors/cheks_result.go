package monitors

import "time"

type CheckResult struct {
	ID           string    `json:"id"`
	MonitorID    string    `json:"monitor_id"`
	AgentID      string    `json:"agent_id"`
	StatusCode   int       `json:"status_code"`
	LatencyMS    int       `json:"latency_ms"`
	Success      bool      `json:"success"`
	ErrorMessage string    `json:"error_message,omitempty"`
	CheckedAt    time.Time `json:"checked_at"`
	CreatedAt    time.Time `json:"created_at"`
}
