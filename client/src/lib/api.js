const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData)
    headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    const error = new Error(
      payload?.message || `Request failed (${response.status})`,
    );
    error.status = response.status;
    throw error;
  }
  return payload?.data ?? payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (path, body) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export function getApiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "/api";
  return `${base}${path}`;
}
