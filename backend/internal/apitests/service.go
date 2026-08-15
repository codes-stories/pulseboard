package apitests

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type Config struct {
	ProxyTimeout time.Duration
	MaxBodyBytes int64
	AllowPrivate bool
	AIAPIKey     string
	AIModel      string
	AIBaseURL    string
}

type Service struct {
	repository *Repository
	config     Config
	client     *http.Client
}

func NewService(repository *Repository, config Config) *Service {
	if config.ProxyTimeout <= 0 {
		config.ProxyTimeout = 10 * time.Second
	}
	if config.MaxBodyBytes <= 0 {
		config.MaxBodyBytes = 1 << 20
	}
	if config.AIModel == "" {
		config.AIModel = "gpt-4o-mini"
	}
	if config.AIBaseURL == "" {
		config.AIBaseURL = "https://api.openai.com/v1"
	}

	return &Service{
		repository: repository,
		config:     config,
		client:     &http.Client{Timeout: config.ProxyTimeout + 5*time.Second},
	}
}

var validMethods = map[string]bool{
	"GET": true, "POST": true, "PUT": true, "PATCH": true,
	"DELETE": true, "HEAD": true, "OPTIONS": true,
}

func normalizeHeaders(raw json.RawMessage) (json.RawMessage, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return json.RawMessage(`{}`), nil
	}
	var headers map[string]any
	if err := json.Unmarshal(raw, &headers); err != nil {
		return nil, ErrInvalidInput
	}
	return raw, nil
}

// SaveTest persists a request/response pair so the user can replay it later.
func (s *Service) SaveTest(ctx context.Context, userID string, req SaveAPITestRequest) (*APITest, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, ErrInvalidInput
	}
	if !validMethods[strings.ToUpper(strings.TrimSpace(req.Method))] {
		return nil, ErrInvalidInput
	}
	if !strings.HasPrefix(req.URL, "http://") && !strings.HasPrefix(req.URL, "https://") {
		return nil, ErrInvalidInput
	}

	headers, err := normalizeHeaders(req.Headers)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	test := &APITest{
		ID:             newID(),
		UserID:         userID,
		Name:           strings.TrimSpace(req.Name),
		Method:         strings.ToUpper(strings.TrimSpace(req.Method)),
		URL:            strings.TrimSpace(req.URL),
		Headers:        headers,
		Body:           req.Body,
		ResponseStatus: req.ResponseStatus,
		ResponseBody:   req.ResponseBody,
		ResponseTimeMS: req.ResponseTimeMS,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repository.Create(ctx, test); err != nil {
		return nil, err
	}
	return test, nil
}

func (s *Service) ListTests(ctx context.Context, userID string) ([]APITest, error) {
	tests, err := s.repository.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	return tests, nil
}

func (s *Service) GetTest(ctx context.Context, userID, id string) (*APITest, error) {
	return s.repository.Get(ctx, id, userID)
}

func (s *Service) UpdateTest(ctx context.Context, userID, id string, req SaveAPITestRequest) (*APITest, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, ErrInvalidInput
	}
	if !validMethods[strings.ToUpper(strings.TrimSpace(req.Method))] {
		return nil, ErrInvalidInput
	}
	if !strings.HasPrefix(req.URL, "http://") && !strings.HasPrefix(req.URL, "https://") {
		return nil, ErrInvalidInput
	}

	headers, err := normalizeHeaders(req.Headers)
	if err != nil {
		return nil, err
	}

	test := &APITest{
		ID:             id,
		UserID:         userID,
		Name:           strings.TrimSpace(req.Name),
		Method:         strings.ToUpper(strings.TrimSpace(req.Method)),
		URL:            strings.TrimSpace(req.URL),
		Headers:        headers,
		Body:           req.Body,
		ResponseStatus: req.ResponseStatus,
		ResponseBody:   req.ResponseBody,
		ResponseTimeMS: req.ResponseTimeMS,
	}

	if err := s.repository.Update(ctx, test); err != nil {
		return nil, err
	}
	return s.repository.Get(ctx, id, userID)
}

func (s *Service) DeleteTest(ctx context.Context, userID, id string) error {
	return s.repository.Delete(ctx, id, userID)
}

func newID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(buffer)
}
