package middleware

import "net/http"

func AccountLock(isLocked func(string) bool) Middleware {
	if isLocked == nil {
		return nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isLocked(ClientIP(r)) {
				http.Error(w, "Account is locked", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}