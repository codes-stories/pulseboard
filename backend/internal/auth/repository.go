package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrStoreUnavailable = errors.New("auth store is unavailable")
	ErrUserNotFound     = errors.New("user not found")
	ErrIdentityConflict  = errors.New("oauth identity is linked to another account")
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

func (r *Repository) CreateUser(ctx context.Context, user *User) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO auth_users (
			id, name, email, password_hash, avatar_url, email_verified, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, user.ID, user.Name, user.Email, user.PasswordHash, user.AvatarURL, user.EmailVerified, user.IsActive, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *Repository) UpdateUser(ctx context.Context, user *User) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		UPDATE auth_users
		SET name = $2,
			email = $3,
			password_hash = $4,
			avatar_url = $5,
			email_verified = $6,
			is_active = $7,
			updated_at = $8
		WHERE id = $1
	`, user.ID, user.Name, user.Email, user.PasswordHash, user.AvatarURL, user.EmailVerified, user.IsActive, user.UpdatedAt)
	return err
}

func (r *Repository) GetUserByID(ctx context.Context, userID string) (*User, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT id, name, email, password_hash, avatar_url, email_verified, is_active, created_at, updated_at
		FROM auth_users
		WHERE id = $1
	`, userID)

	return scanUser(row)
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT id, name, email, password_hash, avatar_url, email_verified, is_active, created_at, updated_at
		FROM auth_users
		WHERE lower(email) = lower($1)
	`, email)

	return scanUser(row)
}

func (r *Repository) GetUserByProvider(ctx context.Context, provider OAuthProvider, subject string) (*User, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT u.id, u.name, u.email, u.password_hash, u.avatar_url, u.email_verified, u.is_active, u.created_at, u.updated_at
		FROM auth_users u
		JOIN auth_identities i ON i.user_id = u.id
		WHERE i.provider = $1 AND i.provider_subject = $2
	`, string(provider), subject)

	return scanUser(row)
}

func (r *Repository) UpsertIdentity(ctx context.Context, identity *AuthIdentity) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO auth_identities (
			id, user_id, provider, provider_subject, provider_email, provider_name, avatar_url, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (provider, provider_subject)
		DO UPDATE SET
			user_id = EXCLUDED.user_id,
			provider_email = EXCLUDED.provider_email,
			provider_name = EXCLUDED.provider_name,
			avatar_url = EXCLUDED.avatar_url,
			updated_at = EXCLUDED.updated_at
	`, identity.ID, identity.UserID, identity.Provider, identity.ProviderSubject, identity.ProviderEmail, identity.ProviderName, identity.AvatarURL, identity.CreatedAt, identity.UpdatedAt)
	return err
}

func (r *Repository) CreateSession(ctx context.Context, session *Session) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO auth_sessions (
			id, user_id, refresh_token_hash, device_identity, user_agent, ip_address, revoked_at, expires_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, session.ID, session.UserID, session.RefreshTokenHash, session.DeviceIdentity, session.UserAgent, session.IPAddress, session.RevokedAt, session.ExpiresAt, session.CreatedAt, session.UpdatedAt)
	return err
}

func (r *Repository) GetSessionByRefreshTokenHash(ctx context.Context, hash string) (*Session, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT id, user_id, refresh_token_hash, device_identity, user_agent, ip_address, revoked_at, expires_at, created_at, updated_at
		FROM auth_sessions
		WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
	`, hash)

	return scanSession(row)
}

func (r *Repository) RotateSessionRefreshToken(ctx context.Context, sessionID, refreshTokenHash string, expiresAt time.Time) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		UPDATE auth_sessions
		SET refresh_token_hash = $2,
			expires_at = $3,
			updated_at = now()
		WHERE id = $1 AND revoked_at IS NULL
	`, sessionID, refreshTokenHash, expiresAt)
	return err
}

func (r *Repository) RevokeSessionByRefreshTokenHash(ctx context.Context, hash string) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		UPDATE auth_sessions
		SET revoked_at = now(), updated_at = now()
		WHERE refresh_token_hash = $1 AND revoked_at IS NULL
	`, hash)
	return err
}

func (r *Repository) RevokeSessionsByUser(ctx context.Context, userID string) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		UPDATE auth_sessions
		SET revoked_at = now(), updated_at = now()
		WHERE user_id = $1 AND revoked_at IS NULL
	`, userID)
	return err
}

func scanUser(row pgx.Row) (*User, error) {
	var user User
	if err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.AvatarURL,
		&user.EmailVerified,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

func scanSession(row pgx.Row) (*Session, error) {
	var session Session
	if err := row.Scan(
		&session.ID,
		&session.UserID,
		&session.RefreshTokenHash,
		&session.DeviceIdentity,
		&session.UserAgent,
		&session.IPAddress,
		&session.RevokedAt,
		&session.ExpiresAt,
		&session.CreatedAt,
		&session.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &session, nil
}
