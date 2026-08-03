package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

const refreshCookieName = "pulse_refresh_token"

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	populateRequestContext(r, &req.DeviceIdentity)

	res, err := h.service.Register(r.Context(), req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	setRefreshCookie(w, r, res.RefreshToken, time.Now().UTC().Add(30*24*time.Hour))
	res.RefreshToken = ""
	writeJSON(w, http.StatusCreated, res)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	populateRequestContext(r, &req.DeviceIdentity)

	res, err := h.service.Login(r.Context(), req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	setRefreshCookie(w, r, res.RefreshToken, time.Now().UTC().Add(30*24*time.Hour))
	res.RefreshToken = ""
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) GoogleStart(w http.ResponseWriter, r *http.Request) {
	h.redirectOAuth(w, r, OAuthProviderGoogle)
}

func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	h.handleOAuthCallback(w, r, OAuthProviderGoogle)
}

func (h *Handler) GitHubStart(w http.ResponseWriter, r *http.Request) {
	h.redirectOAuth(w, r, OAuthProviderGitHub)
}

func (h *Handler) GitHubCallback(w http.ResponseWriter, r *http.Request) {
	h.handleOAuthCallback(w, r, OAuthProviderGitHub)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := readRefreshCookie(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "refresh token missing")
		return
	}
	deviceIdentity := r.Header.Get("X-Device-Identity")
	populateRequestContext(r, &deviceIdentity)

	res, err := h.service.Refresh(r.Context(), refreshToken, deviceIdentity, clientIP(r), r.UserAgent())
	if err != nil {
		writeServiceError(w, err)
		return
	}

	setRefreshCookie(w, r, res.RefreshToken, time.Now().UTC().Add(30*24*time.Hour))
	res.RefreshToken = ""
	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := readRefreshCookie(r)
	if err != nil {
		clearRefreshCookie(w, r)
		writeError(w, http.StatusOK, "logged out")
		return
	}

	if err := h.service.Logout(r.Context(), refreshToken); err != nil {
		writeServiceError(w, err)
		return
	}

	clearRefreshCookie(w, r)
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged out"})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	token := bearerToken(r.Header.Get("Authorization"))
	if token == "" {
		writeError(w, http.StatusUnauthorized, "authorization token required")
		return
	}

	user, err := h.service.Me(r.Context(), token)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) redirectOAuth(w http.ResponseWriter, r *http.Request, provider OAuthProvider) {
	authURL, err := h.service.OAuthStartURL(provider)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	http.Redirect(w, r, authURL, http.StatusFound)
}

func (h *Handler) handleOAuthCallback(w http.ResponseWriter, r *http.Request, provider OAuthProvider) {
	req := OAuthCallbackRequest{
		Code:           r.URL.Query().Get("code"),
		State:          r.URL.Query().Get("state"),
		DeviceIdentity: r.Header.Get("X-Device-Identity"),
	}
	populateRequestContext(r, &req.DeviceIdentity)

	res, err := h.service.LoginWithOAuth(r.Context(), provider, req, clientIP(r), r.UserAgent())
	if err != nil {
		writeServiceError(w, err)
		return
	}

	setRefreshCookie(w, r, res.RefreshToken, time.Now().UTC().Add(30*24*time.Hour))
	res.RefreshToken = ""
	writeJSON(w, http.StatusOK, res)
}

func decodeJSON(r *http.Request, dst any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(dst)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, ErrorResponse{Error: message})
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, ErrInvalidOAuthState):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrProviderNotConfigured):
		writeError(w, http.StatusNotImplemented, err.Error())
	case errors.Is(err, ErrSessionNotFound), errors.Is(err, ErrSessionDeviceMismatch), errors.Is(err, ErrInvalidToken):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, ErrAccountNotActive):
		writeError(w, http.StatusForbidden, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func setRefreshCookie(w http.ResponseWriter, r *http.Request, token string, expiresAt time.Time) {
	cookie := &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   isSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
		Expires:  expiresAt,
	}
	http.SetCookie(w, cookie)
}

func clearRefreshCookie(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   isSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

func readRefreshCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(cookie.Value), nil
}

func bearerToken(value string) string {
	parts := strings.Fields(value)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func populateRequestContext(r *http.Request, deviceIdentity *string) {
	if deviceIdentity == nil || strings.TrimSpace(*deviceIdentity) != "" {
		return
	}
	if value := strings.TrimSpace(r.Header.Get("X-Device-Identity")); value != "" {
		*deviceIdentity = value
	}
}

func isSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")), "https")
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}
	return strings.TrimSpace(r.RemoteAddr)
}
