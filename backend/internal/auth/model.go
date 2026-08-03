package auth

import "time"

type OAuthProvider string

const (
	OAuthProviderGoogle OAuthProvider = "google"
	OAuthProviderGitHub OAuthProvider = "github"
)

type User struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"-"`
	AvatarURL     string    `json:"avatar_url,omitempty"`
	Phone         string    `json:"phone,omitempty"`
	EmailVerified bool      `json:"email_verified"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type AuthIdentity struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	Provider       string    `json:"provider"`
	ProviderSubject string   `json:"provider_subject"`
	ProviderEmail  string    `json:"provider_email,omitempty"`
	ProviderName   string    `json:"provider_name,omitempty"`
	AvatarURL      string    `json:"avatar_url,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Session struct {
	ID                string     `json:"id"`
	UserID            string     `json:"user_id"`
	RefreshTokenHash  string     `json:"-"`
	DeviceIdentity    string     `json:"device_identity,omitempty"`
	UserAgent         string     `json:"user_agent,omitempty"`
	IPAddress         string     `json:"ip_address,omitempty"`
	RevokedAt         *time.Time `json:"revoked_at,omitempty"`
	ExpiresAt         time.Time  `json:"expires_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type OAuthAccount struct {
	Provider        OAuthProvider
	Subject         string
	Email           string
	Name            string
	AvatarURL       string
	EmailVerified   bool
}

type OAuthProviderConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type OAuthConfig struct {
	Google OAuthProviderConfig
	GitHub OAuthProviderConfig
	Issuer  string
}
