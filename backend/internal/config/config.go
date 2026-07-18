package config

import (
	"fmt"
	"os"
)

type Config struct {
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	GoogleClientID string
	AllowedOrigin  string
	Port           string
	StaticDir      string
	AppVersion     string
}

func Load() (*Config, error) {
	cfg := &Config{
		DBHost:         getenv("DB_HOST", "db"),
		DBPort:         getenv("DB_PORT", "3306"),
		DBUser:         getenv("DB_USER", "warlist"),
		DBPassword:     os.Getenv("DB_PASSWORD"),
		DBName:         getenv("DB_NAME", "warlist"),
		GoogleClientID: os.Getenv("GOOGLE_CLIENT_ID"),
		AllowedOrigin:  getenv("ALLOWED_ORIGIN", "https://www.warlist.online"),
		Port:           getenv("PORT", "8080"),
		StaticDir:      getenv("STATIC_DIR", "./static"),
		AppVersion:     getenv("APP_VERSION", "dev"),
	}

	if cfg.GoogleClientID == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_ID is required")
	}
	if cfg.DBPassword == "" {
		return nil, fmt.Errorf("DB_PASSWORD is required")
	}

	return cfg, nil
}

func (c *Config) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
