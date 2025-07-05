package models

import "time"

// Application represents a deployed application/service
// Env is a JSON-encoded string of environment variables

type Application struct {
	ID             int64             `db:"id" json:"id"`
	Name           string            `db:"name" json:"name"`
	Image          string            `db:"image" json:"image"`
	Env            string            `db:"env" json:"env"`
	Status         string            `db:"status" json:"status"`
	CreatedAt      time.Time         `db:"created_at" json:"created_at"`
	ContainerID    string            `db:"container_id" json:"container_id"`
	Domain         string            `db:"domain" json:"domain"`
	Port           int               `db:"port" json:"port"`
	GitURL         string            `db:"git_url" json:"git_url,omitempty"`                 // Optional: Git repository URL
	Branch         string            `db:"branch" json:"branch,omitempty"`                   // Optional: Git branch name
	DockerfilePath string            `db:"dockerfile_path" json:"dockerfile_path,omitempty"` // Optional: Path to Dockerfile
	Volumes        []string          `db:"volumes" json:"volumes,omitempty"`                 // Optional: Volumes (as string array)
	BuildArgs      map[string]string `db:"build_args" json:"build_args,omitempty"`           // Optional: Build arguments (as map)
}
