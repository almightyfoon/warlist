package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"warlist/backend/internal/auth"
	"warlist/backend/internal/db"
)

type Handler struct {
	db       *db.DB
	clientID string
}

func New(database *db.DB, googleClientID string) *Handler {
	return &Handler{db: database, clientID: googleClientID}
}

// --- Auth helpers ---

func (h *Handler) resolveUID(ctx context.Context, r *http.Request) (int, error) {
	loginType := coalesce(r.FormValue("logintype"), r.FormValue("type"))
	token := coalesce(r.FormValue("token"), r.FormValue("id"), r.FormValue("arg"))

	if loginType != "g" || token == "" {
		return 0, nil
	}

	info, err := auth.VerifyGoogleToken(ctx, token, h.clientID)
	if err != nil {
		return 0, err
	}

	uid, err := h.db.GetOrCreateUser(ctx, info.Sub, info.Email, info.Name, info.Picture)
	if err != nil {
		return 0, err
	}
	return uid, nil
}

func coalesce(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encoding response", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	http.Error(w, msg, status)
}

// --- Handlers ---

// POST /x — load saved lists for authenticated user
func (h *Handler) LoadLists(w http.ResponseWriter, r *http.Request) {
	uid, err := h.resolveUID(r.Context(), r)
	if err != nil || uid == 0 {
		slog.Warn("LoadLists auth failed", "err", err)
		writeError(w, http.StatusUnauthorized, "Bad user login id")
		return
	}

	lists, err := h.db.GetSavedLists(r.Context(), uid)
	if err != nil {
		slog.Error("GetSavedLists", "err", err)
		writeError(w, http.StatusInternalServerError, "DB error")
		return
	}
	folders, err := h.db.GetFolders(r.Context(), uid)
	if err != nil {
		slog.Error("GetFolders", "err", err)
		writeError(w, http.StatusInternalServerError, "DB error")
		return
	}

	if lists == nil {
		lists = []db.SavedList{}
	}
	if folders == nil {
		folders = []db.Folder{}
	}

	writeJSON(w, map[string]any{"lists": lists, "folders": folders})
}

// POST /y — save a list slot
func (h *Handler) SaveList(w http.ResponseWriter, r *http.Request) {
	uid, err := h.resolveUID(r.Context(), r)
	if err != nil || uid == 0 {
		slog.Warn("SaveList auth failed", "err", err)
		http.Error(w, "Bad user login id", http.StatusUnauthorized)
		return
	}

	index, err := strconv.Atoi(r.FormValue("index"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid index")
		return
	}
	desc := r.FormValue("desc")
	listdata := r.FormValue("listdata")

	if err := h.db.SaveList(r.Context(), uid, index, desc, listdata); err != nil {
		slog.Error("SaveList", "err", err)
		writeError(w, http.StatusInternalServerError, "DB error")
		return
	}
	w.Write([]byte("OK"))
}

// POST /dl — delete a list slot
func (h *Handler) DeleteList(w http.ResponseWriter, r *http.Request) {
	uid, err := h.resolveUID(r.Context(), r)
	if err != nil || uid == 0 {
		writeError(w, http.StatusUnauthorized, "Bad user login id")
		return
	}

	index, err := strconv.Atoi(r.FormValue("index"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid index")
		return
	}

	if err := h.db.DeleteList(r.Context(), uid, index); err != nil {
		slog.Error("DeleteList", "err", err)
		writeError(w, http.StatusInternalServerError, "DB error")
		return
	}
	w.Write([]byte("OK"))
}

// POST /newfolder — create a folder
func (h *Handler) NewFolder(w http.ResponseWriter, r *http.Request) {
	uid, err := h.resolveUID(r.Context(), r)
	if err != nil || uid == 0 {
		writeError(w, http.StatusUnauthorized, "Bad user login id")
		return
	}

	name := r.FormValue("name")
	id, err := h.db.CreateFolder(r.Context(), uid, name)
	if err != nil {
		slog.Error("CreateFolder", "err", err)
		writeError(w, http.StatusInternalServerError, "DB error")
		return
	}
	w.Write([]byte(strconv.Itoa(id)))
}

// GET /blog
func (h *Handler) GetBlog(w http.ResponseWriter, r *http.Request) {
	posts, err := h.db.GetBlogPosts(r.Context())
	if err != nil {
		slog.Error("GetBlogPosts", "err", err)
		writeError(w, http.StatusInternalServerError, "DB error")
		return
	}
	if posts == nil {
		posts = []db.BlogPost{}
	}
	writeJSON(w, posts)
}

