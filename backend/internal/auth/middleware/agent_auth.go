package middleware

import (
	"context"
	"net/http"
	"strings"
)

// AgentCredentialVerifier validates a machine (agent) credential and resolves
// the owning agent and user. It is implemented by the agents module so the
// agent authentication middleware stays decoupled from storage.
type AgentCredentialVerifier interface {
	AuthenticateAgent(ctx context.Context, apiKey string) (*AuthenticatedAgent, error)
}

// RequireAgent authenticates a machine/agent via an agent API key sent as
// Authorization: Bearer pb_agent_<secret> and puts the resolved identity into
// the request context. Failures return a generic 401 to avoid revealing
// whether a credential exists.
func RequireAgent(verifier AgentCredentialVerifier) Middleware {
	if verifier == nil {
		return nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r.Header.Get("Authorization"))
			if token == "" || !strings.HasPrefix(token, "pb_agent_") {
				writeJSONError(w, http.StatusUnauthorized, "invalid agent credentials")
				return
			}

			agent, err := verifier.AuthenticateAgent(r.Context(), token)
			if err != nil || agent == nil || agent.AgentID == "" {
				writeJSONError(w, http.StatusUnauthorized, "invalid agent credentials")
				return
			}

			ctx := context.WithValue(r.Context(), ctxKeyAgent, *agent)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
