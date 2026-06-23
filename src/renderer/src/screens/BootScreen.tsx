import { useEffect, useState } from "react";

const STEPS = [
  "Initializing analyzer...",
  "Checking license...",
  "Loading secure workspace...",
];

interface BootScreenProps {
  /** Called once the boot animation has finished. */
  onComplete: () => void;
  /** Total duration in ms. Kept short — this is a feel-good flourish, not a real wait. */
  durationMs?: number;
}

/**
 * High-end animated boot sequence shown once per app launch, before the
 * license-activation/onboarding screen or dashboard. Purely presentational —
 * it does not perform real license checks itself (that still happens in
 * keygenLicenseService / AppContext); the step text is just a premium
 * progress narrative while the app gets ready.
 */
export function BootScreen({ onComplete, durationMs = 2400 }: BootScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const stepDuration = durationMs / STEPS.length;
    const stepTimers = STEPS.map((_, i) =>
      setTimeout(() => setStepIndex(i), Math.round(i * stepDuration))
    );

    const progressStart = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - progressStart;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
    }, 30);

    const exitTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 380);
    }, durationMs);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearInterval(progressTimer);
      clearTimeout(exitTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  return (
    <div
      className={[
        "fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-grid-glow transition-smooth",
        exiting ? "opacity-0" : "opacity-100",
      ].join(" ")}
      style={{ transitionDuration: "380ms" }}
    >
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-neon-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-neon-600/15 blur-3xl" />

      <div className="relative flex flex-col items-center">
        {/* From Uiverse.io by anand_4957 — adapted to the Luma glass theme */}
        <div className="luma-speeder-shell mb-8" aria-hidden="true">
          <div className="loader">
            <span><span></span><span></span><span></span><span></span></span>
            <div className="base">
              <span></span>
              <div className="face"></div>
            </div>
          </div>
          <div className="longfazers">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>

        <h1 className="text-center text-[20px] font-bold tracking-tight text-slate-700">
          Credit Report <span className="text-skyGlass-700">Analyzer Pro</span>
        </h1>
        <p className="mt-1.5 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-skyGlass-700/80">
          Powered By Luma Intelligence
        </p>

        {/* Progress bar */}
        <div className="mt-8 h-1.5 w-64 overflow-hidden rounded-full soft-inset">
          <div
            className="h-full rounded-full bg-gradient-to-r from-skyGlass-500 to-accentBlue-400 shadow-glowSm transition-all"
            style={{ width: `${progress}%`, transitionDuration: "120ms" }}
          />
        </div>

        <p key={stepIndex} className="mt-4 animate-fade-in text-[12.5px] text-slate-500">
          {STEPS[stepIndex]}
        </p>
      </div>

      <p className="absolute bottom-8 text-[10.5px] text-slate-400">
        Powered By Luma Intelligence &middot; Secured locally on this device
      </p>
    </div>
  );
}
