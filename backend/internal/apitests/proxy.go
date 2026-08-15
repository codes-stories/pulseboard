package apitests

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var hopByHopHeaders = map[string]bool{
	"connection":          true,
	"keep-alive":          true,
	"proxy-authenticate":  true,
	"proxy-authorization": true,
	"te":                  true,
	"trailer":             true,
	"transfer-encoding":   true,
	"upgrade":             true,
}

// rawBody converts the incoming JSON body value into the raw bytes that should
// be written to the upstream request. A JSON string is treated as a plain-text
// body; any object/array/number is forwarded verbatim.
func rawBody(message json.RawMessage) []byte {
	if len(message) > 0 && message[0] == '"' {
		var text string
		if err := json.Unmarshal(message, &text); err == nil {
			return []byte(text)
		}
	}
	return message
}

// SendRequest proxies an arbitrary HTTP request on behalf of the frontend. It
// guards against SSRF by refusing private, loopback, and link-local targets
// unless explicitly allowed.
func (s *Service) SendRequest(ctx context.Context, req ProxyRequest) (*ProxyResponse, error) {
	method := strings.ToUpper(strings.TrimSpace(req.Method))
	if method == "" {
		method = http.MethodGet
	}
	if !validMethods[method] {
		return nil, ErrInvalidInput
	}

	target := strings.TrimSpace(req.URL)
	if !strings.HasPrefix(target, "http://") && !strings.HasPrefix(target, "https://") {
		return nil, ErrInvalidInput
	}

	if !s.config.AllowPrivate {
		private, err := isPrivateTarget(target)
		if err != nil || private {
			return nil, ErrUnsafeTarget
		}
	}

	timeout := s.config.ProxyTimeout
	if req.TimeoutMS > 0 {
		parsed := time.Duration(req.TimeoutMS) * time.Millisecond
		if parsed > 0 && parsed <= 2*time.Minute {
			timeout = parsed
		}
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	body := rawBody(req.Body)

	var requestBody io.Reader
	if len(body) > 0 {
		requestBody = bytes.NewReader(body)
	}

	httpRequest, err := http.NewRequestWithContext(ctx, method, target, requestBody)
	if err != nil {
		return nil, ErrInvalidInput
	}

	httpRequest.Header.Set("Accept", "application/json, */*")
	httpRequest.Header.Set("User-Agent", "PulseBoard-APITester/1.0")
	if len(body) > 0 {
		httpRequest.Header.Set("Content-Type", "application/json")
	}
	for key, value := range req.Headers {
		trimmed := strings.TrimSpace(key)
		if trimmed == "" {
			continue
		}
		canonical := http.CanonicalHeaderKey(trimmed)
		if hopByHopHeaders[strings.ToLower(trimmed)] ||
			canonical == "Content-Length" ||
			canonical == "Host" {
			continue
		}
		httpRequest.Header.Set(canonical, value)
	}

	start := time.Now()
	response, err := s.client.Do(httpRequest)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, fmt.Errorf("%w: request timed out", ErrUpstreamFailed)
		}
		return nil, fmt.Errorf("%w: %v", ErrUpstreamFailed, err)
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, s.config.MaxBodyBytes))
	if err != nil {
		return nil, fmt.Errorf("%w: failed to read response", ErrUpstreamFailed)
	}
	durationMS := time.Since(start).Milliseconds()

	headers := make(map[string]string)
	for key, values := range response.Header {
		if hopByHopHeaders[strings.ToLower(key)] {
			continue
		}
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}

	return &ProxyResponse{
		Status:     response.StatusCode,
		StatusText: response.Status,
		Headers:    headers,
		Body:       string(responseBody),
		DurationMS: durationMS,
	}, nil
}

// isPrivateTarget reports whether the target host resolves to a private,
// loopback, link-local, unspecified, or multicast address.
func isPrivateTarget(rawURL string) (bool, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Hostname() == "" {
		return false, errors.New("invalid target url")
	}

	host := strings.Trim(parsed.Hostname(), "[]")
	if ip := net.ParseIP(host); ip != nil {
		return isPrivateIP(ip), nil
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return false, err
	}
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return true, nil
		}
	}
	return false, nil
}

func isPrivateIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast()
}

// ---- AI payload generation ----

// GeneratePayloads produces example request bodies based on the example the
// user just ran. When an AI provider is configured it is used; otherwise a
// deterministic local generator produces similar payloads so the feature works
// out of the box.
func (s *Service) GeneratePayloads(ctx context.Context, req PayloadRequest) (*PayloadResponse, error) {
	count := req.Count
	if count <= 0 {
		count = 3
	}
	if count > 8 {
		count = 8
	}

	if strings.TrimSpace(s.config.AIAPIKey) != "" {
		examples, err := s.generateWithAI(ctx, req, count)
		if err == nil && len(examples) > 0 {
			return &PayloadResponse{Provider: "ai", Examples: examples}, nil
		}
	}

	examples := generateLocal(req, count)
	return &PayloadResponse{Provider: "local", Examples: examples}, nil
}

func (s *Service) generateWithAI(ctx context.Context, req PayloadRequest, count int) ([]PayloadExample, error) {
	prompt := "HTTP request:\n" + strings.ToUpper(req.Method) + " " + req.URL + "\n"
	if len(req.Example) > 0 {
		prompt += "Example body:\n" + string(req.Example) + "\n"
	}
	prompt += fmt.Sprintf("Generate %d realistic, distinct example request bodies. "+
		"Return ONLY a JSON array where each item is {\"name\":\"short label\",\"payload\":<json body>}.", count)

	body, err := json.Marshal(map[string]any{
		"model":       s.config.AIModel,
		"temperature": 0.8,
		"messages": []map[string]string{
			{"role": "system", "content": "You are an API payload generator. Return only valid JSON, no markdown."},
			{"role": "user", "content": prompt},
		},
	})
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	httpRequest, err := http.NewRequestWithContext(ctx, "POST", strings.TrimRight(s.config.AIBaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Authorization", "Bearer "+s.config.AIAPIKey)

	response, err := s.client.Do(httpRequest)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai provider returned %d", response.StatusCode)
	}

	var chat struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(response.Body).Decode(&chat); err != nil {
		return nil, err
	}
	if len(chat.Choices) == 0 {
		return nil, errors.New("ai provider returned no choices")
	}

	content := strings.TrimSpace(chat.Choices[0].Message.Content)
	content = strings.TrimSpace(strings.TrimPrefix(strings.TrimSuffix(content, "```"), "```"))
	if start := strings.Index(content, "```"); start >= 0 {
		content = content[start+3:]
		if end := strings.Index(content, "```"); end >= 0 {
			content = content[:end]
		}
	}
	content = strings.TrimSpace(content)
	content = strings.TrimPrefix(content, "json")

	var examples []PayloadExample
	if err := json.Unmarshal([]byte(content), &examples); err != nil {
		var raw []json.RawMessage
		if err2 := json.Unmarshal([]byte(content), &raw); err2 != nil {
			return nil, err
		}
		for i, item := range raw {
			examples = append(examples, PayloadExample{Name: fmt.Sprintf("example %d", i+1), Payload: item})
		}
	}
	if len(examples) == 0 {
		return nil, errors.New("ai provider returned no examples")
	}
	if len(examples) > count {
		examples = examples[:count]
	}
	return examples, nil
}

// ---- Deterministic local generator ----

func generateLocal(req PayloadRequest, count int) []PayloadExample {
	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))

	var base map[string]any
	_ = json.Unmarshal(req.Example, &base)

	examples := make([]PayloadExample, 0, count)

	if base != nil {
		examples = append(examples, PayloadExample{Name: "similar", Payload: mustMarshal(randomizeMap(base, rnd))})

		extended := cloneMap(base)
		extended["id"] = "evt_" + randomToken(rnd, 10)
		extended["status"] = pick(rnd, "created", "processing", "completed")
		extended["created_at"] = time.Now().UTC().Format(time.RFC3339)
		examples = append(examples, PayloadExample{Name: "with-metadata", Payload: mustMarshal(extended)})

		envelope := map[string]any{
			"data": randomizeMap(base, rnd),
			"meta": map[string]any{
				"request_id": "req_" + randomToken(rnd, 10),
				"region":     pick(rnd, "us-east-1", "eu-west-1", "ap-south-1"),
			},
		}
		examples = append(examples, PayloadExample{Name: "envelope", Payload: mustMarshal(envelope)})
	}

	for len(examples) < count {
		examples = append(examples, genericPayload(rnd, req.Method, len(examples)+1))
	}
	return examples
}

