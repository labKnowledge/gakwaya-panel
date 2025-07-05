package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"context"

	"fmt"
	"io"
	"os"
	"path/filepath"

	"archive/tar"
	"bytes"
	"io/ioutil"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/strslice"
	"github.com/docker/docker/client"
	"github.com/gakwaya-panel/api/internal/dockerutil"
	"github.com/gakwaya-panel/api/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)

type ApplicationRequest struct {
	Name           string            `json:"name" binding:"required,min=2,max=64"`
	Image          string            `json:"image" binding:"required"`
	Env            map[string]string `json:"env"`
	Status         string            `json:"status"`
	Domain         string            `json:"domain"`
	Port           int               `json:"port"`
	GitURL         string            `json:"git_url"`
	Branch         string            `json:"branch"`
	DockerfilePath string            `json:"dockerfile_path"`
	Volumes        []string          `json:"volumes"`
	BuildArgs      map[string]string `json:"build_args"`
}

// DeployFromGitRequest is the request body for git-based deployment
type DeployFromGitRequest struct {
	GitURL         string            `json:"git_url" binding:"required"`
	Branch         string            `json:"branch"`
	Env            map[string]string `json:"env"`
	Volumes        []string          `json:"volumes"`
	BuildArgs      map[string]string `json:"build_args"`
	DockerfilePath string            `json:"dockerfile_path"`
}

// CreateApplication creates a new application
func CreateApplication(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ApplicationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		envJSON, _ := json.Marshal(req.Env)
		status := req.Status
		if status == "" {
			status = "created"
		}
		volumesJSON, _ := json.Marshal(req.Volumes)
		buildArgsJSON, _ := json.Marshal(req.BuildArgs)
		result, err := db.Exec(
			"INSERT INTO applications (name, image, env, status, created_at, domain, port, git_url, branch, dockerfile_path, volumes, build_args) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			req.Name, req.Image, string(envJSON), status, time.Now(), req.Domain, req.Port, req.GitURL, req.Branch, req.DockerfilePath, string(volumesJSON), string(buildArgsJSON),
		)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Name already exists or DB error"})
			return
		}
		id, _ := result.LastInsertId()
		c.JSON(http.StatusCreated, gin.H{"id": id})
	}
}

// ListApplications returns all applications
func ListApplications(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query("SELECT id, name, image, env, status, created_at, domain, port, git_url, branch, dockerfile_path, volumes, build_args FROM applications ORDER BY id DESC")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		defer rows.Close()
		apps := []models.Application{}
		for rows.Next() {
			var app models.Application
			var volumesStr, buildArgsStr string
			if err := rows.Scan(&app.ID, &app.Name, &app.Image, &app.Env, &app.Status, &app.CreatedAt, &app.Domain, &app.Port, &app.GitURL, &app.Branch, &app.DockerfilePath, &volumesStr, &buildArgsStr); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
				return
			}
			if volumesStr != "" {
				_ = json.Unmarshal([]byte(volumesStr), &app.Volumes)
			}
			if buildArgsStr != "" {
				_ = json.Unmarshal([]byte(buildArgsStr), &app.BuildArgs)
			}
			apps = append(apps, app)
		}
		c.JSON(http.StatusOK, apps)
	}
}

// GetApplication returns a single application by ID
func GetApplication(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}
		var app models.Application
		var volumesStr, buildArgsStr string
		err = db.QueryRow("SELECT id, name, image, env, status, created_at, domain, port, git_url, branch, dockerfile_path, volumes, build_args FROM applications WHERE id = ?", id).Scan(
			&app.ID, &app.Name, &app.Image, &app.Env, &app.Status, &app.CreatedAt, &app.Domain, &app.Port, &app.GitURL, &app.Branch, &app.DockerfilePath, &volumesStr, &buildArgsStr,
		)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		if volumesStr != "" {
			_ = json.Unmarshal([]byte(volumesStr), &app.Volumes)
		}
		if buildArgsStr != "" {
			_ = json.Unmarshal([]byte(buildArgsStr), &app.BuildArgs)
		}
		c.JSON(http.StatusOK, app)
	}
}

// UpdateApplication updates an application by ID
func UpdateApplication(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}
		var req ApplicationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		envJSON, _ := json.Marshal(req.Env)
		volumesJSON, _ := json.Marshal(req.Volumes)
		buildArgsJSON, _ := json.Marshal(req.BuildArgs)
		_, err = db.Exec(
			"UPDATE applications SET name = ?, image = ?, env = ?, status = ?, domain = ?, port = ?, git_url = ?, branch = ?, dockerfile_path = ?, volumes = ?, build_args = ? WHERE id = ?",
			req.Name, req.Image, string(envJSON), req.Status, req.Domain, req.Port, req.GitURL, req.Branch, req.DockerfilePath, string(volumesJSON), string(buildArgsJSON), id,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"updated": true})
	}
}

// DeleteApplication deletes an application by ID
func DeleteApplication(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}
		_, err = db.Exec("DELETE FROM applications WHERE id = ?", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"deleted": true})
	}
}

// DeployApplication launches a Docker container for the given application ID
func DeployApplication(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}
		var app models.Application
		err = db.QueryRow("SELECT id, name, image, env FROM applications WHERE id = ?", id).Scan(
			&app.ID, &app.Name, &app.Image, &app.Env,
		)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Application not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		// Parse env JSON
		var envMap map[string]string
		if app.Env != "" {
			if err := json.Unmarshal([]byte(app.Env), &envMap); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid env format"})
				return
			}
		}
		envs := []string{}
		for k, v := range envMap {
			envs = append(envs, k+"="+v)
		}
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		resp, err := cli.ContainerCreate(
			context.Background(),
			&container.Config{
				Image: app.Image,
				Env:   envs,
			},
			nil, nil, nil, app.Name,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create container: " + err.Error()})
			return
		}
		if err := cli.ContainerStart(context.Background(), resp.ID, types.ContainerStartOptions{}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start container: " + err.Error()})
			return
		}
		_, err = db.Exec("UPDATE applications SET container_id = ? WHERE id = ?", resp.ID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application with container ID"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"container_id": resp.ID, "status": "started"})
	}
}

