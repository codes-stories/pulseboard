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
}

func NewModule(db *pgxpool.Pool, jwtSecret string, opts ...ModuleOption) *Module {
	repository := NewRepository(db)
	service := NewService(repository, jwtSecret)
	handler := NewHandler(service)
	module := &Module{
		repository: repository,
		service:    service,
		handler:    handler,
	}

	for _, opt := range opts {
		if opt != nil {
			opt(module)
		}
	}

	return module
}

func WithMiddlewareConfig(cfg MiddlewareConfig) ModuleOption {
	return func(module *Module) {
		module.middlewareConfig = cfg
	}
}
