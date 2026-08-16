package apitests

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRawBody(t *testing.T) {
	object := json.RawMessage(`{"name":"x"}`)
	if got := string(rawBody(object)); got != `{"name":"x"}` {
		t.Fatalf("object body should pass through, got %q", got)
	}

	quoted := json.RawMessage(`"name=alice&age=3"`)
	if got := string(rawBody(quoted)); got != "name=alice&age=3" {
		t.Fatalf("quoted body should be unquoted, got %q", got)
	}

	if got := string(rawBody(nil)); got != "" {
		t.Fatalf("empty body should stay empty, got %q", got)
	}
}

func TestIsPrivateIP(t *testing.T) {
	cases := map[string]bool{
		"127.0.0.1":     true,
		"::1":           true,
		"10.0.0.5":      true,
		"192.168.1.1":   true,
		"172.16.4.4":    true,
		"169.254.1.1":   true,
		"0.0.0.0":       true,
		"8.8.8.8":       false,
		"1.1.1.1":       false,
		"93.184.216.34": false,
	}
	for address, want := range cases {
		if got := isPrivateIP(net.ParseIP(address)); got != want {
			t.Errorf("isPrivateIP(%s) = %v, want %v", address, got, want)
		}
	}
}

func TestCloudMetadataIP(t *testing.T) {
	cases := map[string]bool{
		"169.254.169.254": true,
		"169.254.170.2":   true,
		"100.100.100.200": true,
		"fd00:ec2::254":   true,
		"127.0.0.1":       false,
		"192.168.1.1":     false,
		"8.8.8.8":         false,
	}
	for address, want := range cases {
		if got := isCloudMetadataIP(net.ParseIP(address)); got != want {
			t.Errorf("isCloudMetadataIP(%s) = %v, want %v", address, got, want)
		}
	}
}

func TestSendRequestPrivateTargets(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	// Without allow_private the proxy refuses private targets.
	blocked := NewService(nil, Config{})
	_, err := blocked.SendRequest(context.Background(), ProxyRequest{
		Method: "GET",
		URL:    server.URL,
	})
	if !errors.Is(err, ErrUnsafeTarget) {
		t.Fatalf("expected ErrUnsafeTarget for private target, got %v", err)
	}

	// With allow_private set, private targets are proxied.
	allowed := NewService(nil, Config{})
	response, err := allowed.SendRequest(context.Background(), ProxyRequest{
		Method:       "GET",
		URL:          server.URL,
		AllowPrivate: true,
	})
	if err != nil {
		t.Fatalf("expected private target to be allowed: %v", err)
	}
	if response.Status != http.StatusOK || response.Body != `{"ok":true}` {
		t.Fatalf("unexpected response: %+v", response)
	}

	// Cloud metadata endpoints remain blocked even with allow_private.
	metadata, err := allowed.SendRequest(context.Background(), ProxyRequest{
		Method:       "GET",
		URL:          "http://169.254.169.254/latest/meta-data/",
		AllowPrivate: true,
	})
	if err == nil || !errors.Is(err, ErrUnsafeTarget) {
		t.Fatalf("expected cloud metadata target to stay blocked, got %v (response %+v)", err, metadata)
	}
}

func TestGenerateLocalProducesValidExamples(t *testing.T) {
	req := PayloadRequest{
		Method:  "POST",
		URL:     "https://api.example.com/orders",
		Example: json.RawMessage(`{"name":"Widget","price":19.99,"quantity":2}`),
		Count:   4,
	}

	examples := generateLocal(req, 4)
	if len(examples) != 4 {
		t.Fatalf("expected 4 examples, got %d", len(examples))
	}
	for _, example := range examples {
		if example.Name == "" {
			t.Fatalf("example name must not be empty")
		}
		var decoded any
		if err := json.Unmarshal(example.Payload, &decoded); err != nil {
			t.Fatalf("example payload %s is invalid JSON: %v", example.Name, err)
		}
	}
}

func TestGeneratePayloadsUsesLocalWithoutAIKey(t *testing.T) {
	service := NewService(nil, Config{})
	response, err := service.GeneratePayloads(context.Background(), PayloadRequest{
		Method:  "POST",
		URL:     "https://api.example.com/orders",
		Example: json.RawMessage(`{"name":"Widget"}`),
	})
	if err != nil {
		t.Fatalf("GeneratePayloads: %v", err)
	}
	if response.Provider != "local" {
		t.Fatalf("expected local provider, got %q", response.Provider)
	}
	if len(response.Examples) == 0 {
		t.Fatalf("expected at least one example")
	}
}

func TestGeneratePayloadsCountClamped(t *testing.T) {
	service := NewService(nil, Config{})
	response, err := service.GeneratePayloads(context.Background(), PayloadRequest{Count: 100})
	if err != nil {
		t.Fatalf("GeneratePayloads: %v", err)
	}
	if len(response.Examples) > 8 {
		t.Fatalf("count must be clamped to 8, got %d", len(response.Examples))
	}
}
