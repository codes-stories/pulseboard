package agents

import "time"

type Heartbeat struct {
	ID string `json:"id"`

	AgentID string `json:"agent_id"`

	IPAddress string `json:"ip_address"`

	Version string `json:"version"`

	LatencyMS int `json:"latency_ms"`

	MemoryUsageMB float64 `json:"memory_usage_mb"`

	CPUUsage float64 `json:"cpu_usage"`

	Status string `json:"status"`

	CreatedAt time.Time `json:"created_at"`
}