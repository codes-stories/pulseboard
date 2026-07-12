package auth

import authmw "github.com/gaurav/pulseboard/internal/auth/middleware"

func appendMiddleware(chain []authmw.Middleware, middleware authmw.Middleware) []authmw.Middleware {
	if middleware == nil {
		return chain
	}

	return append(chain, middleware)
}
