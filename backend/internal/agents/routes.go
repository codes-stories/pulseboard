package agents

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

// UserRoutes returns the user-facing agent management router. It is mounted by
// main under the user JWT middleware, so every handler here is owner-scoped.
func (m *Module) UserRoutes() http.Handler {
	r := chi.NewRouter()

	r.Get("/installation", m.handler.InstallationInfo)

	r.Get("/", m.handler.ListAgents)
	r.Post("/", m.handler.CreateAgent)

	r.Route("/{agentID}", func(r chi.Router) {
		r.Get("/", m.handler.GetAgent)
		r.Patch("/", m.handler.UpdateAgent)
		r.Delete("/", m.handler.DeleteAgent)

		r.Get("/api-keys", m.handler.ListAPIKeys)
		r.Post("/api-keys", m.handler.CreateAPIKey)
		r.Post("/api-keys/{keyID}/revoke", m.handler.RevokeAPIKey)
		r.Post("/api-keys/{keyID}/rotate", m.handler.RotateAPIKey)

		r.Post("/enrollment-token", m.handler.CreateEnrollmentToken)

		r.Get("/logs", m.handler.ListAgentLogs)
		r.Get("/results", m.handler.ListAgentCheckResults)
	})

	// Logs proxy endpoints (proxied to Erlang agent)
	r.Get("/logs", m.logProxy.ListLogsHandler)
	r.Post("/logs", m.logProxy.AppendLogHandler)

	return r
}

// AgentRoutes returns the machine-facing router consumed by the future Erlang
// agent. /enroll authenticates with a single-use enrollment token in the body;
// every other route requires a valid agent API key.
func (m *Module) AgentRoutes() http.Handler {
	r := chi.NewRouter()

	r.With(m.limit(m.rateLimiters.Enrollment)).Post("/enroll", m.handler.Enroll)

	r.With(
		m.limit(m.rateLimiters.Auth),
		authmw.RequireAgent(m.Verifier()),
	).Post("/api-key/rotate", m.handler.RotateAPIKeyByAgent)

	r.With(
		m.limit(m.rateLimiters.Heartbeat),
		authmw.RequireAgent(m.Verifier()),
	).Post("/heartbeat", m.handler.Heartbeat)

	r.With(
		m.limit(m.rateLimiters.Auth),
		authmw.RequireAgent(m.Verifier()),
	).Get("/jobs", m.handler.ListJobs)

	r.With(
		m.limit(m.rateLimiters.Result),
		authmw.RequireAgent(m.Verifier()),
	).Post("/check-results", m.handler.IngestCheckResult)

	r.With(
		m.limit(m.rateLimiters.Result),
		authmw.RequireAgent(m.Verifier()),
	).Post("/logs", m.handler.IngestAgentLog)

	return r
}

func (m *Module) limit(limiter authmw.RateLimiter) func(http.Handler) http.Handler {
	return authmw.RateLimit(limiter, nil)
}
