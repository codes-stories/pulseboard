package users

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (m *Module) Routes() http.Handler {
	r := chi.NewRouter()

	r.Get("/", m.handler.GetProfile)
	r.Patch("/", m.handler.UpdateProfile)

	return r
}
