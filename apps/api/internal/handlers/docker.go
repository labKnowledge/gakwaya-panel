package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/gakwaya-panel/api/internal/dockerutil"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// ListDockerContainers returns a list of Docker containers
func ListDockerContainers() gin.HandlerFunc {
	return func(c *gin.Context) {
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()

		containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{All: true})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list containers"})
			return
		}

		result := []gin.H{}
		for _, ctr := range containers {
			result = append(result, gin.H{
				"id":     ctr.ID,
				"image":  ctr.Image,
				"names":  ctr.Names,
				"status": ctr.Status,
			})
		}
		c.JSON(http.StatusOK, result)
	}
}

type RunContainerRequest struct {
	Image         string            `json:"image" binding:"required"`
	Name          string            `json:"name"`
	Env           map[string]string `json:"env"`
	ApplicationID int64             `json:"application_id"`
}

type RunContainerResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// RunDockerContainer starts a new Docker container
func RunDockerContainer(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RunContainerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()

		envs := []string{}
		for k, v := range req.Env {
			envs = append(envs, k+"="+v)
		}

		resp, err := cli.ContainerCreate(
			c,
			&container.Config{
				Image: req.Image,
				Env:   envs,
			},
			nil, nil, nil, req.Name,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create container: " + err.Error()})
			return
		}

		if err := cli.ContainerStart(c, resp.ID, types.ContainerStartOptions{}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start container: " + err.Error()})
			return
		}

		// If ApplicationID is provided, update the application record with the container ID
		if req.ApplicationID > 0 && db != nil {
			_, err := db.Exec("UPDATE applications SET container_id = ? WHERE id = ?", resp.ID, req.ApplicationID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application with container ID"})
				return
			}
		}

		c.JSON(http.StatusCreated, RunContainerResponse{
			ID:     resp.ID,
			Status: "started",
		})
	}
}

// StopDockerContainer stops a running container by ID
func StopDockerContainer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		if err := cli.ContainerStop(c, id, container.StopOptions{}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop container: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"stopped": true, "id": id})
	}
}

// RemoveDockerContainer removes a container by ID
func RemoveDockerContainer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		if err := cli.ContainerRemove(c, id, types.ContainerRemoveOptions{Force: true}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove container: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"removed": true, "id": id})
	}
}

// GetDockerContainerLogs fetches logs for a given container by ID
func GetDockerContainerLogs() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		reader, err := cli.ContainerLogs(c, id, types.ContainerLogsOptions{ShowStdout: true, ShowStderr: true, Tail: "100"})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs: " + err.Error()})
			return
		}
		defer reader.Close()
		buf := make([]byte, 4096)
		logs := ""
		for {
			n, err := reader.Read(buf)
			if n > 0 {
				logs += string(buf[:n])
			}
			if err != nil {
				break
			}
		}
		c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(logs))
	}
}

// DockerSystemPrune removes unused data (like docker system prune)
func DockerSystemPrune() gin.HandlerFunc {
	return func(c *gin.Context) {
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		f := filters.NewArgs()
		pruneReport, err := cli.ContainersPrune(c, f)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prune containers: " + err.Error()})
			return
		}
		volPrune, _ := cli.VolumesPrune(c, f)
		imgPrune, _ := cli.ImagesPrune(c, f)
		netPrune, _ := cli.NetworksPrune(c, f)
		c.JSON(http.StatusOK, gin.H{
			"containers": pruneReport,
			"volumes":    volPrune,
			"images":     imgPrune,
			"networks":   netPrune,
		})
	}
}

// DockerSystemPruneAll removes all unused images (like docker system prune -a)
func DockerSystemPruneAll() gin.HandlerFunc {
	return func(c *gin.Context) {
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		f := filters.NewArgs()
		f.Add("dangling", "false")
		imgPrune, err := cli.ImagesPrune(c, f)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prune images: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, imgPrune)
	}
}

// DockerSystemInfo returns Docker system info (disk usage, etc)
func DockerSystemInfo() gin.HandlerFunc {
	return func(c *gin.Context) {
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		info, err := cli.Info(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get Docker info: " + err.Error()})
			return
		}
		du, _ := cli.DiskUsage(context.Background(), types.DiskUsageOptions{})
		c.JSON(http.StatusOK, gin.H{
			"info":       info,
			"disk_usage": du,
		})
	}
}

