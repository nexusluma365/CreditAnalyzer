import { ScaleIcon, LockIcon, AlertTriangleIcon } from "@/components/Icons";

interface UsbLockScreenProps {
  reason?: string;
  drivesDetected?: string[];
}

/**
 * Shown when the USB license dongle is missing, invalid, or has failed
 * a backend validation check. Polls silently in the background (via
 * AppGate) and unlocks automatically once a valid USB key is detected.
 */
export function UsbLockScreen({ reason, drivesDetected }: UsbLockScreenProps) {
  const driveFound = drivesDetected && drivesDetected.length > 0;
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
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
              <LockIcon size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-700">USB Key Required</h2>
            </div>
          </div>

          <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
            {driveFound
              ? "A USB drive was detected but no license file was found on it. Make sure your Credit Analyzer USB key has a license file."
              : "Please plug in your Credit Analyzer USB key to continue."}
          </p>

          {reason && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-500/10 px-3.5 py-2.5 text-[12.5px] text-danger-400">
              <AlertTriangleIcon size={15} className="flex-shrink-0" />
              <span>{reason}</span>
            </div>
          )}

          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-skyGlass-500/10 px-3.5 py-2.5 text-[12.5px] text-skyGlass-700">
            <span className="inline-block h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-skyGlass-500" />
            Waiting for USB key...
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Insert your USB key and the app will unlock automatically.
        </p>
      </div>
    </div>
  );
}
