package dockerutil

import (
	"context"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

// NewClient returns a Docker client
func NewClient() (*client.Client, error) {
	return client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
}

// PingDocker pings the Docker daemon to check connectivity
func PingDocker(cli *client.Client) (types.Ping, error) {
	return cli.Ping(context.Background())
}
