package apitests

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// ToolRoutes returns the public API-tester routes (proxy + AI payload
// generation). They work without authentication so the tester can be used
// before signing up.
func (m *Module) ToolRoutes() http.Handler {
	r := chi.NewRouter()

	r.Post("/proxy", m.handler.Proxy)
	r.Post("/ai/payload", m.handler.GeneratePayloads)

	return r
}

// Routes returns the authenticated saved-tests CRUD router. It is mounted by
// main under the user JWT middleware, so every handler here is owner-scoped.
func (m *Module) Routes() http.Handler {
	r := chi.NewRouter()

	r.Get("/", m.handler.ListTests)
	r.Post("/", m.handler.CreateTest)

	r.Route("/{testID}", func(r chi.Router) {
		r.Get("/", m.handler.GetTest)
		r.Put("/", m.handler.UpdateTest)
		r.Delete("/", m.handler.DeleteTest)
	})

	return r
}
