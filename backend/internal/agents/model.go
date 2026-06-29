package agents

import "time"

type Agent struct {
	ID string `json:"id"`

	UserID string `json:"user_id"`

	Name string `json:"name"`

	Hostname string `json:"hostname"`

	DeviceID string `json:"device_id"`

	ServerID string `json:"server_id"`

	Version string `json:"version"`

	Region string `json:"region"`

	LastHeartbeat time.Time `json:"last_heartbeat"`

	IsOnline bool `json:"is_online"`

	CreatedAt time.Time `json:"created_at"`

	UpdatedAt time.Time `json:"updated_at"`
}