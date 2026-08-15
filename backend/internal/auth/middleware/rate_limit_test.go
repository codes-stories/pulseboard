package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestMemoryRateLimiterAllowsWithinLimit(t *testing.T) {
	limiter := NewMemoryRateLimiter(3, time.Minute)
	handler := RateLimit(limiter, nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "192.168.1.10:1234"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("request %d should be allowed, got %d", i+1, rec.Code)
		}
	}
}

func TestMemoryRateLimiterRejectsOverLimit(t *testing.T) {
	limiter := NewMemoryRateLimiter(2, time.Minute)
	handler := RateLimit(limiter, nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "192.168.1.10:1234"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.168.1.10:1234"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
}

func TestMemoryRateLimiterSeparateKeys(t *testing.T) {
	limiter := NewMemoryRateLimiter(1, time.Minute)
	handler := RateLimit(limiter, nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	first := httptest.NewRequest(http.MethodGet, "/", nil)
	first.RemoteAddr = "192.168.1.10:1234"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, first)

	second := httptest.NewRequest(http.MethodGet, "/", nil)
	second.RemoteAddr = "192.168.1.20:1234"
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, second)

	if rec.Code != http.StatusOK {
		t.Fatalf("different clients must have independent limits, got %d", rec.Code)
	}
}

func TestMemoryRateLimiterZeroDisables(t *testing.T) {
	if NewMemoryRateLimiter(0, time.Minute) != nil {
		t.Fatalf("a zero limit must disable the limiter")
	}
}
