package agents

import "time"

type APIKey struct {
	ID string `json:"id"`

	AgentID string `json:"agent_id"`

	Name string `json:"name"`

	KeyHash string `json:"-"`

	LastUsedAt *time.Time `json:"last_used_at,omitempty"`

	ExpiresAt *time.Time `json:"expires_at,omitempty"`

	Revoked bool `json:"revoked"`

	CreatedAt time.Time `json:"created_at"`
}