package middleware

import "net/http"

func Captcha(validate func(*http.Request) bool) Middleware {
	if validate == nil {
		return nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !validate(r) {
				http.Error(w, "captcha validation failed", http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}