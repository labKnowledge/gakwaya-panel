package models

import "time"

// User represents a user in the system
// PasswordHash should store a bcrypt or similar hash
// ID is auto-incremented by SQLite

type User struct {
	ID           int64     `db:"id" json:"id"`
	Username     string    `db:"username" json:"username"`
	PasswordHash string    `db:"password_hash" json:"-"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}
