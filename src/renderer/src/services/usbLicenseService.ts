import { apiPost } from "./apiClient";
import { secureGetJson, secureSetJson } from "./secureStorageService";

const USB_OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000;
const USB_CACHE_KEY = "cra-pro:usb-license-validation.v1";

export interface UsbScanResult {
  found: boolean;
  licenseRaw: string | null;
  driveId: string | null;
}

export interface UsbValidationResult {
  valid: boolean;
  reason: string;
  maskedLicense: string | null;
  offlineGrace?: boolean;
}

interface StoredUsbValidation {
  licenseHash: string;
  driveId: string;
  maskedLicense: string;
  validatedAt: string;
}

export function maskLicense(key: string | null | undefined): string {
  if (!key) return "****";
  const parts = key.split("-");
  if (parts.length < 2) return "****";
  const last = parts[parts.length - 1];
  const masked = parts.slice(0, -1).map(() => "****").join("-");
  return `${masked}-${last}`;
}

export async function scanUsbLicense(): Promise<UsbScanResult> {
  if (!window.electronAPI?.scanUsbLicense) {
    return { found: false, licenseRaw: null, driveId: null };
  }
  try {
    return await window.electronAPI.scanUsbLicense();
  } catch {
    return { found: false, licenseRaw: null, driveId: null };
  }
}

export async function validateUsbLicense(
  licenseRaw: string,
  driveId: string | null
): Promise<UsbValidationResult> {
  const fingerprint = window.electronAPI?.getMachineFingerprint
    ? await window.electronAPI.getMachineFingerprint()
    : "web";
  try {
    const result = await apiPost<UsbValidationResult>("/api/validate-usb-license", {
      licenseKey: licenseRaw,
      fingerprint,
      usbDriveId: driveId ?? "",
      appVersion: "0.1.0",
    });
    if (result.valid) {
      await rememberUsbValidation(licenseRaw, driveId, result.maskedLicense ?? maskLicense(licenseRaw));
    }
    return result;
  } catch {
    const cached = await getRecentUsbValidation(licenseRaw, driveId);
    if (cached) {
      return {
        valid: true,
        reason: "Backend is offline. USB key accepted during the short offline grace window.",
        maskedLicense: cached.maskedLicense,
        offlineGrace: true,
      };
    }
    return {
      valid: false,
      reason: "Cannot reach the validation server. Reconnect to validate this USB key.",
      maskedLicense: maskLicense(licenseRaw),
    };
  }
}

async function rememberUsbValidation(licenseRaw: string, driveId: string | null, maskedLicense: string) {
  await secureSetJson(USB_CACHE_KEY, {
    licenseHash: await hashUsbLicense(licenseRaw),
    driveId: driveId ?? "",
    maskedLicense,
    validatedAt: new Date().toISOString(),
  } satisfies StoredUsbValidation);
}

async function getRecentUsbValidation(licenseRaw: string, driveId: string | null): Promise<StoredUsbValidation | null> {
  const cached = await secureGetJson<StoredUsbValidation>(USB_CACHE_KEY);
  if (!cached?.validatedAt || !cached.licenseHash) return null;
  if (cached.driveId !== (driveId ?? "")) return null;
  if (cached.licenseHash !== await hashUsbLicense(licenseRaw)) return null;
  const validatedAt = Date.parse(cached.validatedAt);
  if (!Number.isFinite(validatedAt) || Date.now() - validatedAt > USB_OFFLINE_GRACE_MS) return null;
  return cached;
}

async function hashUsbLicense(value: string): Promise<string> {
  const normalized = value.trim();
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(normalized);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
