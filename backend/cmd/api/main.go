package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gaurav/pulseboard/internal/auth"
	"github.com/gaurav/pulseboard/internal/config"
	database "github.com/gaurav/pulseboard/internal/databases"
)

func main() {
	cfg := config.Load()
	log.Printf("loaded config: %+v", cfg)
	var pool *pgxpool.Pool

	if cfg.DBURL != "" {
		dbPool, err := database.NewPool(cfg.DBURL)
		log.Printf("database connection established: %v", dbPool.Stat().TotalConns())
		if err != nil {
			log.Fatalf("database connection failed: %v", err)
		}
		pool = dbPool
		defer pool.Close()
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
	authModule := auth.NewModule(pool, cfg.JWTSecret)

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{fallback(os.Getenv("CORS_ALLOWED_ORIGIN"), "http://localhost:3000")},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

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
	})

	return r
}

func fallback(value string, defaultValue string) string {
	if value == "" {
		return defaultValue
	}

	return value
}
