/**
 * Call the Express API directly (CORS is enabled on the backend).
 * Override with REACT_APP_API_URL if your API is elsewhere (e.g. http://localhost:5001/api).
 */
const API_ROOT = (process.env.REACT_APP_API_URL || '/api').replace(/\/$/, '');

function parseJsonResponse(text) {
  const t = (text || '').trim();
  if (!t) return {};
  if (t.startsWith('<') || t.startsWith('<!')) {
    throw new Error(
      `API returned HTML instead of JSON (base: ${API_ROOT}). ` +
        'Something on that host/port is serving a web page—often the React app is on port 5000. ' +
        'Run the backend only on 5000 (node server.js) and React on 3000 (npm start), ' +
        'or set REACT_APP_API_URL in frontend/.env to your real API URL.'
    );
  }
  try {
    return JSON.parse(t);
  } catch {
    throw new Error('Invalid JSON from API: ' + t.slice(0, 120));
  }
}

async function readJson(res) {
  const text = await res.text();
  return parseJsonResponse(text);
}

/** For list endpoints when we must not throw (bad proxy still shows empty UI). */
async function readJsonSafe(res, fallback) {
  const text = await res.text();
  if (!res.ok) return fallback;
  try {
    const t = (text || '').trim();
    if (!t || t.startsWith('<')) return fallback;
    return JSON.parse(t);
  } catch {
    return fallback;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// Helper: fetch with timeout to avoid hanging requests when backend is down
async function fetchWithTimeout(url, opts = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...opts });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out — backend not responding');
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/** Admin dashboard: summary, chart series, recent activity */
export async function fetchDashboardStats() {
  const res = await fetch(`${API_ROOT}/dashboard/stats`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Could not load dashboard');
  return body;
}

export async function fetchStudents(params = {}) {
  const qs = new URLSearchParams();
  if (params.skill) qs.set('skill', params.skill);
  if (params.activity) qs.set('activity', params.activity);
  if (params.department) qs.set('department', params.department);
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const res = await fetch(`${API_ROOT}/students?${qs.toString()}`, { headers: { ...getAuthHeaders() } });
  return readJsonSafe(res, { data: [], total: 0, page: 1, pages: 1 });
}

export async function createStudent(data) {
  const res = await fetch(`${API_ROOT}/students`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create failed');
  return body;
}

export async function fetchStudent(id) {
  const res = await fetch(`${API_ROOT}/students/${id}`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) return null;
  return readJsonSafe(res, null);
}

export async function exportStudentsCSV(params = {}) {
  const qs = new URLSearchParams();
  if (params.skill) qs.set('skill', params.skill);
  if (params.activity) qs.set('activity', params.activity);
  if (params.q) qs.set('q', params.q);
  const res = await fetch(`${API_ROOT}/students/export?${qs.toString()}`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) return null;
  return res.text();
}

export async function updateStudent(id, data) {
  const res = await fetch(`${API_ROOT}/students/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update failed');
  return body;
}

export async function deleteStudent(id) {
  const res = await fetch(`${API_ROOT}/students/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  return readJson(res);
}

export async function registerAuth({ email, password, role, studentId, adminId, firstName, lastName, course }) {
  const bodyData = { email, password, role };
  const resolvedStudentId = String((adminId && adminId.trim()) || studentId || '').trim();
  if (resolvedStudentId) {
    bodyData.studentId = resolvedStudentId;
  }
  if (firstName) bodyData.firstName = firstName;
  if (lastName) bodyData.lastName = lastName;
  if (course) bodyData.course = course;
  const res = await fetchWithTimeout(`${API_ROOT}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData),
  }, 10000);
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Register failed');
  return body;
}

export async function loginAuth({ studentId, password }) {
  const res = await fetchWithTimeout(`${API_ROOT}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, password }),
  }, 10000);
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Login failed');
  return body;
}

export async function getMe() {
  const res = await fetchWithTimeout(`${API_ROOT}/auth/me`, {
    method: 'GET',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  }, 10000);
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Fetch me failed');
  return body;
}

export async function fetchAdmins() {
  const res = await fetch(`${API_ROOT}/auth/admins`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Failed to load admins');
  return body.data || [];
}

export async function fetchSkillStats(limit = 20) {
  const qs = new URLSearchParams();
  if (limit) qs.set('limit', String(limit));
  const res = await fetch(`${API_ROOT}/students/stats/skills?${qs.toString()}`, {
    method: 'GET',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Fetch skill stats failed');
  return body;
}

export async function fetchDepartments() {
  const res = await fetch(`${API_ROOT}/departments`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  return readJsonSafe(res, { data: [] });
}

export async function createDepartment(data) {
  const res = await fetch(`${API_ROOT}/departments`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create department failed');
  return body;
}

export async function updateDepartment(id, data) {
  const res = await fetch(`${API_ROOT}/departments/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return readJson(res);
}

export async function deleteDepartment(id) {
  const res = await fetch(`${API_ROOT}/departments/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  return readJson(res);
}
