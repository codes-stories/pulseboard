package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type accessTokenClaims struct {
	Subject   string `json:"sub"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Issuer    string `json:"iss"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
	JWTID     string `json:"jti"`
}

type oauthStatePayload struct {
	Provider  string `json:"provider"`
	Nonce     string `json:"nonce"`
	ExpiresAt int64  `json:"exp"`
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hash), nil
}

func verifyPassword(password, hashedPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func newID() string {
	return randomToken(16)
}

func randomToken(size int) string {
	if size <= 0 {
		size = 32
	}

	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		panic(err)
	}

	return base64.RawURLEncoding.EncodeToString(buffer)
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func generateAccessToken(user *User, secret, issuer string, ttl time.Duration) (string, time.Time, error) {
	if strings.TrimSpace(secret) == "" {
		return "", time.Time{}, errors.New("jwt secret is required")
	}

	now := time.Now().UTC()
	expiresAt := now.Add(ttl)
	claims := accessTokenClaims{
		Subject:   user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Issuer:    issuer,
		IssuedAt:  now.Unix(),
		ExpiresAt: expiresAt.Unix(),
		JWTID:     newID(),
	}

	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	encodedHeader, err := encodeJSON(header)
	if err != nil {
		return "", time.Time{}, err
	}
	encodedClaims, err := encodeJSON(claims)
	if err != nil {
		return "", time.Time{}, err
	}

	unsignedToken := encodedHeader + "." + encodedClaims
	signature := hmacSignature(secret, unsignedToken)
	return unsignedToken + "." + signature, expiresAt, nil
}

func parseAccessToken(token, secret string) (*accessTokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	unsignedToken := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(parts[2]), []byte(hmacSignature(secret, unsignedToken))) {
		return nil, ErrInvalidToken
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims accessTokenClaims
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return nil, ErrInvalidToken
	}

	if claims.ExpiresAt > 0 && time.Now().UTC().Unix() > claims.ExpiresAt {
		return nil, ErrInvalidToken
	}

	return &claims, nil
}

func generateRefreshToken(ttl time.Duration) (string, string, time.Time, error) {
	token := randomToken(48)
	expiresAt := time.Now().UTC().Add(ttl)
	return token, hashToken(token), expiresAt, nil
}

func signOAuthState(secret string, payload oauthStatePayload) (string, error) {
	encodedPayload, err := encodeJSON(payload)
	if err != nil {
		return "", err
	}

	signature := hmacSignature(secret, encodedPayload)
	return encodedPayload + "." + signature, nil
}

func verifyOAuthState(secret, state string) (*oauthStatePayload, error) {
	parts := strings.Split(state, ".")
	if len(parts) != 2 {
		return nil, ErrInvalidOAuthState
	}

	if !hmac.Equal([]byte(parts[1]), []byte(hmacSignature(secret, parts[0]))) {
		return nil, ErrInvalidOAuthState
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrInvalidOAuthState
	}

	var payload oauthStatePayload
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return nil, ErrInvalidOAuthState
	}

	if payload.ExpiresAt > 0 && time.Now().UTC().Unix() > payload.ExpiresAt {
		return nil, ErrInvalidOAuthState
	}

	return &payload, nil
}

func hmacSignature(secret, content string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(content))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func encodeJSON(value any) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("encode json: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(data), nil
}
