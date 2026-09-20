package metrics

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	collector *Collector
	hub       *Hub
}

func NewHandler(collector *Collector, hub *Hub) *Handler {
	return &Handler{collector: collector, hub: hub}
}

func (h *Handler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	snap := h.collector.Collect()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(snap)
}

func (h *Handler) StreamMetrics(w http.ResponseWriter, r *http.Request) {
	agentID := chi.URLParam(r, "agentID")
	h.hub.StreamHandler(w, r, agentID)
}
