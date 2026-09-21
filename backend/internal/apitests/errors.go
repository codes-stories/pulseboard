package apitests

import "errors"

var (
	ErrInvalidInput     = errors.New("invalid input")
	ErrTestNotFound     = errors.New("api test not found")
	ErrUnsafeTarget     = errors.New("target is a private or local address. Set APITEST_ALLOW_PRIVATE=true on the backend to allow private targets, or use a tunnel (ngrok, Cloudflare Tunnel) to expose local services publicly")
	ErrUpstreamFailed   = errors.New("upstream request failed")
	ErrStoreUnavailable = errors.New("store is unavailable")
)
