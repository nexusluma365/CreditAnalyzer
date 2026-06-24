import type { ReactNode } from "react";
import { Card, CardHeader, Badge, Button } from "@/components/ui";
import { MailIcon, KeyIcon, UserDetailIcon, SparklesIcon } from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { clearProfile, resetOnboarding } from "@/services/userProfileService";
import { deactivateLicense } from "@/services/keygenLicenseService";
import { playSound } from "@/services/soundService";

const SUPPORT_EMAIL = "support@creditreportanalyzerpro.com";

export function SettingsScreen() {
  const { profile, activeClient, license, setLicense, setProfile } = useAppContext();
  const name = profile?.fullName?.trim() || activeClient?.fullName || "Default User";
  const email = profile?.email || activeClient?.email || "No email saved";
  const licensePreview = formatLicensePreview(license.key);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card glow>
        <CardHeader
          title="User Account"
          action={
            <Badge tone={license.status === "active" ? "brand" : "warning"}>
              {license.status === "active" ? "Active" : "Inactive"}
            </Badge>
          }
        />

        <div className="space-y-3">
          <AccountRow
            icon={<UserDetailIcon size={17} />}
            label="Name"
            value={name}
          />
          <AccountRow
            icon={<MailIcon size={17} />}
            label="Email"
            value={email}
          />
          <AccountRow
            icon={<KeyIcon size={17} />}
            label="License"
            value={licensePreview}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-skyGlass-500/15 text-skyGlass-700">
              <SparklesIcon size={18} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-700">Need help?</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
                Contact support for activation help, account questions, or app troubleshooting.
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Credit%20Analyzer%20Support%20Request`;
            }}
            variant="secondary"
          >
            Contact Us For Help
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-slate-700">Sign out</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
              This clears the local account profile and returns to the sign-in screen on this device.
            </p>
          </div>

          <Button variant="danger" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );

  async function handleSignOut() {
    await clearProfile();
    await resetOnboarding();
    await deactivateLicense();
    setProfile(null);
    setLicense({
      key: null,
      status: "inactive",
      plan: null,
      activatedAt: null,
      message: "Signed out on this device.",
    });
    playSound("click");
    window.dispatchEvent(new Event("cra-pro:sign-out"));
  }
}

function AccountRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/55 px-4 py-3.5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-skyGlass-500/12 text-skyGlass-700">
          {icon}
        </div>
        <span className="text-[12.5px] font-semibold text-slate-500">{label}</span>
      </div>
      <span className="truncate text-right text-[13px] font-bold text-slate-700">{value}</span>
    </div>
  );
}

function formatLicensePreview(key: string | null): string {
  if (!key) return "No license saved";
  const firstFour = key.replace(/\s+/g, "").slice(0, 4).toUpperCase();
  return `${firstFour}••••••••`;
}
