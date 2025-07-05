# Docker API Endpoints

All endpoints in this group are **protected** and require a valid JWT token in the `Authorization` header (e.g., `Bearer <token>`).

Base path: `/api/docker`

---

## 1. List Docker Containers

- **Endpoint:** `GET /api/docker/containers`
- **Description:** Returns a list of all Docker containers (running and stopped).
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
- **Response:**  
  - `200 OK`  
    ```json
    [
      {
        "ID": "container_id",
        "Names": ["container_name"],
        "Image": "image_name",
        "State": "running",
        "Status": "Up 2 hours"
      }
    ]
    ```
- **Notes:**  
  - The response includes details such as container ID, names, image, state, and status.

---

## 2. Run Docker Container

- **Endpoint:** `POST /api/docker/run`
- **Description:** Starts a new Docker container with the specified configuration.
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Body (JSON):**
    ```json
    {
      "image": "nginx:latest",
      "name": "my-nginx",
      "ports": ["8080:80"],
      "env": ["KEY=value"],
      "cmd": ["arg1", "arg2"],
      "detach": true
    }
    ```
    - `image` (string, required): Docker image to use.
    - `name` (string, optional): Name for the container.
    - `ports` (array, optional): Port mappings (`host:container`).
    - `env` (array, optional): Environment variables.
    - `cmd` (array, optional): Command and arguments.
    - `detach` (bool, optional): Run in detached mode (default: true).
- **Response:**  
  - `201 Created`  
    ```json
    {
      "container_id": "container_id",
      "status": "started"
    }
    ```
- **Notes:**  
  - Returns the new container's ID and status.

---

## 3. Stop Docker Container

- **Endpoint:** `POST /api/docker/stop/:id`
- **Description:** Stops a running Docker container.
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
- **Response:**  
  - `200 OK`  
    ```json
    {
      "container_id": "container_id",
      "status": "stopped"
    }
    ```
- **Notes:**  
  - The container must exist and be running.

---

## 4. Remove Docker Container

- **Endpoint:** `DELETE /api/docker/remove/:id`
- **Description:** Removes a Docker container (must be stopped).
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
- **Response:**  
  - `200 OK`  
    ```json
    {
      "container_id": "container_id",
      "status": "removed"
    }
    ```
- **Notes:**  
  - The container must be stopped before removal.

---

## 5. Get Docker Container Logs

- **Endpoint:** `GET /api/docker/logs/:id`
- **Description:** Retrieves logs for a specific container.
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
- **Response:**  
  - `200 OK`  
    ```json
    {
      "logs": "log output as string"
    }
    ```
- **Notes:**  
  - May support query parameters for tailing or filtering logs (check implementation).

---

## 6. Docker System Prune

- **Endpoint:** `POST /api/docker/prune`
- **Description:** Removes unused Docker data (dangling images, stopped containers, etc.).
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
- **Response:**  
  - `200 OK`  
    ```json
    {
      "pruned": true,
      "details": "summary of what was removed"
    }
    ```
- **Notes:**  
  - Use with caution; this operation is destructive.

---

## 7. Docker System Prune All

- **Endpoint:** `POST /api/docker/prune-all`
- **Description:** Performs a more aggressive prune, removing all unused data.
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
- **Response:**  
  - `200 OK`  
    ```json
    {
      "pruned": true,
      "details": "summary of what was removed"
    }
    ```
- **Notes:**  
  - Use with extreme caution; this may remove volumes and networks.

---

## 8. Docker System Info

- **Endpoint:** `GET /api/docker/info`
- **Description:** Returns Docker system information (version, resources, etc.).
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
- **Response:**  
  - `200 OK`  
    ```json
    {
      "info": { }
    }
    ```
- **Notes:**  
  - The structure matches the output of `docker info`.

---

## 9. Restart Docker Container

- **Endpoint:** `POST /api/docker/restart/:id`
- **Description:** Restarts a Docker container.
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
- **Response:**  
  - `200 OK`  
    ```json
    {
      "container_id": "container_id",
      "status": "restarted"
    }
    ```

---

## 10. Inspect Docker Container

- **Endpoint:** `GET /api/docker/inspect/:id`
- **Description:** Returns detailed information about a container.
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
- **Response:**  
  - `200 OK`  
    ```json
    {
      "inspect": { }
    }
    ```
- **Notes:**  
  - The structure matches the output of `docker inspect`.

---

## 11. Docker Container Stats

- **Endpoint:** `GET /api/docker/stats/:id`
- **Description:** Returns real-time stats for a container (CPU, memory, etc.).
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
- **Response:**  
  - `200 OK`  
    ```json
    {
      "stats": { }
    }
    ```
- **Notes:**  
  - The structure matches the output of `docker stats`.

---

## 12. Exec Command in Docker Container

- **Endpoint:** `POST /api/docker/exec/:id`
- **Description:** Executes a command inside a running container.
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
  - **Body (JSON):**
    ```json
    {
      "cmd": ["ls", "-la"]
    }
    ```
    - `cmd` (array, required): Command and arguments to execute.
- **Response:**  
  - `200 OK`  
    ```json
    {
      "output": "command output as string"
    }
    ```
- **Notes:**  
  - The command runs in the container context.

---

## 13. Terminal (WebSocket/Streaming)

- **Endpoint:** `GET /api/docker/terminal/:id`
- **Description:** Opens a terminal session to the container (likely via WebSocket).
- **Request:**  
  - **Headers:**  
    - `Authorization: Bearer <token>`
  - **Path Parameter:**  
    - `id`: Container ID or name.
- **Response:**  
  - **WebSocket/streaming connection**
- **Notes:**  
  - Used for interactive shell access.  
  - Implementation details may vary; check client and server code for protocol.

---

# General Notes

- **Authentication:** All endpoints require JWT authentication.
- **Error Handling:**  
  - `401 Unauthorized` if token is missing or invalid.
  - `404 Not Found` if the container or resource does not exist.
  - `400 Bad Request` for invalid payloads.
  - `500 Internal Server Error` for server-side issues.
- **Security:**  
  - Only authenticated users can access these endpoints.
  - Some operations (prune, remove, exec) are potentially destructive or security-sensitive.

---

If you need more details on a specific endpoint (e.g., full request/response examples, error cases, or implementation details), see the implementation or contact the maintainers. 