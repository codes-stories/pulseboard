package apitests

import "errors"

var (
	ErrInvalidInput     = errors.New("invalid input")
	ErrTestNotFound     = errors.New("api test not found")
	ErrUnsafeTarget     = errors.New("requests to private or internal addresses are not allowed")
	ErrUpstreamFailed   = errors.New("upstream request failed")
	ErrStoreUnavailable = errors.New("store is unavailable")
)
