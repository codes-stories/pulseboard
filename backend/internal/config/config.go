package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port string
	DBURL string
	JWTSecret string
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port: os.Getenv("PORT"),
		DBURL: os.Getenv("DATABASE_URL"),
		JWTSecret: os.Getenv("JWT_SECRET"),
	}
}