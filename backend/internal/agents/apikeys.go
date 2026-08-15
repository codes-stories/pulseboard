package agents

import "time"

type APIKey struct {
	ID         string     `json:"id"`
	AgentID    string     `json:"agent_id"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"prefix"`
	KeyHash    string     `json:"-"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type EnrollmentToken struct {
	ID        string     `json:"-"`
	AgentID   string     `json:"-"`
	TokenHash string     `json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"-"`
	RevokedAt *time.Time `json:"-"`
	CreatedAt time.Time  `json:"-"`
}
