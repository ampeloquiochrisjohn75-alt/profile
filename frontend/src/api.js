/**
 * Call the Express API directly (CORS is enabled on the backend).
 * Override with REACT_APP_API_URL if your API is elsewhere (e.g. http://localhost:5001/api).
 * If the provided REACT_APP_API_URL does not include the `/api` path, append it.
 */
let API_ROOT = process.env.REACT_APP_API_URL || '/api';
// If a full URL is provided but doesn't include the /api segment, add it.
if (API_ROOT && API_ROOT !== '/api' && !/\/api(\/|$)/.test(API_ROOT)) {
  API_ROOT = API_ROOT.replace(/\/$/, '') + '/api';
}
API_ROOT = API_ROOT.replace(/\/$/, '');

// Simple in-memory cache to avoid repeated identical requests during a single session
const _studentsCache = new Map();

// General purpose short-lived cache (key -> { value, expiry })
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs = 60000) {
  _cache.set(key, { value, expiry: Date.now() + ttlMs });
}

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
  const cacheKey = 'dashboard:stats';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_ROOT}/dashboard/stats`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Could not load dashboard');
  cacheSet(cacheKey, body, 60 * 1000);
  return body;
}

export async function fetchStudents(params = {}) {
  const qs = new URLSearchParams();
  if (params.skill) qs.set('skill', params.skill);
  if (params.activity) qs.set('activity', params.activity);
  if (params.courseCode) qs.set('courseCode', params.courseCode);
  if (params.department) qs.set('department', params.department);
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const key = `students:${String(params.skill||'')}::${String(params.activity||'')}::${String(params.courseCode||'')}::${String(params.department||'')}::${String(params.q||'')}::${String(params.page||'1')}::${String(params.limit||'20')}::${localStorage.getItem('token')||''}`;
  if (_studentsCache.has(key)) return _studentsCache.get(key);

  const res = await fetch(`${API_ROOT}/students?${qs.toString()}`, { headers: { ...getAuthHeaders() } });
  const body = await readJsonSafe(res, { data: [], total: 0, page: 1, pages: 1 });
  // cache the result (even fallbacks) to prevent repeated failing network calls
  _studentsCache.set(key, body);
  return body;
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
  if (params.courseCode) qs.set('courseCode', params.courseCode);
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
  const cacheKey = `skillstats:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_ROOT}/students/stats/skills?${qs.toString()}`, {
    method: 'GET',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Fetch skill stats failed');
  cacheSet(cacheKey, body, 60 * 1000);
  return body;
}

export async function fetchDepartments() {
  const res = await fetch(`${API_ROOT}/departments`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  return readJsonSafe(res, { data: [] });
}

// Faculty (professors)
export async function fetchFaculty() {
  const res = await fetch(`${API_ROOT}/faculty`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  const body = await readJsonSafe(res, { data: [] });
  // backend returns { data: [...] }
  return body && Array.isArray(body.data) ? body.data : [];
}

export async function createFaculty(data) {
  const res = await fetch(`${API_ROOT}/faculty`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create faculty failed');
  return body;
}
export async function updateFaculty(id, data) {
  const res = await fetch(`${API_ROOT}/faculty/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update faculty failed');
  return body;
}

export async function deleteFaculty(id) {
  const res = await fetch(`${API_ROOT}/faculty/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return readJson(res);
}

// Syllabus
export async function fetchSyllabi() {
  const res = await fetch(`${API_ROOT}/syllabus`, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJsonSafe(res, { data: [] });
}

export async function createSyllabus(data) {
  const res = await fetch(`${API_ROOT}/syllabus`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create syllabus failed');
  return body;
}
export async function updateSyllabus(id, data) {
  const res = await fetch(`${API_ROOT}/syllabus/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update syllabus failed');
  return body;
}

export async function deleteSyllabus(id) {
  const res = await fetch(`${API_ROOT}/syllabus/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return readJson(res);
}

// Courses (canonical course codes)
export async function fetchCourses() {
  const res = await fetch(`${API_ROOT}/courses`, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJsonSafe(res, { data: [] });
}

export async function createCourse(data) {
  const res = await fetch(`${API_ROOT}/courses`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create course failed');
  return body;
}

export async function updateCourse(id, data) {
  const res = await fetch(`${API_ROOT}/courses/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update course failed');
  return body;
}

export async function deleteCourse(id) {
  const res = await fetch(`${API_ROOT}/courses/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return readJson(res);
}


// Events
export async function fetchEvents() {
  const res = await fetch(`${API_ROOT}/events`, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJsonSafe(res, { data: [] });
}

export async function createEvent(data) {
  const res = await fetch(`${API_ROOT}/events`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create event failed');
  return body;
}
export async function updateEvent(id, data) {
  const res = await fetch(`${API_ROOT}/events/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update event failed');
  return body;
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_ROOT}/events/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return readJson(res);
}

// Notifications
export async function fetchNotifications() {
  const res = await fetch(`${API_ROOT}/notifications`, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJsonSafe(res, { data: [] });
}

export async function markNotificationRead(id) {
  const res = await fetch(`${API_ROOT}/notifications/${id}/read`, { method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJson(res);
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${API_ROOT}/notifications/read-all`, { method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJson(res);
}

// Sections
export async function fetchSections() {
  const res = await fetch(`${API_ROOT}/sections`, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJsonSafe(res, { data: [] });
}

export async function createSection(data) {
  const res = await fetch(`${API_ROOT}/sections`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create section failed');
  return body;
}
export async function updateSection(id, data) {
  const res = await fetch(`${API_ROOT}/sections/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update section failed');
  return body;
}

export async function deleteSection(id) {
  const res = await fetch(`${API_ROOT}/sections/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return readJson(res);
}

// Schedules
export async function fetchSchedules() {
  const res = await fetch(`${API_ROOT}/schedules`, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJsonSafe(res, { data: [] });
}

export async function createSchedule(data) {
  const res = await fetch(`${API_ROOT}/schedules`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create schedule failed');
  return body;
}
export async function updateSchedule(id, data) {
  const res = await fetch(`${API_ROOT}/schedules/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update schedule failed');
  return body;
}

export async function deleteSchedule(id) {
  const res = await fetch(`${API_ROOT}/schedules/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return readJson(res);
}

// Reports
export async function fetchReports() {
  const res = await fetch(`${API_ROOT}/reports`, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } });
  return readJsonSafe(res, { data: [] });
}

export async function createReport(data) {
  const res = await fetch(`${API_ROOT}/reports`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Create report failed');
  return body;
}
export async function updateReport(id, data) {
  const res = await fetch(`${API_ROOT}/reports/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Update report failed');
  return body;
}

export async function deleteReport(id) {
  const res = await fetch(`${API_ROOT}/reports/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return readJson(res);
}
