package auth

import "github.com/jackc/pgx/v5/pgxpool"

type Module struct {
	repository *Repository
	service    *Service
	handler    *Handler
}

func NewModule(db *pgxpool.Pool, jwtSecret string) *Module {
	repository := NewRepository(db)
	service := NewService(repository, jwtSecret)
	handler := NewHandler(service)

	return &Module{
		repository: repository,
		service:    service,
		handler:    handler,
	}
}
