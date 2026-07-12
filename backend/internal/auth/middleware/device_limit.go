package middleware

import "net/http"

func DeviceLimit(maxDevices int, activeDevices func(string) int) Middleware {
	if maxDevices <= 0 || activeDevices == nil {
		return nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := r.Header.Get("X-User-ID")
			if userID == "" {
				http.Error(w, "User ID not provided", http.StatusUnauthorized)
				return
			}

			if activeDevices(userID) >= maxDevices {
				http.Error(w, "Too many registered devices", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