// RestartDockerContainer restarts a container by ID
func RestartDockerContainer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		if err := cli.ContainerRestart(c, id, container.StopOptions{}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restart container: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"restarted": true, "id": id})
	}
}

// InspectDockerContainer returns detailed info about a container
func InspectDockerContainer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		info, err := cli.ContainerInspect(c, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to inspect container: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, info)
	}
}

// StatsDockerContainer returns live stats for a container
func StatsDockerContainer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		stats, err := cli.ContainerStatsOneShot(c, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats: " + err.Error()})
			return
		}
		defer stats.Body.Close()
		buf := make([]byte, 4096)
		all := []byte{}
		for {
			n, err := stats.Body.Read(buf)
			if n > 0 {
				all = append(all, buf[:n]...)
			}
			if err != nil {
				break
			}
		}
		c.Data(http.StatusOK, "application/json", all)
	}
}

type ExecContainerRequest struct {
	Cmd []string `json:"cmd" binding:"required"`
}

// ExecDockerContainer runs a command in a container and returns the output
func ExecDockerContainer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		var req ExecContainerRequest
		if err := c.ShouldBindJSON(&req); err != nil || len(req.Cmd) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid cmd array"})
			return
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		execConfig := types.ExecConfig{
			Cmd:          req.Cmd,
			AttachStdout: true,
			AttachStderr: true,
		}
		execIDResp, err := cli.ContainerExecCreate(c, id, execConfig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exec: " + err.Error()})
			return
		}
		hijack, err := cli.ContainerExecAttach(c, execIDResp.ID, types.ExecStartCheck{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to attach exec: " + err.Error()})
			return
		}
		defer hijack.Close()
		buf := make([]byte, 4096)
		output := ""
		for {
			n, err := hijack.Reader.Read(buf)
			if n > 0 {
				output += string(buf[:n])
			}
			if err != nil {
				break
			}
		}
		c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(output))
	}
}

// TerminalDockerContainer provides a full interactive shell via WebSocket
func TerminalDockerContainer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing container ID"})
			return
		}
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		}
		ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}
		defer ws.Close()

		cli, err := dockerutil.NewClient()
		if err != nil {
			ws.WriteMessage(websocket.TextMessage, []byte("Docker client error"))
			return
		}
		defer cli.Close()

		execConfig := types.ExecConfig{
			Cmd:          []string{"/bin/sh"},
			AttachStdin:  true,
			AttachStdout: true,
			AttachStderr: true,
			Tty:          true,
		}
		execIDResp, err := cli.ContainerExecCreate(c, id, execConfig)
		if err != nil {
			ws.WriteMessage(websocket.TextMessage, []byte("Failed to create exec: "+err.Error()))
			return
		}
		hijack, err := cli.ContainerExecAttach(c, execIDResp.ID, types.ExecStartCheck{Tty: true})
		if err != nil {
			ws.WriteMessage(websocket.TextMessage, []byte("Failed to attach exec: "+err.Error()))
			return
		}
		defer hijack.Close()

		// Read from WebSocket and write to Docker
		go func() {
			for {
				_, msg, err := ws.ReadMessage()
				if err != nil {
					_ = hijack.CloseWrite()
					return
				}
				_, _ = hijack.Conn.Write(msg)
			}
		}()

		buf := make([]byte, 4096)
		for {
			n, err := hijack.Reader.Read(buf)
			if n > 0 {
				ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := ws.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					return
				}
			}
			if err != nil {
				return
			}
		}
	}
}

// GetExposedPorts returns all exposed ports for a given image or container
// Route: GET /api/docker/exposed-ports?image=nginx:latest or ?container_id=abc123
func GetExposedPorts() gin.HandlerFunc {
	return func(c *gin.Context) {
		image := c.Query("image")
		containerID := c.Query("container_id")
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()

		var ports []string
		if containerID != "" {
			info, err := cli.ContainerInspect(c, containerID)
			if err == nil {
				for port := range info.Config.ExposedPorts {
					ports = append(ports, string(port))
				}
			}
		} else if image != "" {
			info, _, err := cli.ImageInspectWithRaw(c, image)
			if err == nil {
				for port := range info.Config.ExposedPorts {
					ports = append(ports, string(port))
				}
			}
		}
		c.JSON(http.StatusOK, gin.H{"ports": ports})
	}
}
