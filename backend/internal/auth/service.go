package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrInvalidInput            = errors.New("invalid input")
	ErrInvalidCredentials      = errors.New("invalid email or password")
	ErrProviderNotConfigured   = errors.New("oauth provider is not configured")
	ErrInvalidOAuthState       = errors.New("invalid oauth state")
	ErrInvalidToken            = errors.New("invalid token")
	ErrSessionNotFound         = errors.New("session not found")
	ErrSessionDeviceMismatch   = errors.New("session device mismatch")
	ErrAccountNotActive        = errors.New("account is not active")
	ErrOAuthEmailUnverified    = errors.New("oauth email is not verified")
	ErrUnsupportedOAuthAccount = errors.New("unsupported oauth account")
)

type Service struct {
	repository  *Repository
	jwtSecret   string
	oauth       OAuthConfig
	accessTTL   time.Duration
	refreshTTL  time.Duration
	stateTTL    time.Duration
	issuer      string
	httpTimeout time.Duration
}

func NewService(repository *Repository, jwtSecret string, oauth OAuthConfig) *Service {
	if oauth.Issuer == "" {
		oauth.Issuer = "pulseboard"
	}

	return &Service{
		repository:  repository,
		jwtSecret:   jwtSecret,
		oauth:       oauth,
		accessTTL:   15 * time.Minute,
		refreshTTL:  30 * 24 * time.Hour,
		stateTTL:    15 * time.Minute,
		issuer:      oauth.Issuer,
		httpTimeout: 10 * time.Second,
	}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Email) == "" || len(req.Password) < 12 {
		return nil, ErrInvalidInput
	}

	if existing, err := s.repository.GetUserByEmail(ctx, req.Email); err == nil && existing != nil {
		return nil, fmt.Errorf("%w: email already registered", ErrInvalidInput)
	} else if err != nil && !errors.Is(err, ErrUserNotFound) {
		return nil, err
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	user := &User{
		ID:            newID(),
		Name:          strings.TrimSpace(req.Name),
		Email:         strings.ToLower(strings.TrimSpace(req.Email)),
		PasswordHash:  hash,
		EmailVerified: false,
		IsActive:      true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repository.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return s.issueSession(ctx, user, req.DeviceIdentity, "", "")
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	if strings.TrimSpace(req.Email) == "" || req.Password == "" {
		return nil, ErrInvalidInput
	}

	user, err := s.repository.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrAccountNotActive
	}

	if user.PasswordHash == "" {
		return nil, ErrInvalidCredentials
	}

	if err := verifyPassword(req.Password, user.PasswordHash); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.issueSession(ctx, user, req.DeviceIdentity, "", "")
}

func (s *Service) OAuthStartURL(provider OAuthProvider) (string, error) {
	cfg, err := s.providerConfig(provider)
	if err != nil {
		return "", err
	}

	state, err := signOAuthState(s.jwtSecret, oauthStatePayload{
		Provider:  string(provider),
		Nonce:     newID(),
		ExpiresAt: time.Now().UTC().Add(s.stateTTL).Unix(),
	})
	if err != nil {
		return "", err
	}

	return buildOAuthURL(provider, cfg, state), nil
}

func (s *Service) LoginWithOAuth(ctx context.Context, provider OAuthProvider, req OAuthCallbackRequest, ipAddress, userAgent string) (*AuthResponse, error) {
	if strings.TrimSpace(req.Code) == "" || strings.TrimSpace(req.State) == "" {
		return nil, ErrInvalidInput
	}

	state, err := verifyOAuthState(s.jwtSecret, req.State)
	if err != nil {
		return nil, ErrInvalidOAuthState
	}
	if state.Provider != string(provider) {
		return nil, ErrInvalidOAuthState
	}

	profile, err := s.exchangeOAuthCode(ctx, provider, req.Code)
	if err != nil {
		return nil, err
	}

	if profile.Email == "" {
		return nil, ErrUnsupportedOAuthAccount
	}

	if provider == OAuthProviderGitHub && !profile.EmailVerified {
		return nil, ErrOAuthEmailUnverified
	}

	user, err := s.findOrCreateOAuthUser(ctx, profile)
	if err != nil {
		return nil, err
	}

	return s.issueSession(ctx, user, req.DeviceIdentity, ipAddress, userAgent)
}

func (s *Service) Refresh(ctx context.Context, refreshToken, deviceIdentity, ipAddress, userAgent string) (*AuthResponse, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return nil, ErrInvalidInput
	}

	hash := hashToken(refreshToken)
	session, err := s.repository.GetSessionByRefreshTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}

	if session.DeviceIdentity != "" && deviceIdentity != "" && session.DeviceIdentity != deviceIdentity {
		return nil, ErrSessionDeviceMismatch
	}

	user, err := s.repository.GetUserByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrAccountNotActive
	}

	newRefreshToken, newRefreshHash, newRefreshExpiresAt, err := generateRefreshToken(s.refreshTTL)
	if err != nil {
		return nil, err
	}

	if err := s.repository.RotateSessionRefreshToken(ctx, session.ID, newRefreshHash, newRefreshExpiresAt); err != nil {
		return nil, err
	}

	accessToken, expiresAt, err := generateAccessToken(user, s.jwtSecret, s.issuer, s.accessTTL)
	if err != nil {
		return nil, err
	}

	_ = ipAddress
	_ = userAgent

	return &AuthResponse{
		User:         *user,
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(time.Until(expiresAt).Seconds()),
	}, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	if strings.TrimSpace(refreshToken) == "" {
		return ErrInvalidInput
	}

	return s.repository.RevokeSessionByRefreshTokenHash(ctx, hashToken(refreshToken))
}

