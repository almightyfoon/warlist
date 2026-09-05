// Package releases feeds the site's news section from the project's GitHub
// release log, rather than a hand-authored blog table — there was never any
// way to write blog posts short of a manual DB insert, and releases are
// already the changelog maintainers keep up to date.
package releases

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

const (
	releasesURL = "https://api.github.com/repos/almightyfoon/warlist/releases?per_page=20"
	cacheTTL    = 10 * time.Minute
)

// Post mirrors the shape the frontend's news section renders.
type Post struct {
	PostType string `json:"post_type"`
	Date     string `json:"date_posted"`
	Title    string `json:"title"`
	Text     string `json:"post_text"`
}

type ghRelease struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	Draft       bool   `json:"draft"`
	PublishedAt string `json:"published_at"`
}

var (
	cacheMu  sync.Mutex
	cached   []Post
	cachedAt time.Time
)

// GetPosts returns the repo's published releases as news posts, newest
// first (GitHub's release list is already ordered that way). Results are
// cached for cacheTTL to stay well under GitHub's unauthenticated rate
// limit; a failed refresh falls back to the last good cache rather than
// erroring the whole page out.
func GetPosts(ctx context.Context) ([]Post, error) {
	cacheMu.Lock()
	if !cachedAt.IsZero() && time.Since(cachedAt) < cacheTTL {
		posts := cached
		cacheMu.Unlock()
		return posts, nil
	}
	cacheMu.Unlock()

	posts, err := fetchPosts(ctx)
	if err != nil {
		cacheMu.Lock()
		defer cacheMu.Unlock()
		if cached != nil {
			return cached, nil
		}
		return nil, err
	}

	cacheMu.Lock()
	cached = posts
	cachedAt = time.Now()
	cacheMu.Unlock()
	return posts, nil
}

func fetchPosts(ctx context.Context) ([]Post, error) {
	// Bound the outbound call independently — r.Context() is only cancelled
	// on client disconnect, not on the server's WriteTimeout.
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, releasesURL, nil)
	if err != nil {
		return nil, fmt.Errorf("building releases request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "warlist-backend")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("releases request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("releases request returned status %d", resp.StatusCode)
	}

	var ghReleases []ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&ghReleases); err != nil {
		return nil, fmt.Errorf("decoding releases response: %w", err)
	}

	posts := make([]Post, 0, len(ghReleases))
	for _, r := range ghReleases {
		if r.Draft {
			continue
		}
		title := r.Name
		if title == "" {
			title = r.TagName
		}
		posts = append(posts, Post{
			PostType: "1",
			Date:     formatDate(r.PublishedAt),
			Title:    title,
			Text:     r.Body,
		})
	}
	return posts, nil
}

func formatDate(published string) string {
	t, err := time.Parse(time.RFC3339, published)
	if err != nil {
		return published
	}
	return t.Format("January 2, 2006")
}
