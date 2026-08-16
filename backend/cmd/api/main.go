package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "github.com/gaurav/pulseboard/docs"
	"github.com/gaurav/pulseboard/internal/agents"
	"github.com/gaurav/pulseboard/internal/apitests"
	"github.com/gaurav/pulseboard/internal/auth"
	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
	"github.com/gaurav/pulseboard/internal/config"
	database "github.com/gaurav/pulseboard/internal/databases"
	"github.com/gaurav/pulseboard/internal/users"
)

// @title PulseBoard API
// @version 1.0
// @description PulseBoard backend: user authentication, profile, agent management, agent API keys, and agent enrollment/telemetry.
// @host localhost:8080
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @securityDefinitions.apikey AgentAuth
// @in header
// @name Authorization

func main() {
	cfg := config.Load()
	log.Printf("loaded config: %+v", cfg)
	var pool *pgxpool.Pool

	// Database connection is optional; if DATABASE_URL is not set, the server
	// starts without a database connection.
	if cfg.DBURL != "" {
		dbPool, err := database.NewPool(cfg.DBURL)
		if err != nil {
			log.Fatalf("database connection failed: %v", err)
		}
		pool = dbPool
		defer pool.Close()
		log.Printf("database connection established: %v", dbPool.Stat().TotalConns())
	} else {
		log.Println("DATABASE_URL not set, starting without database connection")
	}

	addr := ":" + fallback(cfg.Port, "8080")

	server := &http.Server{
		Addr:         addr,
		Handler:      routes(pool, cfg),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	log.Printf("api listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

func routes(pool *pgxpool.Pool, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger) // in production, use a more sophisticated logging middleware
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			return corsOriginAllowed(origin, splitCSV(fallback(os.Getenv("CORS_ALLOWED_ORIGIN"), "http://localhost:3000,http://127.0.0.1:3000")))
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	authModule := auth.NewModule(pool, cfg.JWTSecret, auth.WithOAuthConfig(auth.OAuthConfig{
		Google: auth.OAuthProviderConfig{
			ClientID:     cfg.GoogleOAuthClientID,
			ClientSecret: cfg.GoogleOAuthClientSecret,
			RedirectURL:  cfg.GoogleOAuthRedirectURL,
		},
		GitHub: auth.OAuthProviderConfig{
			ClientID:     cfg.GitHubOAuthClientID,
			ClientSecret: cfg.GitHubOAuthClientSecret,
			RedirectURL:  cfg.GitHubOAuthRedirectURL,
		},
	}))

	agentRateLimiters := agents.RateLimiters{
		Enrollment: authmw.NewMemoryRateLimiter(cfg.AgentEnrollmentRateLimit, time.Minute),
		Auth:       authmw.NewMemoryRateLimiter(cfg.AgentAuthRateLimit, time.Minute),
		Heartbeat:  authmw.NewMemoryRateLimiter(cfg.AgentHeartbeatRateLimit, time.Minute),
		Result:     authmw.NewMemoryRateLimiter(cfg.AgentResultRateLimit, time.Minute),
	}

	agentsModule := agents.NewModule(pool, agents.Config{
		EnrollmentTokenTTL: cfg.AgentEnrollmentTokenTTL,
		APIKeyTTL:          cfg.AgentAPIKeyTTL,
		InstallURL:         cfg.AgentInstallURL,
		DownloadBaseURL:    cfg.AgentDownloadBaseURL,
		Version:            cfg.AgentVersion,
	}, agents.WithRateLimiters(agentRateLimiters))

	usersModule := users.NewModule(pool)

	apitestsModule := apitests.NewModule(pool, apitests.Config{
		ProxyTimeout: cfg.APITestProxyTimeout,
		MaxBodyBytes: int64(cfg.APITestMaxResponseBytes),
		AllowPrivate: cfg.APITestAllowPrivate,
		AIAPIKey:     cfg.OpenAIAPIKey,
		AIModel:      cfg.OpenAIModel,
		AIBaseURL:    cfg.OpenAIBaseURL,
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok go lang"}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"ok go lang"}`))
		})

		r.Mount("/auth", authModule.Routes())
		r.With(authmw.RequireUser(cfg.JWTSecret)).Mount("/profile", usersModule.Routes())
		r.With(authmw.RequireUser(cfg.JWTSecret)).Mount("/agents", agentsModule.UserRoutes())
		r.Mount("/agent", agentsModule.AgentRoutes())
		r.Mount("/tools", apitestsModule.ToolRoutes())
		r.With(authmw.RequireUser(cfg.JWTSecret)).Mount("/api-tests", apitestsModule.Routes())
	})

	// Swagger is only registered when explicitly enabled. When disabled the
	// routes do not exist at all.
	if cfg.SwaggerEnabled {
		r.Get("/swagger/*", httpSwagger.WrapHandler)
	}

	return r
}

func fallback(value string, defaultValue string) string {
	if value == "" {
		return defaultValue
	}

	return value
}

// splitCSV parses a comma-separated list (e.g. CORS_ALLOWED_ORIGIN) into a
// trimmed slice of non-empty values.
func splitCSV(value string) []string {
	var parts []string
	for _, part := range strings.Split(value, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			parts = append(parts, trimmed)
		}
	}

	return parts
}

// corsOriginAllowed reports whether a browser origin may call the API. It
// accepts exact matches from the configured allowlist, any Vercel deployment
// origin (*.vercel.app), and common local development origins.
func corsOriginAllowed(origin string, allowed []string) bool {
	if origin == "" {
		return true
	}
	for _, allowedOrigin := range allowed {
		if origin == allowedOrigin {
			return true
		}
	}
	if strings.HasSuffix(origin, ".vercel.app") {
		return true
	}
	for _, prefix := range []string{"http://localhost:", "http://127.0.0.1:"} {
		if strings.HasPrefix(origin, prefix) {
			return true
		}
	}
	return false
}