// DeployFromGit builds and runs a container from a Git repo
func DeployFromGit(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}
		var req DeployFromGitRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// 1. Clone repo
		tmpDir, err := os.MkdirTemp("", fmt.Sprintf("gakwayapanel-app-%d-*", id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp dir"})
			return
		}
		defer os.RemoveAll(tmpDir)
		cloneOpts := &git.CloneOptions{
			URL: req.GitURL,
		}
		if req.Branch != "" {
			cloneOpts.ReferenceName = plumbing.ReferenceName("refs/heads/" + req.Branch)
			cloneOpts.SingleBranch = true
		}
		_, err = git.PlainClone(tmpDir, false, cloneOpts)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clone repo: " + err.Error()})
			return
		}
		// 2. Build Docker image
		cli, err := dockerutil.NewClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker client error"})
			return
		}
		defer cli.Close()
		imageTag := fmt.Sprintf("gakwayapanel-app-%d:%d", id, time.Now().Unix())
		dockerfilePath := filepath.Join(tmpDir, "Dockerfile")
		dockerfile := "Dockerfile"
		if _, err := os.Stat(dockerfilePath); os.IsNotExist(err) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dockerfile not found in repo root"})
			return
		}
		buildCtx, err := tarDirectory(tmpDir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create build context: " + err.Error()})
			return
		}
		defer buildCtx.Close()
		buildArgs := map[string]*string{}
		for k, v := range req.BuildArgs {
			val := v
			buildArgs[k] = &val
		}
		// Set sensible defaults if not provided
		if _, ok := buildArgs["BUILDPLATFORM"]; !ok {
			val := "linux/amd64"
			buildArgs["BUILDPLATFORM"] = &val
		}
		if _, ok := buildArgs["TARGETPLATFORM"]; !ok {
			val := "linux/amd64"
			buildArgs["TARGETPLATFORM"] = &val
		}
		buildResp, err := cli.ImageBuild(
			c,
			buildCtx,
			types.ImageBuildOptions{
				Tags:       []string{imageTag},
				Dockerfile: dockerfile,
				Remove:     true,
				BuildArgs:  buildArgs,
			},
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build image: " + err.Error()})
			return
		}
		buildLog, _ := io.ReadAll(buildResp.Body)
		buildResp.Body.Close()
		if !imageExists(cli, imageTag) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker build failed", "build_log": string(buildLog)})
			return
		}
		// 3. Prepare env/volumes
		envs := []string{}
		if req.Env != nil {
			for k, v := range req.Env {
				envs = append(envs, k+"="+v)
			}
		} else {
			// fallback to stored env
			var app models.Application
			err = db.QueryRow("SELECT env FROM applications WHERE id = ?", id).Scan(&app.Env)
			if err == nil && app.Env != "" {
				var envMap map[string]string
				if err := json.Unmarshal([]byte(app.Env), &envMap); err == nil {
					for k, v := range envMap {
						envs = append(envs, k+"="+v)
					}
				}
			}
		}
		var mounts []mount.Mount
		for _, v := range req.Volumes {
			mounts = append(mounts, mount.Mount{
				Type:   mount.TypeBind,
				Source: v,
				Target: v,
			})
		}
		// 4. Run container
		resp, err := cli.ContainerCreate(
			c,
			&container.Config{
				Image: imageTag,
				Env:   envs,
				Cmd:   strslice.StrSlice{},
			},
			&container.HostConfig{
				Mounts: mounts,
			},
			nil, nil, fmt.Sprintf("gakwayapanel-app-%d", id),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create container: " + err.Error()})
			return
		}
		if err := cli.ContainerStart(c, resp.ID, types.ContainerStartOptions{}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start container: " + err.Error()})
			return
		}
		_, err = db.Exec("UPDATE applications SET image = ?, container_id = ? WHERE id = ?", imageTag, resp.ID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application with image/container ID"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"container_id": resp.ID, "image_tag": imageTag, "status": "started"})
	}
}

// tarDirectory tars the given directory and returns a ReadCloser for the tar stream
func tarDirectory(src string) (io.ReadCloser, error) {
	buf := new(bytes.Buffer)
	tarWriter := tar.NewWriter(buf)
	defer tarWriter.Close()

	err := filepath.Walk(src, func(file string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if file == src {
			return nil // skip root
		}
		relPath, err := filepath.Rel(src, file)
		if err != nil {
			return err
		}
		header, err := tar.FileInfoHeader(fi, "")
		if err != nil {
			return err
		}
		header.Name = relPath
		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}
		if fi.Mode().IsRegular() {
			f, err := os.Open(file)
			if err != nil {
				return err
			}
			defer f.Close()
			if _, err := io.Copy(tarWriter, f); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return ioutil.NopCloser(bytes.NewReader(buf.Bytes())), nil
}

func imageExists(cli *client.Client, tag string) bool {
	images, err := cli.ImageList(context.Background(), types.ImageListOptions{})
	if err != nil {
		return false
	}
	for _, img := range images {
		for _, t := range img.RepoTags {
			if t == tag {
				return true
			}
		}
	}
	return false
}