func (s *Service) Me(ctx context.Context, accessToken string) (*User, error) {
	claims, err := parseAccessToken(accessToken, s.jwtSecret)
	if err != nil {
		return nil, ErrInvalidToken
	}

	user, err := s.repository.GetUserByID(ctx, claims.Subject)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}

	return user, nil
}

func (s *Service) providerConfig(provider OAuthProvider) (OAuthProviderConfig, error) {
	switch provider {
	case OAuthProviderGoogle:
		if s.oauth.Google.ClientID == "" || s.oauth.Google.ClientSecret == "" || s.oauth.Google.RedirectURL == "" {
			return OAuthProviderConfig{}, ErrProviderNotConfigured
		}
		return s.oauth.Google, nil
	case OAuthProviderGitHub:
		if s.oauth.GitHub.ClientID == "" || s.oauth.GitHub.ClientSecret == "" || s.oauth.GitHub.RedirectURL == "" {
			return OAuthProviderConfig{}, ErrProviderNotConfigured
		}
		return s.oauth.GitHub, nil
	default:
		return OAuthProviderConfig{}, ErrProviderNotConfigured
	}
}

func (s *Service) exchangeOAuthCode(ctx context.Context, provider OAuthProvider, code string) (*OAuthAccount, error) {
	cfg, err := s.providerConfig(provider)
	if err != nil {
		return nil, err
	}

	switch provider {
	case OAuthProviderGoogle:
		return exchangeGoogle(ctx, s.httpTimeout, cfg, code)
	case OAuthProviderGitHub:
		return exchangeGitHub(ctx, s.httpTimeout, cfg, code)
	default:
		return nil, ErrProviderNotConfigured
	}
}

func (s *Service) issueSession(ctx context.Context, user *User, deviceIdentity, ipAddress, userAgent string) (*AuthResponse, error) {
	if user == nil {
		return nil, ErrInvalidInput
	}

	if !user.IsActive {
		return nil, ErrAccountNotActive
	}

	accessToken, expiresAt, err := generateAccessToken(user, s.jwtSecret, s.issuer, s.accessTTL)
	if err != nil {
		return nil, err
	}

	refreshToken, refreshHash, refreshExpiresAt, err := generateRefreshToken(s.refreshTTL)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	session := &Session{
		ID:               newID(),
		UserID:           user.ID,
		RefreshTokenHash: refreshHash,
		DeviceIdentity:   deviceIdentity,
		UserAgent:        userAgent,
		IPAddress:        ipAddress,
		ExpiresAt:        refreshExpiresAt,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := s.repository.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	return &AuthResponse{
		User:         *user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(time.Until(expiresAt).Seconds()),
	}, nil
}

func (s *Service) findOrCreateOAuthUser(ctx context.Context, profile *OAuthAccount) (*User, error) {
	if profile == nil {
		return nil, ErrInvalidInput
	}

	if existing, err := s.repository.GetUserByProvider(ctx, profile.Provider, profile.Subject); err == nil {
		return s.mergeOAuthProfile(ctx, existing, profile)
	} else if err != nil && !errors.Is(err, ErrUserNotFound) {
		return nil, err
	}

	if existing, err := s.repository.GetUserByEmail(ctx, profile.Email); err == nil {
		return s.mergeOAuthProfile(ctx, existing, profile)
	} else if err != nil && !errors.Is(err, ErrUserNotFound) {
		return nil, err
	}

	now := time.Now().UTC()
	user := &User{
		ID:            newID(),
		Name:          chooseNonEmpty(profile.Name, profile.Email),
		Email:         strings.ToLower(strings.TrimSpace(profile.Email)),
		AvatarURL:     profile.AvatarURL,
		EmailVerified: profile.EmailVerified,
		IsActive:      true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repository.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return s.linkOAuthIdentity(ctx, user, profile)
}

func (s *Service) mergeOAuthProfile(ctx context.Context, user *User, profile *OAuthAccount) (*User, error) {
	if user == nil || profile == nil {
		return nil, ErrInvalidInput
	}

	if profile.Name != "" {
		user.Name = profile.Name
	}
	if profile.AvatarURL != "" {
		user.AvatarURL = profile.AvatarURL
	}
	user.EmailVerified = user.EmailVerified || profile.EmailVerified
	user.UpdatedAt = time.Now().UTC()

	if err := s.repository.UpdateUser(ctx, user); err != nil {
		return nil, err
	}

	return s.linkOAuthIdentity(ctx, user, profile)
}

func (s *Service) linkOAuthIdentity(ctx context.Context, user *User, profile *OAuthAccount) (*User, error) {
	now := time.Now().UTC()
	identity := &AuthIdentity{
		ID:              newID(),
		UserID:          user.ID,
		Provider:        string(profile.Provider),
		ProviderSubject: profile.Subject,
		ProviderEmail:   profile.Email,
		ProviderName:    profile.Name,
		AvatarURL:       profile.AvatarURL,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := s.repository.UpsertIdentity(ctx, identity); err != nil {
		return nil, err
	}

	return user, nil
}

func chooseNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}

	return ""
}
