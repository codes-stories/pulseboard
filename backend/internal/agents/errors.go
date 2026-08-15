package agents

import "errors"

var (
	ErrInvalidInput            = errors.New("invalid input")
	ErrAgentNotFound           = errors.New("agent not found")
	ErrAgentDisabled           = errors.New("agent is disabled")
	ErrAPIKeyNotFound          = errors.New("api key not found")
	ErrEnrollmentTokenNotFound = errors.New("enrollment token not found")
	ErrEnrollmentTokenExpired  = errors.New("enrollment token has expired")
	ErrEnrollmentTokenUsed     = errors.New("enrollment token has already been used")
	ErrEnrollmentTokenRevoked  = errors.New("enrollment token has been revoked")
	ErrMonitorNotFound         = errors.New("monitor not found")
	ErrInvalidCredentials      = errors.New("invalid agent credentials")
	ErrRateLimitExceeded       = errors.New("rate limit exceeded")
	ErrStoreUnavailable        = errors.New("store is unavailable")
)
