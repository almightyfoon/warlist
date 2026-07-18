package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"warlist/backend/internal/config"
	"warlist/backend/internal/db"
	"warlist/backend/internal/handlers"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("loading config", "err", err)
		os.Exit(1)
	}

	database, err := db.Open(cfg.DSN())
	if err != nil {
		slog.Error("opening database", "err", err)
		os.Exit(1)
	}

	// Wait for DB to be ready (for Docker startup ordering)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	for {
		if err := database.Ping(ctx); err == nil {
			break
		}
		slog.Info("waiting for database...")
		time.Sleep(2 * time.Second)
	}
	slog.Info("database ready")

	h := handlers.New(database, cfg.GoogleClientID)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware(cfg.AllowedOrigin))

	// API routes (matching original PHP endpoint names for frontend compatibility)
	r.Post("/x", h.LoadLists)
	r.Post("/y", h.SaveList)
	r.Post("/dl", h.DeleteList)
	r.Post("/newfolder", h.NewFolder)
	r.Get("/blog", h.GetBlog)

	// Static files — index.html gets template substitution; everything else is served as-is
	r.Get("/*", staticHandler(cfg))

	addr := ":" + cfg.Port
	slog.Info("starting server", "addr", addr)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
}

func corsMiddleware(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func staticHandler(cfg *config.Config) http.HandlerFunc {
	fileServer := http.FileServer(http.Dir(cfg.StaticDir))

	// Read index.html once and substitute placeholders
	indexHTML := loadIndex(cfg)

	return func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Serve index.html for root and SPA-style paths (no file extension)
		if path == "/" || path == "/index.html" || (!strings.Contains(path[1:], "/") && !strings.Contains(path, ".")) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(indexHTML)
			return
		}

		// Data files change without a filename hash — tell browsers not to cache them.
		if strings.HasPrefix(path, "/data/") {
			w.Header().Set("Cache-Control", "no-cache")
		}
		fileServer.ServeHTTP(w, r)
	}
}

func loadIndex(cfg *config.Config) []byte {
	data, err := os.ReadFile(cfg.StaticDir + "/index.html")
	if err != nil {
		slog.Error("reading index.html", "err", err)
		return []byte("<html><body>index.html not found</body></html>")
	}
	s := string(data)
	s = strings.ReplaceAll(s, "CC_VER", cfg.AppVersion)
	s = strings.ReplaceAll(s, "CC_GOOGLE_CLIENT_ID", cfg.GoogleClientID)
	return []byte(s)
}
