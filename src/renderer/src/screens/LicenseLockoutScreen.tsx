import { useState } from "react";
import { Button } from "@/components/ui";
import {
  ScaleIcon,
  KeyIcon,
  AlertTriangleIcon,
  WifiOffIcon,
  CheckCircleIcon,
} from "@/components/Icons";
import { activateLicense } from "@/services/keygenLicenseService";
import { playSound } from "@/services/soundService";
import { useAppContext } from "@/context/AppContext";
import type { LicensePresentationState } from "@/services/licenseStateService";

interface LicenseLockoutScreenProps {
  state: "invalid" | "expired" | "offline";
  onRecovered: () => void;
}

const COPY: Record<
  "invalid" | "expired" | "offline",
  { title: string; description: string }
> = {
  invalid: {
    title: "License not recognized",
    description:
      "Your license key couldn't be validated. Re-enter it below, or contact support if you believe this is a mistake.",
  },
  expired: {
    title: "Subscription expired",
    description:
      "Your license has expired. Renew or enter a new license key to keep using Credit Report Analyzer Pro.",
  },
  offline: {
    title: "Can't reach the licensing server",
    description:
      "We couldn't verify your license because the server is unreachable. Check your connection and try again.",
  },
};

/**
 * Shown instead of the main app shell when a previously-onboarded user's
 * license becomes invalid, expired, or unverifiable (offline). Locks the
 * app behind a clean renewal/re-activation screen rather than crashing or
 * silently letting them in.
 */
export function LicenseLockoutScreen({ state, onRecovered }: LicenseLockoutScreenProps) {
  const { setLicense } = useAppContext();
  const [licenseKey, setLicenseKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [localState, setLocalState] = useState<LicensePresentationState>(state);
  const [message, setMessage] = useState<string | null>(null);

  const copy = COPY[state];

  const handleRetry = async () => {
    if (!licenseKey.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    const info = await activateLicense(licenseKey);
    setLicense(info);
    setBusy(false);

    if (info.status === "active") {
      setLocalState("activated");
      playSound("success");
      setTimeout(onRecovered, 700);
      return;
    }

    const offline = /reach|network|fetch|offline|connection/i.test(info.message ?? "");
    setLocalState(offline ? "offline" : "invalid");
    setMessage(info.message ?? "That license key wasn't recognized.");
    playSound("error");
  };

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-grid-glow px-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-skyGlass-400/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-skyGlass-500 to-accentBlue-500 shadow-glowLg">
            <ScaleIcon size={26} className="text-white" />
          </div>
          <h1 className="text-[20px] font-bold text-slate-700">Credit Report Analyzer Pro</h1>
        </div>

        <div className="glass-panel-strong rounded-2xl p-7 shadow-glowLg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-danger-500/15 text-danger-400">
              {localState === "offline" ? <WifiOffIcon size={18} /> : <AlertTriangleIcon size={18} />}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-700">{copy.title}</h2>
            </div>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">{copy.description}</p>

          <div className="mt-5">
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-500">
              License key
            </label>
            <div className="relative">
              <KeyIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full rounded-xl border border-white/70 bg-white/58 py-3 pl-10 pr-3.5 text-[13.5px] text-slate-700 placeholder:text-slate-400 shadow-soft focus-ring focus:border-skyGlass-400/60"
              />
            </div>
          </div>

          {localState === "activated" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-500/10 px-3.5 py-2.5 text-[12.5px] text-brand-400">
              <CheckCircleIcon size={15} /> License restored. Loading your workspace...
            </div>
          )}
          {message && localState !== "activated" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-500/10 px-3.5 py-2.5 text-[12.5px] text-danger-400">
              <AlertTriangleIcon size={15} /> {message}
            </div>
          )}

          <Button
            onClick={handleRetry}
            disabled={busy || !licenseKey.trim() || localState === "activated"}
            fullWidth
            size="lg"
            className="mt-5"
            hoverText="Try Again"
          >
            {busy ? "Validating..." : "Retry Activation"}
          </Button>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Need help? Contact support with your license key and this device's name.
        </p>
      </div>
    </div>
  );
}
