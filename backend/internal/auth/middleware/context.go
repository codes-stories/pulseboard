package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type ctxKey int

const (
	ctxKeyUser ctxKey = iota
	ctxKeyAgent
)

// AuthenticatedUser carries the identity resolved from a user access token.
type AuthenticatedUser struct {
	ID    string
	Email string
	Name  string
}

// AuthenticatedAgent carries the identity resolved from an agent API key.
// The plaintext API key is never stored here.
type AuthenticatedAgent struct {
	AgentID string
	UserID  string
	Name    string
	KeyID   string
}

func UserFromContext(ctx context.Context) (AuthenticatedUser, bool) {
	value, ok := ctx.Value(ctxKeyUser).(AuthenticatedUser)
	return value, ok
}

func AgentFromContext(ctx context.Context) (AuthenticatedAgent, bool) {
	value, ok := ctx.Value(ctxKeyAgent).(AuthenticatedAgent)
	return value, ok
}

func bearerToken(value string) string {
	parts := strings.Fields(value)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
