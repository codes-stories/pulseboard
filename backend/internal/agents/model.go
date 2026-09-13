package agents

import "time"

type AgentLog struct {
	ID        string                 `json:"id"`
	AgentID   string                 `json:"agent_id"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Context   map[string]interface{} `json:"context"`
	CreatedAt time.Time              `json:"created_at"`
}

type AgentStatus string

const (
	AgentStatusPending  AgentStatus = "pending"
	AgentStatusOnline   AgentStatus = "online"
	AgentStatusOffline  AgentStatus = "offline"
	AgentStatusDisabled AgentStatus = "disabled"
)

func (s AgentStatus) Valid() bool {
	switch s {
	case AgentStatusPending, AgentStatusOnline, AgentStatusOffline, AgentStatusDisabled:
		return true
	default:
		return false
	}
}

type Agent struct {
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
