import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { KeyIcon, ScaleIcon, CheckCircleIcon, AlertTriangleIcon } from "@/components/Icons";
import { activateLicense } from "@/services/keygenLicenseService";
import { useAppContext } from "@/context/AppContext";
import { playSound } from "@/services/soundService";

export function LicenseActivationScreen() {
  const navigate = useNavigate();
  const { setLicense } = useAppContext();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const handleActivate = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setResult(null);
    const info = await activateLicense(key);
    setLicense(info);
    setLoading(false);
    if (info.status === "active") {
      setResult("success");
      playSound("success");
      setTimeout(() => navigate("/"), 900);
    } else {
      setResult("error");
      playSound("error");
    }
  };


  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-grid-glow px-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-skyGlass-400/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-skyGlass-500 to-accentBlue-500 shadow-glowLg">
            <ScaleIcon size={26} className="text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-700">Credit Report Analyzer Pro</h1>
          <p className="mt-1.5 text-[13.5px] text-slate-500">
            Activate your license to unlock dispute assistance tools
          </p>
        </div>

        <div className="glass-panel-strong rounded-2xl p-7 shadow-glowLg">
          <label className="mb-2 block text-[12.5px] font-semibold text-slate-500">
            License key
          </label>
          <div className="relative">
            <KeyIcon
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full rounded-xl border border-white/70 bg-white/58 py-3 pl-10 pr-3.5 text-[13.5px] text-slate-700 placeholder:text-slate-400 shadow-soft focus-ring focus:border-skyGlass-400/60"
            />
          </div>

          {result === "success" && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-500/10 px-3.5 py-2.5 text-[12.5px] text-brand-400">
              <CheckCircleIcon size={15} />
              License activated successfully. Redirecting...
            </div>
          )}
          {result === "error" && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-danger-500/10 px-3.5 py-2.5 text-[12.5px] text-danger-400">
              <AlertTriangleIcon size={15} />
              That key wasn't recognized. Please check the key and try again.
            </div>
          )}

          <Button
            onClick={handleActivate}
            disabled={loading || !key.trim()}
            fullWidth
            size="lg"
            className="mt-5"
            hoverText="Unlock"
          >
            {loading ? "Activating..." : "Activate License"}
          </Button>

        </div>

        <p className="mx-auto mt-6 max-w-[17rem] text-center text-[11.5px] leading-relaxed text-slate-400">
          Licensing powered by Keygen. Use the license key provided with your purchase.
        </p>
      </div>
    </div>
  );
}
