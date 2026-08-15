package apitests

import "github.com/jackc/pgx/v5/pgxpool"

type Module struct {
	repository *Repository
	service    *Service
	handler    *Handler
}

func NewModule(db *pgxpool.Pool, config Config) *Module {
	repository := NewRepository(db)
	service := NewService(repository, config)
	return &Module{
		repository: repository,
		service:    service,
		handler:    NewHandler(service),
	}
}
