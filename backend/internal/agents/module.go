package agents

import (
	"github.com/jackc/pgx/v5/pgxpool"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

type RateLimiters struct {
	Enrollment authmw.RateLimiter
	Auth       authmw.RateLimiter
	Heartbeat  authmw.RateLimiter
	Result     authmw.RateLimiter
}

type Module struct {
	repository    *Repository
	service       *Service
	handler       *Handler
	logProxy      *LogProxyService
	rateLimiters  RateLimiters
}

type ModuleOption func(*Module)

func NewModule(db *pgxpool.Pool, config Config, opts ...ModuleOption) *Module {
	repository := NewRepository(db)
	service := NewService(repository, config)
	logProxy := NewLogProxyService(config.ErlangAgentURL)
	module := &Module{
		repository: repository,
		service:    service,
		handler:    NewHandler(service, logProxy),
		logProxy:   logProxy,
	}

	for _, opt := range opts {
		if opt != nil {
			opt(module)
		}
	}

	return module
}

func WithRateLimiters(rateLimiters RateLimiters) ModuleOption {
	return func(module *Module) {
		module.rateLimiters = rateLimiters
	}
}

// Verifier satisfies authmw.AgentCredentialVerifier so the agent auth
// middleware can resolve credentials without knowing storage details.
func (m *Module) Verifier() authmw.AgentCredentialVerifier {
	return m.service
}
