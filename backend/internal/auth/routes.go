package auth

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (m *Module) Routes() http.Handler {
	r := chi.NewRouter()

	r.Post("/register", m.handler.Register)
	r.Post("/login", m.handler.Login)
	r.Get("/me", m.handler.Me)

	return r
}
