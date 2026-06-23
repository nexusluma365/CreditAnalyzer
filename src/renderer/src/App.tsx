import { useEffect, useState } from "react";
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
import { hasCompletedOnboarding, hasCompletedOnboardingAsync } from "@/services/userProfileService";
import { deriveLicenseState } from "@/services/licenseStateService";
import { playSound } from "@/services/soundService";

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppGate />
      </AppProvider>
    </ThemeProvider>
  );
}

/**
 * Controls the first-launch experience:
 *   boot animation -> onboarding (if never activated on this device)
 *                  -> license lockout (if a previously-activated license is
 *                     now invalid/expired/unreachable)
 *                  -> normal routed app (unchanged below)
 *
 * This sits above HashRouter so the app routes remain untouched once the
 * gate passes.
 */
function AppGate() {
  const { license, licenseLoaded } = useAppContext();
  const [booting, setBooting] = useState(true);
  const [postSignInLoading, setPostSignInLoading] = useState(false);
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding());

  useEffect(() => {
    playSound("open");
    hasCompletedOnboardingAsync().then(setOnboarded).catch(() => setOnboarded(false));
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

  if (booting) {
    return <BootScreen onComplete={() => setBooting(false)} />;
  }

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

  // Once onboarded, wait for the real stored/validated license before
  // deciding whether to lock the app out — avoids briefly flashing the
  // dashboard (or a lockout screen) based on the default "trial" state
  // while getStoredLicense() is still resolving.
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
