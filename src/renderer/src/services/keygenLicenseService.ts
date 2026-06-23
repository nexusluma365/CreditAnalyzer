import type { LicenseInfo } from "@/types";
import { apiPost } from "./apiClient";
import { secureGetJson, secureRemove, secureSetJson } from "./secureStorageService";

const STORAGE_KEY = "cra-pro:license.v3";
const OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000; // one day: enough for brief outages, not long-term bypass

interface LicenseApiResponse {
  valid: boolean;
  activated?: boolean;
  status?: string;
  expiry?: string | null;
  message?: string;
  code?: string | null;
  licenseId?: string | null;
}

interface StoredLicense extends LicenseInfo {
  lastValidatedAt?: string | null;
  fingerprint?: string | null;
}

export async function activateLicense(key: string): Promise<LicenseInfo> {
  const trimmed = key.trim();
  if (!trimmed) return inactive(trimmed, "Missing license key.");

  try {
    const result = await apiPost<LicenseApiResponse>("/api/license/activate", {
      licenseKey: trimmed,
      fingerprint: await getMachineFingerprint(),
      machineName: await getMachineName(),
    });

    if (result.valid) {
      const info: StoredLicense = {
        key: trimmed,
        status: "active",
        plan: "individual",
        activatedAt: new Date().toISOString(),
        expiresAt: result.expiry ?? null,
        message: result.message ?? "License activated successfully.",
        lastValidatedAt: new Date().toISOString(),
        fingerprint: await getMachineFingerprint(),
      };
      await persist(info);
      return info;
    }

    return inactive(trimmed, result.message || result.code || "License was not accepted.");
  } catch (error) {
    return inactive(trimmed, error instanceof Error ? error.message : "Could not reach licensing server.");
  }
}

export async function validateStoredLicense(): Promise<LicenseInfo> {
  const current = await getStoredLicense(false) as StoredLicense;
  if (!current.key || current.status !== "active") return current;

  try {
    const result = await apiPost<LicenseApiResponse>("/api/license/validate", {
      licenseKey: current.key,
      fingerprint: await getMachineFingerprint(),
    });

    if (result.valid) {
      const next: StoredLicense = {
        ...current,
        status: "active",
        expiresAt: result.expiry ?? current.expiresAt ?? null,
        message: result.message ?? "License is active.",
        lastValidatedAt: new Date().toISOString(),
        fingerprint: await getMachineFingerprint(),
      };
      await persist(next);
      return next;
    }

    const expired = result.code?.toLowerCase().includes("expired") || result.status?.toLowerCase().includes("expired");
    const next: StoredLicense = {
      ...current,
      status: expired ? "expired" : "inactive",
      message: result.message || result.code || "License is no longer active.",
      lastValidatedAt: new Date().toISOString(),
    };
    await persist(next);
    return next;
  } catch (error) {
    const last = current.lastValidatedAt ? Date.parse(current.lastValidatedAt) : 0;
    const withinGrace = last > 0 && Date.now() - last < OFFLINE_GRACE_MS;
    if (withinGrace) {
      return {
        ...current,
        message: "License server is temporarily unreachable. Access is allowed during the short offline grace window.",
      };
    }
    const locked: StoredLicense = {
      ...current,
      status: "inactive",
      message: error instanceof Error ? `Backend offline: ${error.message}` : "Backend offline. Reconnect to validate your subscription.",
    };
    await persist(locked);
    return locked;
  }
}

export async function getStoredLicense(validateOnline = true): Promise<LicenseInfo> {
  const parsed = await secureGetJson<StoredLicense>(STORAGE_KEY);
  if (!parsed) return inactive(null, "No license has been activated on this device.");
  if (validateOnline) return validateStoredLicense();
  return parsed;
}

export async function getLicenseAuthPayload(): Promise<{ licenseKey: string; fingerprint: string } | null> {
  const current = await getStoredLicense(false) as StoredLicense;
  if (!current.key || current.status !== "active") return null;
  return { licenseKey: current.key, fingerprint: await getMachineFingerprint() };
}

export async function deactivateLicense(): Promise<void> {
  await secureRemove(STORAGE_KEY);
}

async function persist(info: StoredLicense) {
  await secureSetJson(STORAGE_KEY, info);
}

function inactive(key: string | null, message: string): LicenseInfo {
  return { key, status: "inactive", plan: null, activatedAt: null, message };
}

async function getMachineFingerprint(): Promise<string> {
  if (window.electronAPI?.getMachineFingerprint) return window.electronAPI.getMachineFingerprint();
  const base = [navigator.userAgent, navigator.language, navigator.platform, screen.width, screen.height].join("|");
  return `cra-web-${hashString(base)}`;
}

async function getMachineName(): Promise<string> {
  if (window.electronAPI?.getMachineName) return window.electronAPI.getMachineName();
  return `Credit Analyzer ${navigator.platform || "desktop"}`;
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
