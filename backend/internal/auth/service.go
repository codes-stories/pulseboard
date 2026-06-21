package auth

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrInvalidInput   = errors.New("invalid input")
	ErrNotImplemented = errors.New("auth persistence is not implemented yet")
)

type Service struct {
	repository *Repository
	jwtSecret  string
}

func NewService(repository *Repository, jwtSecret string) *Service {
	return &Service{
		repository: repository,
		jwtSecret:  jwtSecret,
	}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Email) == "" || req.Password == "" {
		return nil, ErrInvalidInput
	}

	return nil, ErrNotImplemented
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	if strings.TrimSpace(req.Email) == "" || req.Password == "" {
		return nil, ErrInvalidInput
	}

	return nil, ErrNotImplemented
}
