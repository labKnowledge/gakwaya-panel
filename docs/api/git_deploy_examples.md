# Application Deployment API Endpoints

This document describes the available endpoints for deploying applications, including standard and Git-based deployments, with example cURL commands.

---

## 1. Deploy Existing Application Image

**Endpoint:**
```
POST /api/applications/:id/deploy
```

**Description:**
Deploys an application using the image and environment variables stored in the application record.

**Example cURL:**
```bash
curl -X POST http://localhost:8080/api/applications/1/deploy \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response:**
```json
{
  "container_id": "e1b2c3d4f5...",
  "status": "started"
}
```

---

## 2. Deploy from Git Repository (Build & Run)

**Endpoint:**
```
POST /api/applications/:id/deploy-from-git
```

**Description:**
Clones a Git repository, builds a Docker image from the Dockerfile, and runs the container. Optionally accepts environment variables and volume mappings.

**Request Body Example:**
```json
{
  "git_url": "https://github.com/someuser/sample-node-app.git",
  "branch": "main",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "volumes": [
    "/host/path/data:/container/path/data"
  ]
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:8080/api/applications/1/deploy-from-git \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "git_url": "https://github.com/someuser/sample-node-app.git",
    "branch": "main",
    "env": {
      "NODE_ENV": "production",
      "PORT": "3000"
    },
    "volumes": [
      "/host/path/data:/container/path/data"
    ]
  }'
```

**Response:**
```json
{
  "container_id": "e1b2c3d4f5...",
  "image_tag": "gakwayapanel-app-1:1717520000",
  "status": "started"
}
```

---

## 3. Run Docker Container Directly

**Endpoint:**
```
POST /api/docker/run
```

**Description:**
Runs a Docker container from a specified image, with optional environment variables and application ID linkage.

**Request Body Example:**
```json
{
  "image": "nginx:latest",
  "name": "my-nginx",
  "env": {
    "FOO": "bar"
  },
  "application_id": 1
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:8080/api/docker/run \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx:latest",
    "name": "my-nginx",
    "env": {
      "FOO": "bar"
    },
    "application_id": 1
  }'
```

**Response:**
```json
{
  "id": "e1b2c3d4f5...",
  "status": "started"
}
```

---

**Note:** All endpoints require a valid JWT token in the `Authorization` header. 