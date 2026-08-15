package apitests

import (
	"encoding/json"
	"time"
)

type APITest struct {
	ID             string          `json:"id"`
	UserID         string          `json:"user_id"`
	Name           string          `json:"name"`
	Method         string          `json:"method"`
	URL            string          `json:"url"`
	Headers        json.RawMessage `json:"headers"`
	Body           string          `json:"body"`
	ResponseStatus *int            `json:"response_status,omitempty"`
	ResponseBody   string          `json:"response_body"`
	ResponseTimeMS *int            `json:"response_time_ms,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}
