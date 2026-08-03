package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type oauthTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	IDToken     string `json:"id_token"`
	Scope       string `json:"scope"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

type googleUserInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

type githubUserInfo struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Email     string `json:"email"`
	NodeID    string `json:"node_id"`
}

type githubEmailInfo struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
	Visible  bool   `json:"visibility"`
}

func buildOAuthURL(provider OAuthProvider, cfg OAuthProviderConfig, state string) string {
	params := url.Values{}
	params.Set("client_id", cfg.ClientID)
	params.Set("redirect_uri", cfg.RedirectURL)
	params.Set("state", state)
	params.Set("response_type", "code")

	switch provider {
	case OAuthProviderGoogle:
		params.Set("scope", "openid email profile")
		params.Set("access_type", "offline")
		params.Set("prompt", "consent")
		return "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()
	case OAuthProviderGitHub:
		params.Set("scope", "read:user user:email")
		return "https://github.com/login/oauth/authorize?" + params.Encode()
	default:
		return ""
	}
}

func exchangeGoogle(ctx context.Context, timeout time.Duration, cfg OAuthProviderConfig, code string) (*OAuthAccount, error) {
	tokenResponse, err := exchangeOAuthToken(ctx, timeout, "https://oauth2.googleapis.com/token", cfg, code)
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)

	client := &http.Client{Timeout: timeout}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("google userinfo failed: %s", response.Status)
	}

	var profile googleUserInfo
	if err := json.NewDecoder(response.Body).Decode(&profile); err != nil {
		return nil, err
	}

	return &OAuthAccount{
		Provider:      OAuthProviderGoogle,
		Subject:       profile.Sub,
		Email:         profile.Email,
		Name:          profile.Name,
		AvatarURL:     profile.Picture,
		EmailVerified: profile.EmailVerified,
	}, nil
}

func exchangeGitHub(ctx context.Context, timeout time.Duration, cfg OAuthProviderConfig, code string) (*OAuthAccount, error) {
	tokenResponse, err := exchangeOAuthToken(ctx, timeout, "https://github.com/login/oauth/access_token", cfg, code)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: timeout}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("github userinfo failed: %s", response.Status)
	}

	var profile githubUserInfo
	if err := json.NewDecoder(response.Body).Decode(&profile); err != nil {
		return nil, err
	}

	email := strings.TrimSpace(profile.Email)
	emailVerified := false
	if email == "" {
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user/emails", nil)
		if err != nil {
			return nil, err
		}
		request.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)
		request.Header.Set("Accept", "application/vnd.github+json")
		request.Header.Set("X-GitHub-Api-Version", "2022-11-28")

		response, err := client.Do(request)
		if err != nil {
			return nil, err
		}
		defer response.Body.Close()

		if response.StatusCode >= 400 {
			return nil, fmt.Errorf("github emails failed: %s", response.Status)
		}

		var emails []githubEmailInfo
		if err := json.NewDecoder(response.Body).Decode(&emails); err != nil {
			return nil, err
		}
		for _, candidate := range emails {
			if candidate.Primary {
				email = candidate.Email
				emailVerified = candidate.Verified
				break
			}
		}
	} else {
		emailVerified = true
	}

	return &OAuthAccount{
		Provider:      OAuthProviderGitHub,
		Subject:       strconv.FormatInt(profile.ID, 10),
		Email:         email,
		Name:          chooseNonEmpty(profile.Name, profile.Login),
		AvatarURL:     profile.AvatarURL,
		EmailVerified: emailVerified,
	}, nil
}

func exchangeOAuthToken(ctx context.Context, timeout time.Duration, tokenURL string, cfg OAuthProviderConfig, code string) (*oauthTokenResponse, error) {
	form := url.Values{}
	form.Set("client_id", cfg.ClientID)
	form.Set("client_secret", cfg.ClientSecret)
	form.Set("redirect_uri", cfg.RedirectURL)
	form.Set("code", code)
	form.Set("grant_type", "authorization_code")

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: timeout}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("oauth token exchange failed: %s", response.Status)
	}

	var tokenResponse oauthTokenResponse
	if err := json.Unmarshal(body, &tokenResponse); err != nil {
		return nil, err
	}

	if tokenResponse.Error != "" {
		if tokenResponse.ErrorDesc != "" {
			return nil, fmt.Errorf("oauth token exchange failed: %s", tokenResponse.ErrorDesc)
		}
		return nil, fmt.Errorf("oauth token exchange failed: %s", tokenResponse.Error)
	}

	if tokenResponse.AccessToken == "" {
		return nil, ErrInvalidToken
	}

	return &tokenResponse, nil
}
