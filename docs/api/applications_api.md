# Applications API Documentation

This document describes the endpoints under `/api/applications` for managing applications in the Gakwaya Panel API.

All endpoints in this group require authentication via JWT (see `/api/login` for obtaining a token). Include the token in the `Authorization: Bearer <token>` header.

---

## Authentication & Headers

- **Authentication:** All endpoints require a valid JWT token in the `Authorization` header:
  - `Authorization: Bearer <token>`
- **Content-Type:** For endpoints that accept a request body, use:
  - `Content-Type: application/json`
- **Error Responses:** All errors are returned in JSON format:
  ```json
  { "error": "Error message here." }
  ```

---

## Endpoints

### 1. Create Application
- **Method:** POST
- **Path:** `/api/applications`
- **Auth:** Required
- **Description:** Create a new application.
- **Request Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body Schema:**
  | Field        | Type   | Required | Description                       |
  |--------------|--------|----------|-----------------------------------|
  | name         | string | Yes      | Name of the application           |
  | repo_url     | string | Yes      | Git repository URL                |
  | description  | string | No       | Description of the application    |

- **Request Body Example:**
```json
{
  "name": "my-app",
  "repo_url": "https://github.com/example/repo.git",
  "description": "A sample app"
}
```
- **Example cURL:**
```bash
curl -X POST https://yourdomain.com/api/applications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "repo_url": "https://github.com/example/repo.git",
    "description": "A sample app"
  }'
```
- **Success Response:**
  - **Status:** 201 Created
  - **Body:**
```json
{
  "id": 1,
  "name": "my-app",
  "repo_url": "https://github.com/example/repo.git",
  "description": "A sample app",
  "created_at": "2024-06-01T12:00:00Z"
}
```

---

### 2. List Applications
- **Method:** GET
- **Path:** `/api/applications`
- **Auth:** Required
- **Description:** List all applications for the authenticated user.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Example cURL:**
```bash
curl -X GET https://yourdomain.com/api/applications \
  -H "Authorization: Bearer <token>"
```
- **Success Response:**
  - **Status:** 200 OK
  - **Body:**
```json
[
  {
    "id": 1,
    "name": "my-app",
    "repo_url": "https://github.com/example/repo.git",
    "description": "A sample app",
    "created_at": "2024-06-01T12:00:00Z"
  }
]
```

---

### 3. Get Application by ID
- **Method:** GET
- **Path:** `/api/applications/:id`
- **Auth:** Required
- **Description:** Get details of a specific application by its ID.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Path Parameter:**
  - `id` (integer, required): The application ID
- **Example cURL:**
```bash
curl -X GET https://yourdomain.com/api/applications/1 \
  -H "Authorization: Bearer <token>"
```
- **Success Response:**
  - **Status:** 200 OK
  - **Body:**
```json
{
  "id": 1,
  "name": "my-app",
  "repo_url": "https://github.com/example/repo.git",
  "description": "A sample app",
  "created_at": "2024-06-01T12:00:00Z"
}
```

---

### 4. Update Application
- **Method:** PUT
- **Path:** `/api/applications/:id`
- **Auth:** Required
- **Description:** Update an existing application.
- **Request Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Parameter:**
  - `id` (integer, required): The application ID
- **Request Body Schema:**
  | Field        | Type   | Required | Description                    |
  |--------------|--------|----------|--------------------------------|
  | name         | string | No       | New name of the application    |
  | description  | string | No       | New description                |

- **Request Body Example:**
```json
{
  "name": "my-app-updated",
  "description": "Updated description"
}
```
- **Example cURL:**
```bash
curl -X PUT https://yourdomain.com/api/applications/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app-updated",
    "description": "Updated description"
  }'
```
- **Success Response:**
  - **Status:** 200 OK
  - **Body:**
```json
{
  "id": 1,
  "name": "my-app-updated",
  "repo_url": "https://github.com/example/repo.git",
  "description": "Updated description",
  "created_at": "2024-06-01T12:00:00Z"
}
```

---

### 5. Delete Application
- **Method:** DELETE
- **Path:** `/api/applications/:id`
- **Auth:** Required
- **Description:** Delete an application by its ID.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Path Parameter:**
  - `id` (integer, required): The application ID
- **Example cURL:**
```bash
curl -X DELETE https://yourdomain.com/api/applications/1 \
  -H "Authorization: Bearer <token>"
```
- **Success Response:**
  - **Status:** 200 OK
  - **Body:**
```json
{
  "message": "Application deleted successfully."
}
```

---

### 6. Deploy Application
- **Method:** POST
- **Path:** `/api/applications/:id/deploy`
- **Auth:** Required
- **Description:** Deploy the specified application. This triggers a deployment process for the application with the given ID.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Path Parameter:**
  - `id` (integer, required): The application ID
- **Example cURL:**
```bash
curl -X POST https://yourdomain.com/api/applications/1/deploy \
  -H "Authorization: Bearer <token>"
```
- **Success Response:**
  - **Status:** 200 OK
  - **Body:**
```json
{
  "message": "Deployment started."
}
```

---

### 7. Deploy Application from Git
- **Method:** POST
- **Path:** `/api/applications/:id/deploy-from-git`
- **Auth:** Required
- **Description:** Deploy the application by pulling the latest code from its Git repository and starting a deployment.
- **Request Headers:**
  - `Authorization: Bearer <token>`
- **Path Parameter:**
  - `id` (integer, required): The application ID
- **Example cURL:**
```bash
curl -X POST https://yourdomain.com/api/applications/1/deploy-from-git \
  -H "Authorization: Bearer <token>"
```
- **Success Response:**
  - **Status:** 200 OK
  - **Body:**
```json
{
  "message": "Deployment from Git started."
}
```

---

## Notes
- All endpoints require the `Authorization: Bearer <token>` header.
- Replace `:id` with the actual application ID in the path.
- Error responses will be in JSON format with an `error` field.
- For more details on authentication and error handling, see the main API documentation. 