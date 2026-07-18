package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type DB struct {
	pool *sql.DB
}

func Open(dsn string) (*DB, error) {
	pool, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening db: %w", err)
	}
	pool.SetMaxOpenConns(25)
	pool.SetMaxIdleConns(5)
	pool.SetConnMaxLifetime(5 * time.Minute)
	return &DB{pool: pool}, nil
}

func (d *DB) Ping(ctx context.Context) error {
	return d.pool.PingContext(ctx)
}

// --- Auth ---

type User struct {
	UID     int
	GID     string
	Email   string
	Name    string
	Picture string
}

func (d *DB) GetOrCreateUser(ctx context.Context, gid, email, name, picture string) (int, error) {
	// Atomic upsert: INSERT sets uid via auto-increment on first login;
	// ON DUPLICATE KEY UPDATE re-selects the existing row's uid via LAST_INSERT_ID().
	// Use res.LastInsertId() — not a separate SELECT — to stay on the same connection.
	res, err := d.pool.ExecContext(ctx,
		`INSERT INTO google_login (gid, email, name, pic) VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE uid = LAST_INSERT_ID(uid)`,
		gid, email, name, picture,
	)
	if err != nil {
		return 0, fmt.Errorf("upsert user: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("reading user id: %w", err)
	}
	return int(id), nil
}

// --- Lists ---

type SavedList struct {
	Offset      int    `json:"offset"`
	Description string `json:"description"`
	ListData    string `json:"listdata"`
	Folder      *int   `json:"folder"`
}

func (d *DB) GetSavedLists(ctx context.Context, uid int) ([]SavedList, error) {
	rows, err := d.pool.QueryContext(ctx,
		"SELECT offset_idx, description, listdata, folder FROM saved_lists WHERE uid = ? ORDER BY offset_idx ASC",
		uid,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lists []SavedList
	for rows.Next() {
		var l SavedList
		if err := rows.Scan(&l.Offset, &l.Description, &l.ListData, &l.Folder); err != nil {
			return nil, err
		}
		lists = append(lists, l)
	}
	return lists, rows.Err()
}

func (d *DB) SaveList(ctx context.Context, uid, offset int, desc, listdata string) error {
	_, err := d.pool.ExecContext(ctx,
		`INSERT INTO saved_lists (uid, offset_idx, description, listdata)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE description = VALUES(description), listdata = VALUES(listdata)`,
		uid, offset, desc, listdata,
	)
	return err
}

func (d *DB) DeleteList(ctx context.Context, uid, offset int) error {
	_, err := d.pool.ExecContext(ctx,
		"DELETE FROM saved_lists WHERE uid = ? AND offset_idx = ?", uid, offset)
	return err
}

// --- Folders ---

type Folder struct {
	UID     int    `json:"uid"`
	Name    string `json:"name"`
	Special int    `json:"special"`
}

func (d *DB) GetFolders(ctx context.Context, uid int) ([]Folder, error) {
	rows, err := d.pool.QueryContext(ctx,
		"SELECT uid, name, special FROM folders WHERE owner = ? ORDER BY uid ASC",
		uid,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []Folder
	for rows.Next() {
		var f Folder
		if err := rows.Scan(&f.UID, &f.Name, &f.Special); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, rows.Err()
}

func (d *DB) CreateFolder(ctx context.Context, uid int, name string) (int, error) {
	res, err := d.pool.ExecContext(ctx,
		"INSERT INTO folders (name, owner, parent, special) VALUES (?, ?, NULL, 0)",
		name, uid,
	)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	return int(id), nil
}

// --- Blog ---

type BlogPost struct {
	PostType string `json:"post_type"`
	Date     string `json:"date_posted"`
	Title    string `json:"title"`
	Text     string `json:"post_text"`
}

func (d *DB) GetBlogPosts(ctx context.Context) ([]BlogPost, error) {
	rows, err := d.pool.QueryContext(ctx,
		"SELECT post_type, DATE_FORMAT(posted, '%M %D %Y'), title, post_text FROM blog ORDER BY posted DESC",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []BlogPost
	for rows.Next() {
		var p BlogPost
		if err := rows.Scan(&p.PostType, &p.Date, &p.Title, &p.Text); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

