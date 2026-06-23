import type { LicenseInfo } from "@/types";

/**
 * Presentational license states used for gating/lockout UI. These are
 * derived from the existing LicenseInfo (status/message) plus local
 * onboarding progress — the underlying wire format/LicenseStatus type used
 * by keygenLicenseService and the Keygen API is unchanged.
 */
export type LicensePresentationState =
  | "not_activated"
  | "activating"
  | "activated"
  | "invalid"
  | "expired"
  | "offline";

const OFFLINE_HINT = /reach|network|fetch|offline|connection|timeout/i;

export function deriveLicenseState(
  license: LicenseInfo,
  options: { onboarded: boolean; activating?: boolean } = { onboarded: false }
): LicensePresentationState {
  if (options.activating) return "activating";

  if (license.status === "active") return "activated";

  if (license.status === "expired") return "expired";

  if (license.status === "trial") {
    return "not_activated";
  }

  // status === "inactive" — could be a fresh install, a bad key, or an
  // unreachable backend. Use the message to distinguish offline from
  // genuinely invalid, falling back to "not_activated" if we have no
  // signal yet (e.g. brand new device, never tried).
  if (license.message && OFFLINE_HINT.test(license.message)) return "offline";
  if (!options.onboarded) return "not_activated";
  return "invalid";
}

export const LICENSE_STATE_LABELS: Record<LicensePresentationState, string> = {
  not_activated: "Not Activated",
  activating: "Activating",
  activated: "Activated",
  invalid: "Invalid License",
  expired: "Expired Subscription",
  offline: "Backend Offline",
};
