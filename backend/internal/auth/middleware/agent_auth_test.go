package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeVerifier struct {
	agent *AuthenticatedAgent
	err   error
	seen  []string
}

func (f *fakeVerifier) AuthenticateAgent(_ context.Context, apiKey string) (*AuthenticatedAgent, error) {
	f.seen = append(f.seen, apiKey)
	return f.agent, f.err
}

func TestRequireAgentValidKey(t *testing.T) {
	verifier := &fakeVerifier{agent: &AuthenticatedAgent{AgentID: "agent-1", UserID: "user-1", Name: "a1"}}

	handler := RequireAgent(verifier)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		agent, ok := AgentFromContext(r.Context())
		if !ok {
			t.Fatalf("expected agent in context")
		}
		if agent.AgentID != "agent-1" || agent.UserID != "user-1" {
			t.Fatalf("unexpected agent: %+v", agent)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer pb_agent_secret")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if len(verifier.seen) != 1 || verifier.seen[0] != "pb_agent_secret" {
		t.Fatalf("verifier should be called with the raw key once, got %v", verifier.seen)
	}
}

func TestRequireAgentRejectsMissingHeader(t *testing.T) {
	verifier := &fakeVerifier{agent: &AuthenticatedAgent{AgentID: "agent-1"}}
	handler := RequireAgent(verifier)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	if len(verifier.seen) != 0 {
		t.Fatalf("verifier must not be called without a valid bearer key")
	}
}

func TestRequireAgentRejectsNonAgentKey(t *testing.T) {
	verifier := &fakeVerifier{agent: &AuthenticatedAgent{AgentID: "agent-1"}}
	handler := RequireAgent(verifier)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer some-human-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	if len(verifier.seen) != 0 {
		t.Fatalf("verifier must not be called with a non-agent key")
	}
}

func TestRequireAgentGenericFailure(t *testing.T) {
	verifier := &fakeVerifier{err: errors.New("revoked")}
	handler := RequireAgent(verifier)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer pb_agent_secret")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	// The error must not leak details about the credential.
	if rec.Body.String() != `{"error":"invalid agent credentials"}`+"\n" {
		t.Fatalf("expected generic message, got: %s", rec.Body.String())
	}
}

func TestRequireAgentNilVerifierSkipped(t *testing.T) {
	if RequireAgent(nil) != nil {
		t.Fatalf("RequireAgent(nil) must return nil to disable the middleware")
	}
}
