package middleware

import (
	"net"
	"net/http"
	"strings"
)

type Middleware func(http.Handler) http.Handler

type Chain []Middleware

func (c Chain) Then(next http.Handler) http.Handler {
	for i := len(c) - 1; i >= 0; i-- {
		if c[i] == nil {
			continue
		}
		next = c[i](next)
	}

	return next
}

func Compose(middlewares ...Middleware) Middleware {
	return func(next http.Handler) http.Handler {
		return Chain(middlewares).Then(next)
	}
}

func ClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}

	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}

	return strings.TrimSpace(r.RemoteAddr)
}