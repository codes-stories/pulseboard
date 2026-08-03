package auth

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

type MiddlewareConfig struct {
	BlockedIPs       []string
	IsAccountLocked  func(string) bool
	ActiveSessions   func(string) int
	MaxSessions      int
	ActiveDevices    func(string) int
	MaxDevices       int
	RateLimiter      authmw.RateLimiter
	RateLimitKey     func(*http.Request) string
	CaptchaValidator func(*http.Request) bool
}

type ModuleOption func(*Module)

type Module struct {
	repository       *Repository
	service          *Service
	handler          *Handler
	middlewareConfig MiddlewareConfig
	oauthConfig      OAuthConfig
}

func NewModule(db *pgxpool.Pool, jwtSecret string, opts ...ModuleOption) *Module {
	repository := NewRepository(db)
	module := &Module{
		repository: repository,
	}
	service := NewService(repository, jwtSecret, module.oauthConfig)
	handler := NewHandler(service)
	module.service = service
	module.handler = handler

	for _, opt := range opts {
		if opt != nil {
			opt(module)
		}
	}

	module.service = NewService(repository, jwtSecret, module.oauthConfig)
	module.handler = NewHandler(module.service)

	return module
}

func WithMiddlewareConfig(cfg MiddlewareConfig) ModuleOption {
	return func(module *Module) {
		module.middlewareConfig = cfg
	}
}

func WithOAuthConfig(cfg OAuthConfig) ModuleOption {
	return func(module *Module) {
		module.oauthConfig = cfg
	}
}
