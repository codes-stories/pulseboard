package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	MaxIPAttempts    = 20
	MaxLoginAttempts = 5
	MaxDevices       = 3

	JWTSecret = "CHANGE_ME_TO_A_RANDOM_64_BYTE_SECRET"
)

var (
	ipAttempts = make(map[string]int)
	ipMutex    sync.Mutex

	failedLogins = make(map[string]int)
	loginMutex   sync.Mutex

	users = map[string]*User{}
)

type User struct {
	ID           string
	Email        string
	PasswordHash string
	Devices      map[string]bool
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	DeviceID string `json:"device_id"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func main() {

	r := chi.NewRouter()

	r.Use(RequestValidationMiddleware)
	r.Use(IPRateLimitMiddleware)

	r.Post("/auth/register", RegisterHandler)
	r.Post("/auth/login", LoginHandler)

	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware)

		r.Get("/profile", ProfileHandler)
	})

	log.Println("Listening :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

func RequestValidationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		if r.ContentLength > 1024*1024 {
			http.Error(
				w,
				"request too large",
				http.StatusRequestEntityTooLarge,
			)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func IPRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}

		ipMutex.Lock()
		ipAttempts[ip]++
		count := ipAttempts[ip]
		ipMutex.Unlock()

		if count > MaxIPAttempts {
			http.Error(
				w,
				"too many requests",
				http.StatusTooManyRequests,
			)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {

	var req RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(
			w,
			"invalid request",
			http.StatusBadRequest,
		)
		return
	}

	if _, exists := users[req.Email]; exists {
		http.Error(
			w,
			"user already exists",
			http.StatusConflict,
		)
		return
	}

	hash, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password),
		bcrypt.DefaultCost,
	)

	if err != nil {
		http.Error(
			w,
			"server error",
			http.StatusInternalServerError,
		)
		return
	}

	users[req.Email] = &User{
		ID:           req.Email,
		Email:        req.Email,
		PasswordHash: string(hash),
		Devices:      map[string]bool{},
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"success":true}`))
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {

	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(
			w,
			"invalid request",
			http.StatusBadRequest,
		)
		return
	}

	loginMutex.Lock()
	attempts := failedLogins[req.Email]
	loginMutex.Unlock()

	if attempts >= MaxLoginAttempts {
		http.Error(
			w,
			"account locked",
			http.StatusTooManyRequests,
		)
		return
	}

	user, exists := users[req.Email]
	if !exists {
		recordFailedLogin(req.Email)

		http.Error(
			w,
			"invalid credentials",
			http.StatusUnauthorized,
		)
		return
	}

	err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(req.Password),
	)

	if err != nil {
		recordFailedLogin(req.Email)

		http.Error(
			w,
			"invalid credentials",
			http.StatusUnauthorized,
		)
		return
	}

	if !user.Devices[req.DeviceID] {

		if len(user.Devices) >= MaxDevices {
			http.Error(
				w,
				"device limit exceeded",
				http.StatusForbidden,
			)
			return
		}

		user.Devices[req.DeviceID] = true
	}

	resetFailedLogins(req.Email)

	token, err := GenerateJWT(user.ID)
	if err != nil {
		http.Error(
			w,
			"token generation failed",
			http.StatusInternalServerError,
		)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
	})

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"success":true}`))
}

func AuthMiddleware(next http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		cookie, err := r.Cookie("session")
		if err != nil {
			http.Redirect(
				w,
				r,
				"/auth/login",
				http.StatusFound,
			)
			return
		}

		claims, err := ValidateJWT(cookie.Value)
		if err != nil {
			http.Redirect(
				w,
				r,
				"/auth/login",
				http.StatusFound,
			)
			return
		}

		ctx := context.WithValue(
			r.Context(),
			"user_id",
			claims.UserID,
		)

		next.ServeHTTP(
			w,
			r.WithContext(ctx),
		)
	})
}

func ProfileHandler(w http.ResponseWriter, r *http.Request) {

	userID := r.Context().Value("user_id")

	json.NewEncoder(w).Encode(map[string]any{
		"user_id": userID,
	})
}

func GenerateJWT(userID string) (string, error) {

	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(
				time.Now().Add(24 * time.Hour),
			),
			IssuedAt: jwt.NewNumericDate(
				time.Now(),
			),
		},
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	return token.SignedString([]byte(JWTSecret))
}

func ValidateJWT(tokenString string) (*Claims, error) {

	token, err := jwt.ParseWithClaims(
		tokenString,
		&Claims{},
		func(token *jwt.Token) (interface{}, error) {

			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("invalid signing method")
			}

			return []byte(JWTSecret), nil
		},
	)

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func recordFailedLogin(email string) {
	loginMutex.Lock()
	defer loginMutex.Unlock()

	failedLogins[email]++
}

func resetFailedLogins(email string) {
	loginMutex.Lock()
	defer loginMutex.Unlock()

	delete(failedLogins, email)
}