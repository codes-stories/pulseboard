package metrics

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type Hub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan []byte]struct{}
}

func NewHub() *Hub {
	return &Hub{subscribers: make(map[string]map[chan []byte]struct{})}
}

func (h *Hub) Subscribe(agentID string) chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	if h.subscribers[agentID] == nil {
		h.subscribers[agentID] = make(map[chan []byte]struct{})
	}
	h.subscribers[agentID][ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *Hub) Unsubscribe(agentID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if subs, ok := h.subscribers[agentID]; ok {
		delete(subs, ch)
		close(ch)
		if len(subs) == 0 {
			delete(h.subscribers, agentID)
		}
	}
}

func (h *Hub) Broadcast(agentID string, snapshot *MetricsSnapshot) {
	data, err := json.Marshal(snapshot)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	if subs, ok := h.subscribers[agentID]; ok {
		for ch := range subs {
			select {
			case ch <- data:
			default:
			}
		}
	}
}

func (h *Hub) StreamHandler(w http.ResponseWriter, r *http.Request, agentID string) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	ch := h.Subscribe(agentID)
	defer h.Unsubscribe(agentID, ch)

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case data, ok := <-ch:
			if !ok {
				return
			}
			_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
