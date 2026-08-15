package agents

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
)

const (
	apiKeyPrefix     = "pb_agent_"
	enrollPrefix     = "pb_enroll_"
	prefixDisplayLen = 8
)

var errCryptoRandom = errors.New("cryptographic random generator unavailable")

// GenerateAPIKey creates a new unrecognizable agent API key in the form
// pb_agent_<random-secret>. The plaintext key is returned exactly once; only
// the hash and a short display prefix should ever be persisted.
func GenerateAPIKey() (plaintext, prefix, hash string, err error) {
	secret, err := randomSecret()
	if err != nil {
		return "", "", "", err
	}

	plaintext = apiKeyPrefix + secret
	prefix = apiKeyPrefix + secret[:prefixDisplayLen]
	return plaintext, prefix, hashCredential(plaintext), nil
}

// GenerateEnrollmentToken creates a short-lived single-use enrollment token in
// the form pb_enroll_<random-secret>. Only the hash should be persisted.
func GenerateEnrollmentToken() (plaintext, hash string, err error) {
	secret, err := randomSecret()
	if err != nil {
		return "", "", err
	}

	plaintext = enrollPrefix + secret
	return plaintext, hashCredential(plaintext), nil
}

// hashCredential produces a SHA-256 hex digest suitable for storage. Secrets
// are compared by hash, never by plaintext.
func hashCredential(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomSecret() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", errCryptoRandom
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}
