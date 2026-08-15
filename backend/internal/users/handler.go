package users

import (
	"encoding/json"
	"errors"
	"net/http"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// @Summary Get the user profile
// @Tags Profile
// @Description Get the profile of the authenticated user.
// @Security BearerAuth
// @Produce json
// @Success 200 {object} users.Profile
// @Failure 401 {object} users.ErrorResponse
// @Router /profile [get]
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	profile, err := h.service.GetProfile(r.Context(), user.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, profile)
}

// @Summary Update the user profile
// @Tags Profile
// @Description Update profile fields of the authenticated user.
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body users.UpdateProfileRequest true "Fields to update"
// @Success 200 {object} users.Profile
// @Failure 400 {object} users.ErrorResponse
// @Failure 401 {object} users.ErrorResponse
// @Router /profile [patch]
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req UpdateProfileRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	profile, err := h.service.UpdateProfile(r.Context(), user.ID, req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, profile)
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
	case errors.Is(err, ErrProfileNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}
