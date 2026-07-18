package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"
)

type TokenInfo struct {
	Sub     string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Aud     string `json:"aud"`
	Exp     string `json:"exp"`
}

// Simple cache to avoid hammering the tokeninfo endpoint on every request.
type cacheEntry struct {
	info    *TokenInfo
	expires time.Time
}

var (
	cacheMu sync.Mutex
	cache   = map[string]cacheEntry{}
)

// VerifyGoogleToken validates a Google ID token via the tokeninfo endpoint
// and returns the verified claims. Results are cached for 5 minutes.
func VerifyGoogleToken(ctx context.Context, token, expectedAudience string) (*TokenInfo, error) {
	cacheMu.Lock()
	if entry, ok := cache[token]; ok && time.Now().Before(entry.expires) {
		cacheMu.Unlock()
		return entry.info, nil
	}
	cacheMu.Unlock()

	// Bound the outbound call independently — r.Context() is only cancelled on
	// client disconnect, not on the server's WriteTimeout.
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	reqURL := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(token)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("building tokeninfo request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tokeninfo request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid token (status %d)", resp.StatusCode)
	}

	var info TokenInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("parsing tokeninfo: %w", err)
	}

	if info.Aud != expectedAudience {
		return nil, fmt.Errorf("token audience mismatch: got %q", info.Aud)
	}

	cacheMu.Lock()
	cacheExpiry := time.Now().Add(5 * time.Minute)
	if exp, err := strconv.ParseInt(info.Exp, 10, 64); err == nil {
		if tokenExp := time.Unix(exp, 0); tokenExp.Before(cacheExpiry) {
			cacheExpiry = tokenExp
		}
	}
	cache[token] = cacheEntry{info: &info, expires: cacheExpiry}
	// Evict stale entries occasionally
	if len(cache) > 1000 {
		now := time.Now()
		for k, v := range cache {
			if now.After(v.expires) {
				delete(cache, k)
			}
		}
	}
	cacheMu.Unlock()

	return &info, nil
}
