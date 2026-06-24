import { useCallback, useEffect, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { LicenseActivationScreen } from "@/screens/LicenseActivationScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { UploadScreen } from "@/screens/UploadScreen";
import { AnalysisResultsScreen } from "@/screens/AnalysisResultsScreen";
import { CategoriesScreen } from "@/screens/CategoriesScreen";
import { AccountDetailScreen } from "@/screens/AccountDetailScreen";
import { LetterGeneratorScreen } from "@/screens/LetterGeneratorScreen";
import { DisputeTrackerScreen } from "@/screens/DisputeTrackerScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { BootScreen } from "@/screens/BootScreen";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { LicenseLockoutScreen } from "@/screens/LicenseLockoutScreen";
import { UsbLockScreen } from "@/screens/UsbLockScreen";
import { hasCompletedOnboarding, hasCompletedOnboardingAsync, saveProfile, markOnboardingComplete } from "@/services/userProfileService";
import { deriveLicenseState } from "@/services/licenseStateService";
import { scanUsbLicense, validateUsbLicense } from "@/services/usbLicenseService";
import { playSound } from "@/services/soundService";
import { startAppUpdateHeartbeat } from "@/services/appUpdateService";

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppGate />
      </AppProvider>
    </ThemeProvider>
  );
}

type UsbPhase = "checking" | "unlocked" | "locked" | "skipped";

const USB_POLL_MS = 5_000;
const USB_HEARTBEAT_MS = 60_000;

/**
 * Controls the first-launch experience and USB license gating:
 *
 *   boot animation
 *     → USB check (parallel)
 *         → USB found + valid  → main app (+ heartbeat every 5s/60s)
 *         → USB found, invalid → UsbLockScreen (auto-retry every 5s)
 *         → no USB found       → existing keyboard-license flow (unchanged)
 *
 * When a USB key is removed during a session the heartbeat immediately
 * transitions to UsbLockScreen, which polls every 5 s and re-unlocks
 * automatically when the key is reinserted.
 */