func genericPayload(rnd *rand.Rand, method string, n int) PayloadExample {
	payload := map[string]any{
		"name":       pick(rnd, "Alice", "Bob", "Carol", "Dana", "Eve"),
		"email":      "user" + strconv.Itoa(rnd.Intn(100000)) + "@example.com",
		"quantity":   rnd.Intn(50) + 1,
		"price":      float64(rnd.Intn(99900)) / 100,
		"enabled":    rnd.Intn(2) == 0,
		"tags":       []string{"api", "test"},
		"created_at": time.Now().UTC().Format(time.RFC3339),
	}
	name := pick(rnd, "create", "update", "publish", "process")
	if method != "" {
		name = strings.ToLower(method) + "-" + name
	}
	return PayloadExample{Name: name, Payload: mustMarshal(payload)}
}

func randomizeMap(source map[string]any, rnd *rand.Rand) map[string]any {
	result := make(map[string]any, len(source))
	for key, value := range source {
		result[key] = randomizeValue(key, value, rnd)
	}
	return result
}

func randomizeValue(key string, value any, rnd *rand.Rand) any {
	switch typed := value.(type) {
	case map[string]any:
		return randomizeMap(typed, rnd)
	case []any:
		if len(typed) == 0 {
			return typed
		}
		result := make([]any, rnd.Intn(3)+1)
		for i := range result {
			result[i] = randomizeValue(key, typed[rnd.Intn(len(typed))], rnd)
		}
		return result
	case float64:
		return float64(rnd.Intn(99999)) / 100
	case bool:
		return rnd.Intn(2) == 0
	case nil:
		return nil
	default:
		lower := strings.ToLower(key)
		switch {
		case strings.Contains(lower, "email"):
			return "user" + strconv.Itoa(rnd.Intn(100000)) + "@example.com"
		case strings.Contains(lower, "name"):
			return pick(rnd, "Acme", "Globex", "Initech", "Umbrella", "Stark")
		case strings.Contains(lower, "phone"):
			return "+1-555-" + fmt.Sprintf("%03d", rnd.Intn(1000)) + "-" + fmt.Sprintf("%04d", rnd.Intn(10000))
		case strings.Contains(lower, "url") || strings.Contains(lower, "link"):
			return "https://api.example.com/v1/" + randomToken(rnd, 6)
		case strings.Contains(lower, "date") || strings.Contains(lower, "at") || strings.Contains(lower, "time"):
			return time.Now().UTC().Format(time.RFC3339)
		case strings.Contains(lower, "id"):
			return "id_" + randomToken(rnd, 10)
		case strings.Contains(lower, "status"):
			return pick(rnd, "active", "pending", "suspended")
		default:
			return pick(rnd, "value", "payload", "item", "record", "alpha")
		}
	}
}

func cloneMap(source map[string]any) map[string]any {
	result := make(map[string]any, len(source))
	for key, value := range source {
		result[key] = value
	}
	return result
}

func mustMarshal(value any) json.RawMessage {
	raw, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return raw
}

func randomToken(rnd *rand.Rand, length int) string {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
	buffer := make([]byte, length)
	for i := range buffer {
		buffer[i] = alphabet[rnd.Intn(len(alphabet))]
	}
	return string(buffer)
}

func pick(rnd *rand.Rand, options ...string) string {
	return options[rnd.Intn(len(options))]
}
