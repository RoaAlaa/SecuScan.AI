const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

function getToken() {
  try {
    const raw = localStorage.getItem("secuscan_token");
    return raw ? raw : null;
  } catch {
    return null;
  }
}

export async function api(method, path, body = null, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const config = { method, headers, ...options };
  if (body && method !== "GET") config.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, config);
  } catch (err) {
    if (err.message === "Failed to fetch" || err.name === "TypeError") {
      throw new Error(`Cannot reach server at ${API_URL}. Is the backend running?`);
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }
  return data;
}

export { API_URL, getToken };