function AppGate() {
  const { license, licenseLoaded, setProfile } = useAppContext();
  const [booting, setBooting] = useState(true);
  const [postSignInLoading, setPostSignInLoading] = useState(false);
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding());

  const [usbPhase, setUsbPhase] = useState<UsbPhase>("checking");
  const [usbReason, setUsbReason] = useState<string | undefined>(undefined);
  const [usbRequired, setUsbRequired] = useState(false);
  const [usbDrivesDetected, setUsbDrivesDetected] = useState<string[]>([]);

  const performUsbCheck = useCallback(async () => {
    const scan = await scanUsbLicense();
    setUsbDrivesDetected(scan.drivesDetected ?? []);
    if (!scan.found || !scan.licenseRaw) {
      if (usbRequired) {
        setUsbPhase("locked");
        setUsbReason("Your USB key was removed. Please reinsert it to continue.");
      } else {
        setUsbPhase("skipped");
      }
      return;
    }
    setUsbRequired(true);
    const result = await validateUsbLicense(scan.licenseRaw, scan.driveId);
    if (result.valid) {
      setUsbPhase("unlocked");
      setUsbReason(undefined);
      // Auto-save license holder profile from Keygen so the app shows real name/email
      if (result.userName || result.userEmail) {
        const saved = await saveProfile({
          fullName: result.userName ?? "License Holder",
          email: result.userEmail ?? "",
        });
        setProfile(saved);
      }
      await markOnboardingComplete();
    } else {
      setUsbPhase("locked");
      setUsbReason(result.reason);
    }
  }, [usbRequired, setProfile]);

  useEffect(() => {
    playSound("open");
    const stopUpdateHeartbeat = startAppUpdateHeartbeat();
    hasCompletedOnboardingAsync().then(setOnboarded).catch(() => setOnboarded(false));
    performUsbCheck(); // runs concurrently with the boot animation
    return stopUpdateHeartbeat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleSignOut = () => {
      setBooting(false);
      setPostSignInLoading(false);
      setOnboarded(false);
    };
    window.addEventListener("cra-pro:sign-out", handleSignOut);
    return () => window.removeEventListener("cra-pro:sign-out", handleSignOut);
  }, []);

  // Heartbeat while unlocked: presence check every 5 s, backend every 60 s
  useEffect(() => {
    if (usbPhase !== "unlocked") return;
    let lastBackendCheck = Date.now();

    const interval = setInterval(async () => {
      const scan = await scanUsbLicense();
      if (!scan.found || !scan.licenseRaw) {
        setUsbPhase("locked");
        setUsbReason("Your USB key was removed. Please reinsert it to continue.");
        return;
      }
      if (Date.now() - lastBackendCheck >= USB_HEARTBEAT_MS) {
        lastBackendCheck = Date.now();
        const result = await validateUsbLicense(scan.licenseRaw, scan.driveId);
        if (!result.valid) {
          setUsbPhase("locked");
          setUsbReason(result.reason || "License validation failed.");
        }
      }
    }, USB_POLL_MS);

    return () => clearInterval(interval);
  }, [usbPhase]);

  // Auto-retry every 5 s when locked — detects re-insertion automatically
  useEffect(() => {
    if (usbPhase !== "locked") return;
    const interval = setInterval(performUsbCheck, USB_POLL_MS);
    return () => clearInterval(interval);
  }, [usbPhase, performUsbCheck]);

  // Poll for USB insertion while in "skipped" state (no USB at boot).
  // Transitions to the USB flow automatically if a key is inserted later.
  useEffect(() => {
    if (usbPhase !== "skipped") return;
    const interval = setInterval(async () => {
      const scan = await scanUsbLicense();
      if (!scan.found || !scan.licenseRaw) return;
      setUsbRequired(true);
      const result = await validateUsbLicense(scan.licenseRaw, scan.driveId);
      if (result.valid) {
        setUsbPhase("unlocked");
        setUsbReason(undefined);
        if (result.userName || result.userEmail) {
          const saved = await saveProfile({
            fullName: result.userName ?? "License Holder",
            email: result.userEmail ?? "",
          });
          setProfile(saved);
        }
        await markOnboardingComplete();
      } else {
        setUsbPhase("locked");
        setUsbReason(result.reason);
      }
    }, USB_POLL_MS);
    return () => clearInterval(interval);
  }, [usbPhase, setProfile]);

  // ── Render logic ──────────────────────────────────────────────────────────

  if (booting) {
    return <BootScreen onComplete={() => setBooting(false)} />;
  }

  // USB check is still in flight (normally resolves before the 2.4 s boot)
  if (usbPhase === "checking") {
    return <BootScreen durationMs={600} onComplete={() => {}} />;
  }

  // USB key is present but license is invalid / expired / server unreachable
  if (usbPhase === "locked") {
    return <UsbLockScreen reason={usbReason} drivesDetected={usbDrivesDetected} />;
  }

  // USB key found and validated — go straight to the main app
  if (usbPhase === "unlocked") {
    return <MainAppRoutes />;
  }

  // usbPhase === "skipped" (no USB detected) → existing keyboard-license flow

  if (postSignInLoading) {
    return (
      <BootScreen
        durationMs={1400}
        onComplete={() => setPostSignInLoading(false)}
      />
    );
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        onActivated={() => {
          setPostSignInLoading(true);
          setOnboarded(true);
        }}
      />
    );
  }

  if (!licenseLoaded) {
    return <BootScreen durationMs={600} onComplete={() => {}} />;
  }

  const presentationState = deriveLicenseState(license, { onboarded: true });

  if (
    presentationState === "invalid" ||
    presentationState === "expired" ||
    presentationState === "offline"
  ) {
    return (
      <LicenseLockoutScreen
        state={presentationState}
        onRecovered={() => {
          /* license state in context updates via setLicense already */
        }}
      />
    );
  }

  return <MainAppRoutes />;
}

function MainAppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/activate" element={<LicenseActivationScreen />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/upload" element={<UploadScreen />} />
          <Route path="/analysis" element={<AnalysisResultsScreen />} />
          <Route path="/categories" element={<CategoriesScreen />} />
          <Route path="/accounts/:itemId" element={<AccountDetailScreen />} />
          <Route path="/letters" element={<LetterGeneratorScreen />} />
          <Route path="/tracker" element={<DisputeTrackerScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
