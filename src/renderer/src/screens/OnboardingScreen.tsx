import { useState } from "react";
import { Button } from "@/components/ui";
import {
  ScaleIcon,
  UserDetailIcon,
  MailIcon,
  KeyIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  WifiOffIcon,
} from "@/components/Icons";
import { activateLicense } from "@/services/keygenLicenseService";
import { saveProfile, markOnboardingComplete } from "@/services/userProfileService";
import { playSound } from "@/services/soundService";
import { useAppContext } from "@/context/AppContext";
import type { LicenseInfo } from "@/types";

interface OnboardingScreenProps {
  onActivated: () => void;
}

type ActivationState = "idle" | "activating" | "success" | "invalid" | "offline";

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Premium first-launch onboarding / license activation screen. Collects the
 * user's name, email, and license key, then activates against the existing
 * Keygen/Railway-backed activation logic in keygenLicenseService.ts (which
 * itself calls POST /api/license/activate via apiClient — unchanged).
 *
 * Name and email are stored locally only; they are not sent to the
 * licensing API, which continues to validate strictly by license key +
 * machine fingerprint.
 */
export function OnboardingScreen({ onActivated }: OnboardingScreenProps) {
  const { setLicense, setProfile } = useAppContext();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [state, setState] = useState<ActivationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const nameValid = fullName.trim().length > 1;
  const emailValid = isEmailValid(email);
  const keyValid = licenseKey.trim().length > 0;
  const formValid = nameValid && emailValid && keyValid;

  const handleActivate = async () => {
    setTouched(true);
    if (!formValid || state === "activating") return;

    setState("activating");
    setErrorMessage(null);

    let info: LicenseInfo;
    try {
      info = await activateLicense(licenseKey);
    } catch {
      // activateLicense already catches network errors internally and
      // resolves with an "inactive" LicenseInfo, but guard here too in
      // case of an unexpected throw so the UI never crashes.
      info = {
        key: licenseKey.trim(),
        status: "inactive",
        plan: null,
        activatedAt: null,
        message: "Could not reach the licensing server.",
      };
    }

    setLicense(info);

    if (info.status === "active") {
      const profile = await saveProfile({ fullName: fullName.trim(), email: email.trim() });
      setProfile(profile);
      await markOnboardingComplete();
      setState("success");
      playSound("success");
      setTimeout(onActivated, 850);
      return;
    }

    const offline = /reach|network|fetch|offline|connection/i.test(info.message ?? "");
    setState(offline ? "offline" : "invalid");
    setErrorMessage(info.message ?? "That license key wasn't recognized.");
    playSound("error");
  };

  const loading = state === "activating";

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-grid-glow px-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-skyGlass-400/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-skyGlass-500 to-accentBlue-500 shadow-glowLg">
            <ScaleIcon size={26} className="text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-700">Credit Report Analyzer Pro</h1>
          <p className="mt-1.5 max-w-xs text-[13px] text-slate-500">
            Set up your workspace and activate your license to get started.
          </p>
        </div>

        <div className="glass-panel-strong rounded-2xl p-7 shadow-glowLg">
          <div className="space-y-4">
            <Field
              label="Full name"
              icon={<UserDetailIcon size={16} />}
              value={fullName}
              onChange={setFullName}
              placeholder="Jordan Avery"
              invalid={touched && !nameValid}
              autoFocus
            />
            <Field
              label="Email address"
              icon={<MailIcon size={16} />}
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              invalid={touched && !emailValid}
            />
            <Field
              label="License key"
              icon={<KeyIcon size={16} />}
              value={licenseKey}
              onChange={setLicenseKey}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              invalid={touched && !keyValid}
            />
          </div>

          {state === "success" && (
            <StatusMessage tone="success" icon={<CheckCircleIcon size={15} />}>
              License activated successfully. Loading your workspace...
            </StatusMessage>
          )}
          {state === "invalid" && (
            <StatusMessage tone="error" icon={<AlertTriangleIcon size={15} />}>
              {errorMessage} Please check the key and try again.
            </StatusMessage>
          )}
          {state === "offline" && (
            <StatusMessage tone="error" icon={<WifiOffIcon size={15} />}>
              {errorMessage ?? "Couldn't reach the licensing server. Check your connection and try again."}
            </StatusMessage>
          )}

          <Button
            onClick={handleActivate}
            disabled={loading || state === "success"}
            fullWidth
            size="lg"
            className="mt-6"
            hoverText="Enter App"
          >
            {loading ? "Activating..." : "Activate License"}
          </Button>

          <p className="mx-auto mt-4 max-w-[17rem] text-center text-[11.5px] leading-relaxed text-slate-400">
            Licensing powered by Keygen. Use the license key provided with your purchase.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
          Research-informed dispute recommendations — not legal advice. Bureau responses, approvals,
          score changes, and funding outcomes can vary.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
  autoFocus,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          autoFocus={autoFocus}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={[
            "w-full rounded-xl border bg-white/58 py-3 pl-10 pr-3.5 text-[13.5px] text-slate-700 placeholder:text-slate-400 shadow-soft focus-ring transition-smooth",
            invalid
              ? "border-danger-500/50 focus:border-danger-500/60"
              : "border-white/70 focus:border-skyGlass-400/60",
          ].join(" ")}
        />
      </div>
    </div>
  );
}

function StatusMessage({
  tone,
  icon,
  children,
}: {
  tone: "success" | "error";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "mt-4 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px]",
        tone === "success" ? "bg-brand-500/10 text-brand-400" : "bg-danger-500/10 text-danger-400",
      ].join(" ")}
    >
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
