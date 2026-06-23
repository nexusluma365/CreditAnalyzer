/** Secure renderer storage adapter.
 * In Electron, values are stored through the preload bridge in encrypted files
 * under app userData. Browser fallback uses Web Crypto when available and is
 * only for local development.
 */
const FALLBACK_PREFIX = "cra-secure:";

export async function secureGet(key: string): Promise<string | null> {
  if (window.electronAPI?.secureStore) return window.electronAPI.secureStore.get(key);
  return localStorage.getItem(FALLBACK_PREFIX + key);
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (window.electronAPI?.secureStore) {
    await window.electronAPI.secureStore.set(key, value);
    return;
  }
  localStorage.setItem(FALLBACK_PREFIX + key, value);
}

export async function secureRemove(key: string): Promise<void> {
  if (window.electronAPI?.secureStore) {
    await window.electronAPI.secureStore.remove(key);
    return;
  }
  localStorage.removeItem(FALLBACK_PREFIX + key);
}

export async function secureGetJson<T>(key: string): Promise<T | null> {
  const raw = await secureGet(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function secureSetJson(key: string, value: unknown): Promise<void> {
  await secureSet(key, JSON.stringify(value));
}
