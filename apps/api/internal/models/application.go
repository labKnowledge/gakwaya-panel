package models

import "time"

// Application represents a deployed application/service
// Env is a JSON-encoded string of environment variables

type Application struct {
	ID          int64     `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Image       string    `db:"image" json:"image"`
	Env         string    `db:"env" json:"env"`
	Status      string    `db:"status" json:"status"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	ContainerID string    `db:"container_id" json:"container_id"`
	Domain      string    `db:"domain" json:"domain"`
	Port        int       `db:"port" json:"port"`
}
