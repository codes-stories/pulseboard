package auth

type RegisterRequest struct {
	Name           string `json:"name"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	DeviceIdentity string `json:"device_identity,omitempty"`
}

type LoginRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	DeviceIdentity string `json:"device_identity,omitempty"`
}

type OAuthCallbackRequest struct {
	Code           string `json:"code"`
	State          string `json:"state"`
	DeviceIdentity string `json:"device_identity,omitempty"`
}

type AuthResponse struct {
	User         User   `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

type RefreshResponse struct {
	User         User   `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

type OAuthStartResponse struct {
	AuthorizationURL string `json:"authorization_url"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
