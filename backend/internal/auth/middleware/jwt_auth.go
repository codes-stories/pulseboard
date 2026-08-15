package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

var errInvalidToken = errors.New("invalid token")

type accessTokenClaims struct {
	Subject   string `json:"sub"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Issuer    string `json:"iss"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
	JWTID     string `json:"jti"`
}

// RequireUser authenticates a human user via a signed access token in the
// Authorization header and puts the resolved identity into the request context.
func RequireUser(jwtSecret string) Middleware {
	if strings.TrimSpace(jwtSecret) == "" {
		return nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r.Header.Get("Authorization"))
			if token == "" {
				writeJSONError(w, http.StatusUnauthorized, "authorization token required")
				return
			}

			claims, err := verifyAccessToken(token, jwtSecret)
			if err != nil || strings.TrimSpace(claims.Subject) == "" {
				writeJSONError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			ctx := context.WithValue(r.Context(), ctxKeyUser, AuthenticatedUser{
				ID:    claims.Subject,
				Email: claims.Email,
				Name:  claims.Name,
			})

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func verifyAccessToken(token, secret string) (*accessTokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errInvalidToken
	}

	unsignedToken := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(parts[2]), []byte(jwtSignature(secret, unsignedToken))) {
		return nil, errInvalidToken
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errInvalidToken
	}

	var claims accessTokenClaims
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return nil, errInvalidToken
	}

	if claims.ExpiresAt > 0 && time.Now().UTC().Unix() > claims.ExpiresAt {
		return nil, errInvalidToken
	}

	return &claims, nil
}

func jwtSignature(secret, content string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(content))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
