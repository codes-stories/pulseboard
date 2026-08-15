package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                    string
	DBURL                   string
	JWTSecret               string
	GoogleOAuthClientID     string
	GoogleOAuthClientSecret string
	GoogleOAuthRedirectURL  string
	GitHubOAuthClientID     string
	GitHubOAuthClientSecret string
	GitHubOAuthRedirectURL  string

	// Swagger / OpenAPI.
	SwaggerEnabled bool

	// Agent enrollment tokens.
	AgentEnrollmentTokenTTL time.Duration

	// Agent API key lifetime.
	AgentAPIKeyTTL time.Duration

	// Agent traffic rate limits (requests per minute). Zero disables the limit.
	AgentEnrollmentRateLimit int
	AgentAuthRateLimit       int
	AgentHeartbeatRateLimit  int
	AgentResultRateLimit     int

	// Installation command metadata surfaced to the frontend.
	AgentInstallURL      string
	AgentDownloadBaseURL string
	AgentVersion         string

	// API tester proxy behavior.
	APITestProxyTimeout     time.Duration
	APITestMaxResponseBytes int
	APITestAllowPrivate     bool

	// AI payload generation (OpenAI-compatible). Leave AIAPIKey empty to use
	// the built-in deterministic local generator.
	OpenAIAPIKey  string
	OpenAIModel   string
	OpenAIBaseURL string
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:                    os.Getenv("PORT"),
		DBURL:                   os.Getenv("DATABASE_URL"),
		JWTSecret:               os.Getenv("JWT_SECRET"),
		GoogleOAuthClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
		GoogleOAuthClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
		GoogleOAuthRedirectURL:  os.Getenv("GOOGLE_OAUTH_REDIRECT_URL"),
		GitHubOAuthClientID:     os.Getenv("GITHUB_OAUTH_CLIENT_ID"),
		GitHubOAuthClientSecret: os.Getenv("GITHUB_OAUTH_CLIENT_SECRET"),
		GitHubOAuthRedirectURL:  os.Getenv("GITHUB_OAUTH_REDIRECT_URL"),

		SwaggerEnabled:           envBool("SWAGGER_ENABLED", false),
		AgentEnrollmentTokenTTL:  envDuration("AGENT_ENROLLMENT_TOKEN_TTL", 15*time.Minute),
		AgentAPIKeyTTL:           envDuration("AGENT_API_KEY_TTL", 8760*time.Hour),
		AgentEnrollmentRateLimit: envInt("AGENT_ENROLLMENT_RATE_LIMIT", 5),
		AgentAuthRateLimit:       envInt("AGENT_AUTH_RATE_LIMIT", 120),
		AgentHeartbeatRateLimit:  envInt("AGENT_HEARTBEAT_RATE_LIMIT", 120),
		AgentResultRateLimit:     envInt("AGENT_RESULT_RATE_LIMIT", 600),

		AgentInstallURL:      envString("PULSE_AGENT_INSTALL_URL", "https://install.pulseboard.dev"),
		AgentDownloadBaseURL: envString("PULSE_AGENT_DOWNLOAD_BASE_URL", "https://downloads.pulseboard.dev"),
		AgentVersion:         envString("PULSE_AGENT_VERSION", "0.1.0"),

		APITestProxyTimeout:     envDuration("APITEST_PROXY_TIMEOUT", 10*time.Second),
		APITestMaxResponseBytes: envInt("APITEST_MAX_RESPONSE_BYTES", 1<<20),
		APITestAllowPrivate:     envBool("APITEST_ALLOW_PRIVATE", false),

		OpenAIAPIKey:  os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:   envString("OPENAI_MODEL", "gpt-4o-mini"),
		OpenAIBaseURL: envString("OPENAI_BASE_URL", "https://api.openai.com/v1"),
	}
}

func envString(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
