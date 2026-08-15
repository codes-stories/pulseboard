package agents

import (
	"strings"
	"testing"
)

func TestGenerateAPIKeyFormat(t *testing.T) {
	plaintext, prefix, hash, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey returned error: %v", err)
	}

	if !strings.HasPrefix(plaintext, apiKeyPrefix) {
		t.Fatalf("expected key prefix %q, got %q", apiKeyPrefix, plaintext)
	}
	if len(plaintext) <= len(apiKeyPrefix) {
		t.Fatalf("key secret is missing: %q", plaintext)
	}
	if !strings.HasPrefix(prefix, apiKeyPrefix) {
		t.Fatalf("expected display prefix to start with %q, got %q", apiKeyPrefix, prefix)
	}
	if hash == "" || hash == plaintext {
		t.Fatalf("hash must be a non-empty digest, never the plaintext")
	}
	if strings.Contains(prefix, plaintext[len(apiKeyPrefix):]) {
		t.Fatalf("display prefix must not contain the full secret")
	}
}

func TestGenerateAPIKeyUniqueness(t *testing.T) {
	seen := make(map[string]struct{})
	for i := 0; i < 100; i++ {
		plaintext, _, _, err := GenerateAPIKey()
		if err != nil {
			t.Fatalf("GenerateAPIKey returned error: %v", err)
		}
		if _, ok := seen[plaintext]; ok {
			t.Fatalf("duplicate key generated: %q", plaintext)
		}
		seen[plaintext] = struct{}{}
	}
}

func TestGenerateEnrollmentTokenFormat(t *testing.T) {
	plaintext, hash, err := GenerateEnrollmentToken()
	if err != nil {
		t.Fatalf("GenerateEnrollmentToken returned error: %v", err)
	}

	if !strings.HasPrefix(plaintext, enrollPrefix) {
		t.Fatalf("expected token prefix %q, got %q", enrollPrefix, plaintext)
	}
	if hash == "" || hash == plaintext {
		t.Fatalf("hash must be a non-empty digest, never the plaintext")
	}
}

func TestHashCredentialDeterministic(t *testing.T) {
	a := hashCredential("pb_agent_some-secret")
	b := hashCredential("pb_agent_some-secret")
	c := hashCredential("pb_agent_other-secret")

	if a != b {
		t.Fatalf("hashing must be deterministic")
	}
	if a == c {
		t.Fatalf("different secrets must produce different hashes")
	}
}

func TestHashCredentialNotPlaintext(t *testing.T) {
	secret := "pb_agent_some-secret"
	if hashCredential(secret) == secret {
		t.Fatalf("hash must never equal the plaintext")
	}
}

func TestGenerateAPIKeyNotDerivedFromInput(t *testing.T) {
	first, _, _, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey returned error: %v", err)
	}
	second, _, _, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("GenerateAPIKey returned error: %v", err)
	}

	// Keys are random, not derived from each other.
	if first == second {
		t.Fatalf("keys must be unpredictable and independent")
	}
}
