package apitests

import "encoding/json"

// ProxyRequest is the public API-tester request. Body is the raw JSON value the
// user wants sent; a JSON string is interpreted as a raw text body, while any
// object/array/number is forwarded verbatim.
type ProxyRequest struct {
	Method       string            `json:"method"`
	URL          string            `json:"url"`
	Headers      map[string]string `json:"headers,omitempty"`
	Body         json.RawMessage   `json:"body,omitempty"`
	TimeoutMS    int               `json:"timeout_ms,omitempty"`
	AllowPrivate bool              `json:"allow_private,omitempty"`
}

type ProxyResponse struct {
	Status     int               `json:"status"`
	StatusText string            `json:"status_text"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	DurationMS int64             `json:"duration_ms"`
}

type PayloadRequest struct {
	Method  string          `json:"method,omitempty"`
	URL     string          `json:"url,omitempty"`
	Example json.RawMessage `json:"example,omitempty"`
	Count   int             `json:"count,omitempty"`
}

type PayloadExample struct {
	Name    string          `json:"name"`
	Payload json.RawMessage `json:"payload"`
}

type PayloadResponse struct {
	Provider string           `json:"provider"`
	Examples []PayloadExample `json:"examples"`
}

type SaveAPITestRequest struct {
	Name           string          `json:"name"`
	Method         string          `json:"method"`
	URL            string          `json:"url"`
	Headers        json.RawMessage `json:"headers,omitempty"`
	Body           string          `json:"body"`
	ResponseStatus *int            `json:"response_status,omitempty"`
	ResponseBody   string          `json:"response_body,omitempty"`
	ResponseTimeMS *int            `json:"response_time_ms,omitempty"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
