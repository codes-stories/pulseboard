package users

import (
	"context"
	"errors"
	"strings"
)

var ErrInvalidInput = errors.New("invalid input")

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) GetProfile(ctx context.Context, userID string) (*Profile, error) {
	return s.repository.GetProfile(ctx, userID)
}

func (s *Service) UpdateProfile(ctx context.Context, userID string, req UpdateProfileRequest) (*Profile, error) {
	profile, err := s.repository.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, ErrInvalidInput
		}
		profile.Name = name
	}
	if req.Phone != nil {
		profile.Phone = strings.TrimSpace(*req.Phone)
	}
	if req.AvatarURL != nil {
		profile.AvatarURL = strings.TrimSpace(*req.AvatarURL)
	}

	if err := s.repository.UpdateProfile(ctx, profile); err != nil {
		return nil, err
	}

	return profile, nil
}
