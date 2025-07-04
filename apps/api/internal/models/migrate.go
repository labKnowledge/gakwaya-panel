package models

import (
	"database/sql"
)

// Migrate runs the initial database migrations
func Migrate(db *sql.DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS applications (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		image TEXT NOT NULL,
		env TEXT,
		status TEXT NOT NULL DEFAULT 'created',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		container_id TEXT
	);
	`
	_, err := db.Exec(query)
	return err
}
