package monitors

import "time"

type Monitor struct {
	ID string `json:"id"`

	UserID string `json:"user_id"`

	Name string `json:"name"`

	URL string `json:"url"`

	Method string `json:"method"`

	Interval int `json:"interval"`

	Timeout int `json:"timeout"`

	ExpectedStatus int `json:"expected_status"`

	Enabled bool `json:"enabled"`

	CreatedAt time.Time `json:"created_at"`

	UpdatedAt time.Time `json:"updated_at"`
}