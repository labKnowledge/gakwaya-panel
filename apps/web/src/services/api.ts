const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gakwaya_auth');
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Login failed');
  return res.json();
}

export async function register(username: string, password: string) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Registration failed');
  return res.json();
}

export async function getApplications() {
  const res = await fetch(`${API_URL}/applications`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch applications');
  return res.json();
}

export async function getApplicationDetails(id: string) {
  const res = await fetch(`${API_URL}/applications/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch application details');
  return res.json();
}

export async function getApplicationLogs(id: string) {
  const res = await fetch(`${API_URL}/docker/logs/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch logs');
  return res.text(); // logs are usually plain text
}

export async function createApplication(payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to create application');
  return res.json();
}

export async function deployApplicationFromGit(payload: Record<string, unknown>) {
  // Sanitize app name for docker image tag
  const rawName = (payload?.name || '').toString();
  const timestamp = Date.now();
  const dockerImage = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') + `_${timestamp}`;

  // First, create the application and await the result
  const createRes = await createApplication({
    name: payload?.name,
    image: dockerImage,
    git_url: payload?.git_url,
    branch: payload?.branch,
    dockerfile_path: payload?.dockerfile_path,
    volumes: payload?.volumes,
    build_args: payload?.build_args,
    domain: payload?.domain,
    port: payload?.port,
  });
  // Extract the id from the response
  const id = createRes.id || createRes.application?.id;
  
  if (!id) throw new Error('Failed to get application ID after creation');

  // Now, deploy from git using the obtained id
  const res = await fetch(`${API_URL}/applications/${id}/deploy-from-git`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      git_url: payload?.git_url,
      branch: payload?.branch,
      dockerfile_path: payload?.dockerfile_path,
      volumes: payload?.volumes,
      build_args: payload?.build_args,
      domain: payload?.domain,
      port: payload?.port,
    }),
  });

  if (!res.ok) throw new Error((await res.json()).message || 'Failed to deploy application from GitHub');
  return res.json();
}

export async function deleteApplication(id: string) {
  const res = await fetch(`${API_URL}/applications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to delete application');
  return res.json();
}

export async function updateApplication(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/applications/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to update application');
  return res.json();
}

// Docker Management API
export async function getDockerContainers() {
  const res = await fetch(`${API_URL}/docker/containers`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch containers');
  return res.json();
}

export async function stopDockerContainer(id: string) {
  const res = await fetch(`${API_URL}/docker/stop/${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to stop container');
  return res.json();
}

export async function removeDockerContainer(id: string) {
  const res = await fetch(`${API_URL}/docker/remove/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to remove container');
  return res.json();
}

export async function restartDockerContainer(id: string) {
  const res = await fetch(`${API_URL}/docker/restart/${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to restart container');
  return res.json();
}

export async function getDockerLogs(id: string) {
  const res = await fetch(`${API_URL}/docker/logs/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch logs');
  return res.text();
}

export async function inspectDockerContainer(id: string) {
  const res = await fetch(`${API_URL}/docker/inspect/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to inspect container');
  return res.json();
}

export async function dockerPrune() {
  const res = await fetch(`${API_URL}/docker/prune`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to prune Docker system');
  return res.json();
}

export async function dockerPruneAll() {
  const res = await fetch(`${API_URL}/docker/prune-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to prune all Docker data');
  return res.json();
}

// Add more API functions as needed 