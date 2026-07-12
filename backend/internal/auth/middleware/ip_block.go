package middleware

import (
	"net/http"
	"strings"
)

func IPBlock(blockedIPs []string) Middleware {
	blocked := make(map[string]struct{}, len(blockedIPs))
	for _, blockedIP := range blockedIPs {
		blockedIP = strings.TrimSpace(blockedIP)
		if blockedIP == "" {
			continue
		}
		blocked[blockedIP] = struct{}{}
	}

	if len(blocked) == 0 {
		return nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, found := blocked[ClientIP(r)]; found {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}