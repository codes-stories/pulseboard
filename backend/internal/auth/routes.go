package auth

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

func (m *Module) Routes() http.Handler {
	r := chi.NewRouter()

	middlewares := m.routeMiddlewares()

	r.With(middlewares...).Post("/register", m.handler.Register)
	r.With(middlewares...).Post("/login", m.handler.Login)
	r.With(middlewares...).Get("/me", m.handler.Me)

	return r
}

func (m *Module) routeMiddlewares() []func(http.Handler) http.Handler {
	if m == nil {
		return nil
	}

	cfg := m.middlewareConfig
	chain := make([]authmw.Middleware, 0, 6)
	chain = appendMiddleware(chain, authmw.IPBlock(cfg.BlockedIPs))
	chain = appendMiddleware(chain, authmw.AccountLock(cfg.IsAccountLocked))
	chain = appendMiddleware(chain, authmw.SessionLimit(cfg.MaxSessions, cfg.ActiveSessions))
	chain = appendMiddleware(chain, authmw.DeviceLimit(cfg.MaxDevices, cfg.ActiveDevices))
	chain = appendMiddleware(chain, authmw.RateLimit(cfg.RateLimiter, cfg.RateLimitKey))
	chain = appendMiddleware(chain, authmw.Captcha(cfg.CaptchaValidator))

	middlewares := make([]func(http.Handler) http.Handler, 0, len(chain))
	for _, middleware := range chain {
		middlewares = append(middlewares, middleware)
	}

	return middlewares
}
