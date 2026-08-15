package middleware

import "net/http"

func SessionLimit(maxSessions int, activeSessions func(string) int) Middleware {
	if maxSessions <= 0 || activeSessions == nil {
		return nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := r.Header.Get("X-User-ID")
			if userID == "" {
				http.Error(w, "User ID not provided", http.StatusUnauthorized)
				return
			}

			if activeSessions(userID) >= maxSessions {
				http.Error(w, "Too many concurrent sessions", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
