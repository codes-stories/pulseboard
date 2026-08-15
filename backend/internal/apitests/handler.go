package apitests

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	authmw "github.com/gaurav/pulseboard/internal/auth/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// @Summary Proxy an HTTP request
// @Tags API Tester
// @Description Execute an arbitrary HTTP request server-side and return the status, headers, and body.
// @Accept json
// @Produce json
// @Param request body apitests.ProxyRequest true "Request to execute"
// @Success 200 {object} apitests.ProxyResponse
// @Failure 400 {object} apitests.ErrorResponse
// @Failure 502 {object} apitests.ErrorResponse
// @Router /tools/proxy [post]
func (h *Handler) Proxy(w http.ResponseWriter, r *http.Request) {
	var req ProxyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	response, err := h.service.SendRequest(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput), errors.Is(err, ErrUnsafeTarget):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, ErrUpstreamFailed):
			writeError(w, http.StatusBadGateway, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	writeJSON(w, http.StatusOK, response)
}

// @Summary Generate example API payloads
// @Tags API Tester
// @Description Given a request the user just tested, generate similar payload examples via AI (when configured) or a local generator.
// @Accept json
// @Produce json
// @Param request body apitests.PayloadRequest true "Example request"
// @Success 200 {object} apitests.PayloadResponse
// @Failure 400 {object} apitests.ErrorResponse
// @Router /tools/ai/payload [post]
func (h *Handler) GeneratePayloads(w http.ResponseWriter, r *http.Request) {
	var req PayloadRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	response, err := h.service.GeneratePayloads(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, response)
}

// @Summary List saved API tests
// @Tags API Tester
// @Description List the saved API tests for the authenticated user.
// @Security BearerAuth
// @Produce json
// @Success 200 {array} apitests.APITest
// @Failure 401 {object} apitests.ErrorResponse
// @Router /api-tests [get]
func (h *Handler) ListTests(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	tests, err := h.service.ListTests(r.Context(), user.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, tests)
}

// @Summary Save an API test
// @Tags API Tester
// @Description Persist a request/response pair so it can be replayed later.
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body apitests.SaveAPITestRequest true "Test details"
// @Success 201 {object} apitests.APITest
// @Failure 400 {object} apitests.ErrorResponse
// @Failure 401 {object} apitests.ErrorResponse
// @Router /api-tests [post]
func (h *Handler) CreateTest(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req SaveAPITestRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	test, err := h.service.SaveTest(r.Context(), user.ID, req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, test)
}

// @Summary Get an API test
// @Tags API Tester
// @Description Get a single saved API test owned by the user.
// @Security BearerAuth
// @Produce json
// @Param testID path string true "Test ID"
// @Success 200 {object} apitests.APITest
// @Failure 401 {object} apitests.ErrorResponse
// @Failure 404 {object} apitests.ErrorResponse
// @Router /api-tests/{testID} [get]
func (h *Handler) GetTest(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	test, err := h.service.GetTest(r.Context(), user.ID, chi.URLParam(r, "testID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, test)
}

// @Summary Update an API test
// @Tags API Tester
// @Description Update a saved API test. Only the owner may update it.
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param testID path string true "Test ID"
// @Param request body apitests.SaveAPITestRequest true "Test details"
// @Success 200 {object} apitests.APITest
// @Failure 400 {object} apitests.ErrorResponse
// @Failure 401 {object} apitests.ErrorResponse
// @Failure 404 {object} apitests.ErrorResponse
// @Router /api-tests/{testID} [put]
func (h *Handler) UpdateTest(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req SaveAPITestRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	test, err := h.service.UpdateTest(r.Context(), user.ID, chi.URLParam(r, "testID"), req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, test)
}

// @Summary Delete an API test
// @Tags API Tester
// @Description Delete a saved API test. Only the owner may delete it.
// @Security BearerAuth
// @Produce json
// @Param testID path string true "Test ID"
// @Success 204
// @Failure 401 {object} apitests.ErrorResponse
// @Failure 404 {object} apitests.ErrorResponse
// @Router /api-tests/{testID} [delete]
func (h *Handler) DeleteTest(w http.ResponseWriter, r *http.Request) {
	user, ok := authmw.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	if err := h.service.DeleteTest(r.Context(), user.ID, chi.URLParam(r, "testID")); err != nil {
		writeServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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
	case errors.Is(err, ErrTestNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}
