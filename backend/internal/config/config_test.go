package config

import (
	"os"
	"testing"
	"time"
)

func clearAgentEnv(t *testing.T) {
	t.Helper()

	for _, key := range []string{
		"SWAGGER_ENABLED",
		"AGENT_ENROLLMENT_TOKEN_TTL",
		"AGENT_API_KEY_TTL",
		"AGENT_ENROLLMENT_RATE_LIMIT",
		"AGENT_AUTH_RATE_LIMIT",
		"AGENT_HEARTBEAT_RATE_LIMIT",
		"AGENT_RESULT_RATE_LIMIT",
		"PULSE_AGENT_INSTALL_URL",
		"PULSE_AGENT_DOWNLOAD_BASE_URL",
		"PULSE_AGENT_VERSION",
	} {
		t.Setenv(key, "")
		_ = os.Unsetenv(key)
	}
}

func TestDefaults(t *testing.T) {
	clearAgentEnv(t)

	cfg := Load()

	if cfg.SwaggerEnabled {
		t.Fatalf("swagger must be disabled by default")
	}
	if cfg.AgentEnrollmentTokenTTL != 15*time.Minute {
		t.Fatalf("expected enrollment TTL default 15m, got %v", cfg.AgentEnrollmentTokenTTL)
	}
	if cfg.AgentAPIKeyTTL != 8760*time.Hour {
		t.Fatalf("expected API key TTL default 8760h, got %v", cfg.AgentAPIKeyTTL)
	}
	if cfg.AgentEnrollmentRateLimit != 5 {
		t.Fatalf("expected enrollment rate limit default 5, got %d", cfg.AgentEnrollmentRateLimit)
	}
	if cfg.AgentAuthRateLimit != 120 {
		t.Fatalf("expected auth rate limit default 120, got %d", cfg.AgentAuthRateLimit)
	}
	if cfg.AgentInstallURL == "" || cfg.AgentDownloadBaseURL == "" || cfg.AgentVersion == "" {
		t.Fatalf("installation metadata defaults must be non-empty")
	}
}

func TestEnvOverrides(t *testing.T) {
	clearAgentEnv(t)

	t.Setenv("SWAGGER_ENABLED", "true")
	t.Setenv("AGENT_ENROLLMENT_TOKEN_TTL", "5m")
	t.Setenv("AGENT_API_KEY_TTL", "48h")
	t.Setenv("AGENT_ENROLLMENT_RATE_LIMIT", "2")
	t.Setenv("AGENT_AUTH_RATE_LIMIT", "50")
	t.Setenv("PULSE_AGENT_INSTALL_URL", "https://example.com/install.sh")

	cfg := Load()

	if !cfg.SwaggerEnabled {
		t.Fatalf("expected swagger enabled")
	}
	if cfg.AgentEnrollmentTokenTTL != 5*time.Minute {
		t.Fatalf("expected enrollment TTL 5m, got %v", cfg.AgentEnrollmentTokenTTL)
	}
	if cfg.AgentAPIKeyTTL != 48*time.Hour {
		t.Fatalf("expected API key TTL 48h, got %v", cfg.AgentAPIKeyTTL)
	}
	if cfg.AgentEnrollmentRateLimit != 2 {
		t.Fatalf("expected enrollment rate limit 2, got %d", cfg.AgentEnrollmentRateLimit)
	}
	if cfg.AgentInstallURL != "https://example.com/install.sh" {
		t.Fatalf("unexpected install url %q", cfg.AgentInstallURL)
	}
}

func TestInvalidEnvFallsBackToDefaults(t *testing.T) {
	clearAgentEnv(t)

	t.Setenv("AGENT_ENROLLMENT_TOKEN_TTL", "not-a-duration")
	t.Setenv("AGENT_ENROLLMENT_RATE_LIMIT", "abc")

	cfg := Load()

	if cfg.AgentEnrollmentTokenTTL != 15*time.Minute {
		t.Fatalf("invalid duration must fall back to default, got %v", cfg.AgentEnrollmentTokenTTL)
	}
	if cfg.AgentEnrollmentRateLimit != 5 {
		t.Fatalf("invalid int must fall back to default, got %d", cfg.AgentEnrollmentRateLimit)
	}
}
