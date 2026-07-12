package middleware

import (
	"net/http"
	"sync"
	"time"
)

type RateLimiter interface {
	Allow(key string) bool
}

type memoryRateLimiter struct {
	limit  int
	window time.Duration
	mu     sync.Mutex
	hits   map[string]*rateWindow
}

type rateWindow struct {
	startedAt time.Time
	count     int
}

func NewMemoryRateLimiter(limit int, window time.Duration) RateLimiter {
	if limit <= 0 || window <= 0 {
		return nil
	}

	return &memoryRateLimiter{
		limit:  limit,
		window: window,
		hits:   make(map[string]*rateWindow),
	}
}

func (l *memoryRateLimiter) Allow(key string) bool {
	if l == nil {
		return true
	}

	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	entry, ok := l.hits[key]
	if !ok || now.Sub(entry.startedAt) >= l.window {
		l.hits[key] = &rateWindow{startedAt: now, count: 1}
		return true
	}

	if entry.count >= l.limit {
		return false
	}

	entry.count++
	return true
}

func RateLimit(limiter RateLimiter, keyFunc func(*http.Request) string) Middleware {
	if limiter == nil {
		return nil
	}

	if keyFunc == nil {
		keyFunc = func(r *http.Request) string {
			return ClientIP(r)
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !limiter.Allow(keyFunc(r)) {
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
