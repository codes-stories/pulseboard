package users

import "github.com/jackc/pgx/v5/pgxpool"

type Module struct {
	repository *Repository
	service    *Service
	handler    *Handler
}

func NewModule(db *pgxpool.Pool) *Module {
	repository := NewRepository(db)
	service := NewService(repository)
	return &Module{
		repository: repository,
		service:    service,
		handler:    NewHandler(service),
	}
}
