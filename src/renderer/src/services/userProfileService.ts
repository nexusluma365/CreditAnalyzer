import { secureGetJson, secureRemove, secureSet, secureSetJson } from "./secureStorageService";

export interface UserProfile {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  savedAt: string;
}

const STORAGE_KEY = "cra-pro:user-profile.v3";
const ONBOARDED_KEY = "cra-pro:onboarded.v3";

export function getStoredProfile(): UserProfile | null {
  // Synchronous fallback for initial render only. Real value is hydrated with
  // getStoredProfileAsync() in AppContext.
  return null;
}

export async function getStoredProfileAsync(): Promise<UserProfile | null> {
  return secureGetJson<UserProfile>(STORAGE_KEY);
}

export async function saveProfile(profile: Omit<UserProfile, "savedAt">): Promise<UserProfile> {
  const next: UserProfile = { ...profile, savedAt: new Date().toISOString() };
  await secureSetJson(STORAGE_KEY, next);
  return next;
}

export async function clearProfile(): Promise<void> {
  await secureRemove(STORAGE_KEY);
}

export function hasCompletedOnboarding(): boolean {
  // AppGate needs a synchronous first render. False is safe; it will show
  // onboarding until license/profile state hydrates.
  return false;
}

export async function hasCompletedOnboardingAsync(): Promise<boolean> {
  return (await secureGetJson<{ done: boolean }>(ONBOARDED_KEY))?.done === true;
}

export async function markOnboardingComplete(): Promise<void> {
  await secureSet(ONBOARDED_KEY, JSON.stringify({ done: true, at: new Date().toISOString() }));
}

export async function resetOnboarding(): Promise<void> {
  await secureRemove(ONBOARDED_KEY);
}
