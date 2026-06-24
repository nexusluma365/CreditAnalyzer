import { apiGet } from "./apiClient";

const UPDATE_POLL_MS = 60 * 1000;
const LAST_BACKEND_COMMIT_KEY = "cra-pro:last-backend-commit";
let installingVersion: string | null = null;

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
  const handleOnline = () => void checkForAppUpdates();
  window.addEventListener("online", handleOnline);
  const interval = window.setInterval(() => {
    void checkForAppUpdates();
  }, UPDATE_POLL_MS);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("online", handleOnline);
  };
}

async function checkForAppUpdates() {
  try {
    const appInfo = window.electronAPI?.getAppVersion
      ? await window.electronAPI.getAppVersion()
      : { version: import.meta.env.VITE_APP_VERSION || "0.1.0", platform: "web" };
    const manifest = await apiGet<AppUpdateManifest>(
      `/api/app-update?version=${encodeURIComponent(appInfo.version)}&platform=${encodeURIComponent(appInfo.platform)}`
    );

    if (manifest.updateAvailable) {
      window.dispatchEvent(new CustomEvent("cra-pro:update-available", { detail: manifest }));
      if (manifest.downloadUrl && window.electronAPI?.updateAndInstall) {
        if (installingVersion !== manifest.latestVersion) {
          installingVersion = manifest.latestVersion;
          const result = await window.electronAPI.updateAndInstall({
            downloadUrl: manifest.downloadUrl,
            latestVersion: manifest.latestVersion,
          });
          if (!result.ok) installingVersion = null;
          return;
        }
      }
    }

    if (manifest.deploymentCommit && manifest.deploymentCommit !== "local") {
      const lastSeen = localStorage.getItem(LAST_BACKEND_COMMIT_KEY);
      if (lastSeen && lastSeen !== manifest.deploymentCommit && window.electronAPI?.reloadApp) {
        localStorage.setItem(LAST_BACKEND_COMMIT_KEY, manifest.deploymentCommit);
        await window.electronAPI.reloadApp();
        return;
      }
      localStorage.setItem(LAST_BACKEND_COMMIT_KEY, manifest.deploymentCommit);
    }
  } catch {
    installingVersion = null;
    // Update checks are best-effort. Licensing and analysis calls surface their own errors.
  }
}
