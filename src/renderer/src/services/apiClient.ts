const DEFAULT_API_BASE_URL = "http://localhost:3000";
const API_BASE_STORAGE_KEY = "cra-pro:api-base-url";

export function getApiBaseUrl(): string {
  const viteUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (viteUrl?.trim()) return viteUrl.trim().replace(/\/$/, "");
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (saved?.trim()) return saved.trim().replace(/\/$/, "");
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
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `API request failed (${response.status})`);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `API request failed (${response.status})`);
  }
  return data as T;
}
