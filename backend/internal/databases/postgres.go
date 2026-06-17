package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(dbURL string) (*pgxpool.Pool, error) {
	return pgxpool.New(context.Background(), dbURL)
}