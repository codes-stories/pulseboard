package users

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrProfileNotFound  = errors.New("profile not found")
	ErrStoreUnavailable = errors.New("store is unavailable")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) available() error {
	if r == nil || r.db == nil {
		return ErrStoreUnavailable
	}
	return nil
}

func (r *Repository) GetProfile(ctx context.Context, userID string) (*Profile, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT id, name, email, phone, avatar_url, email_verified, is_active, created_at, updated_at
		FROM auth_users
		WHERE id = $1
	`, userID)

	return scanProfile(row)
}

func (r *Repository) UpdateProfile(ctx context.Context, profile *Profile) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		UPDATE auth_users
		SET name = $2, phone = $3, avatar_url = $4, updated_at = now()
		WHERE id = $1
	`, profile.ID, profile.Name, profile.Phone, profile.AvatarURL)
	return err
}

func scanProfile(row pgx.Row) (*Profile, error) {
	var profile Profile
	if err := row.Scan(
		&profile.ID, &profile.Name, &profile.Email, &profile.Phone, &profile.AvatarURL,
		&profile.EmailVerified, &profile.IsActive, &profile.CreatedAt, &profile.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, err
	}

	return &profile, nil
}
