import { apiPost } from "./apiClient";

export interface UsbScanResult {
  found: boolean;
  licenseRaw: string | null;
  driveId: string | null;
}

export interface UsbValidationResult {
  valid: boolean;
  reason: string;
  maskedLicense: string | null;
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
    return await apiPost<UsbValidationResult>("/api/validate-usb-license", {
      licenseKey: licenseRaw,
      fingerprint,
      usbDriveId: driveId ?? "",
      appVersion: "0.1.0",
    });
  } catch {
    return {
      valid: false,
      reason: "Cannot reach the validation server. Check your internet connection.",
      maskedLicense: maskLicense(licenseRaw),
    };
  }
}
