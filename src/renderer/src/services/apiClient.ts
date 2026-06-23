const DEFAULT_API_BASE_URL = "https://creditanalyzer-production.up.railway.app";
const LOCAL_API_BASE_URL = "http://localhost:3000";
const API_BASE_STORAGE_KEY = "cra-pro:api-base-url";

export function getApiBaseUrl(): string {
  const viteUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (viteUrl?.trim()) return viteUrl.trim().replace(/\/$/, "");
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY);
    const normalized = saved?.trim().replace(/\/$/, "");
    if (normalized && normalized !== LOCAL_API_BASE_URL) return normalized;
  }
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string) {
  if (typeof localStorage === "undefined") return;
  const normalized = url.trim().replace(/\/$/, "");
  if (normalized) localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
  else localStorage.removeItem(API_BASE_STORAGE_KEY);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (window.electronAPI?.apiRequest) {
    const result = await window.electronAPI.apiRequest({
      url: `${apiBaseUrl}${path}`,
      method: "POST",
      body,
    });
    if (!result.ok) throw apiError(result.data, result.status);
    return result.data as T;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((error) => {
    throw new Error(
      `Could not reach the licensing server at ${apiBaseUrl}. ${
        error instanceof Error ? error.message : "Check your connection and try again."
      }`
    );
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw apiError(data, response.status);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (window.electronAPI?.apiRequest) {
    const result = await window.electronAPI.apiRequest({
      url: `${apiBaseUrl}${path}`,
      method: "GET",
    });
    if (!result.ok) throw apiError(result.data, result.status);
    return result.data as T;
  }

  const response = await fetch(`${apiBaseUrl}${path}`).catch((error) => {
    throw new Error(
      `Could not reach the licensing server at ${apiBaseUrl}. ${
        error instanceof Error ? error.message : "Check your connection and try again."
      }`
    );
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw apiError(data, response.status);
  }
  return data as T;
}

function apiError(data: unknown, status: number) {
  const payload = data as { message?: string; error?: string } | null;
  return new Error(payload?.message || payload?.error || `API request failed (${status})`);
}
