const BASE = import.meta.env.VITE_API_URL || '/api';
export const fileUrl = (u) => (!u || /^https?:\/\//.test(u) ? u : (import.meta.env.VITE_FILE_BASE || '') + u);

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'));

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/')) {
      setToken(null);
      window.location.assign('/login');
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
