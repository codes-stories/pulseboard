package auth

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

func (m *Module) Routes() http.Handler {
	r := chi.NewRouter()

	public := m.publicMiddlewares()
	r.With(public...).Post("/register", m.handler.Register)
	r.With(public...).Post("/login", m.handler.Login)
	r.With(public...).Get("/oauth/google/start", m.handler.GoogleStart)
	r.With(public...).Get("/oauth/google/callback", m.handler.GoogleCallback)
	r.With(public...).Get("/oauth/github/start", m.handler.GitHubStart)
	r.With(public...).Get("/oauth/github/callback", m.handler.GitHubCallback)
	r.With(public...).Post("/refresh", m.handler.Refresh)
	r.With(public...).Post("/logout", m.handler.Logout)

	r.Get("/me", m.handler.Me)

	return r
}

func (m *Module) publicMiddlewares() []func(http.Handler) http.Handler {
	if m == nil {
		return nil
	}

	cfg := m.middlewareConfig
	chain := make([]authmw.Middleware, 0, 3)
	chain = appendMiddleware(chain, authmw.IPBlock(cfg.BlockedIPs))
	chain = appendMiddleware(chain, authmw.RateLimit(cfg.RateLimiter, cfg.RateLimitKey))
	chain = appendMiddleware(chain, authmw.Captcha(cfg.CaptchaValidator))

	middlewares := make([]func(http.Handler) http.Handler, 0, len(chain))
	for _, middleware := range chain {
		middlewares = append(middlewares, middleware)
	}

	return middlewares
}
