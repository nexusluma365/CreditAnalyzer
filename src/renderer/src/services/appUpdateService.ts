import { apiGet } from "./apiClient";

const UPDATE_POLL_MS = 15 * 60 * 1000;
const LAST_BACKEND_COMMIT_KEY = "cra-pro:last-backend-commit";

interface AppUpdateManifest {
  appVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  forceUpdate: boolean;
  deploymentCommit: string;
  downloadUrl: string | null;
  notes: string | null;
}

export function startAppUpdateHeartbeat() {
  void checkForAppUpdates();
  const interval = window.setInterval(() => {
    void checkForAppUpdates();
  }, UPDATE_POLL_MS);
  return () => window.clearInterval(interval);
}

async function checkForAppUpdates() {
  try {
    const appInfo = window.electronAPI?.getAppVersion
      ? await window.electronAPI.getAppVersion()
      : { version: import.meta.env.VITE_APP_VERSION || "0.1.0", platform: "web" };
    const manifest = await apiGet<AppUpdateManifest>(
      `/api/app-update?version=${encodeURIComponent(appInfo.version)}&platform=${encodeURIComponent(appInfo.platform)}`
    );

    if (manifest.deploymentCommit && manifest.deploymentCommit !== "local") {
      const lastSeen = localStorage.getItem(LAST_BACKEND_COMMIT_KEY);
      if (lastSeen && lastSeen !== manifest.deploymentCommit && window.electronAPI?.reloadApp) {
        localStorage.setItem(LAST_BACKEND_COMMIT_KEY, manifest.deploymentCommit);
        await window.electronAPI.reloadApp();
        return;
      }
      localStorage.setItem(LAST_BACKEND_COMMIT_KEY, manifest.deploymentCommit);
    }

    if (manifest.updateAvailable) {
      window.dispatchEvent(new CustomEvent("cra-pro:update-available", { detail: manifest }));
    }
  } catch {
    // Update checks are best-effort. Licensing and analysis calls surface their own errors.
  }
}
