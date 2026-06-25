import { useState, type ReactNode } from "react";
import { Card, CardHeader, Badge, Button } from "@/components/ui";
import { MailIcon, KeyIcon, UserDetailIcon, SparklesIcon, PhoneIcon, HomeIcon, EditIcon, CheckCircleIcon, TrashIcon } from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { clearProfile, resetOnboarding, saveProfile } from "@/services/userProfileService";
import { deactivateLicense } from "@/services/keygenLicenseService";
import { resetLocalDatabase } from "@/services/databaseService";
import { forgetUsbValidation } from "@/services/usbLicenseService";
import { playSound } from "@/services/soundService";

const SUPPORT_EMAIL = "support@creditreportanalyzerpro.com";

export function SettingsScreen() {
  const { profile, activeClient, license, setLicense, setProfile, refreshClients } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [stateAbbr, setStateAbbr] = useState(profile?.state ?? "");
  const [zip, setZip] = useState(profile?.zip ?? "");

  const licensePreview = formatLicensePreview(license.key);

  const handleSaveProfile = async () => {
    const updated = await saveProfile({
      fullName: fullName.trim() || (profile?.fullName ?? ""),
      email: email.trim() || (profile?.email ?? ""),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: stateAbbr.trim() || undefined,
      zip: zip.trim() || undefined,
    });
    setProfile(updated);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    playSound("success");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card glow>
        <CardHeader
          title="User Account"
          action={
            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-[12px] font-semibold text-brand-400">
                  <CheckCircleIcon size={13} /> Saved
                </span>
              )}
              <Badge tone={license.status === "active" ? "brand" : "warning"}>
                {license.status === "active" ? "Active" : "Inactive"}
              </Badge>
              <Button variant="secondary" onClick={() => { setEditing((e) => !e); setSaved(false); }}>
                <EditIcon size={14} /> {editing ? "Cancel" : "Edit Info"}
              </Button>
            </div>
          }
        />

        {!editing ? (
          <div className="space-y-3">
            <AccountRow icon={<UserDetailIcon size={17} />} label="Name" value={profile?.fullName || activeClient?.fullName || "—"} />
            <AccountRow icon={<MailIcon size={17} />} label="Email" value={profile?.email || activeClient?.email || "—"} />
            <AccountRow icon={<PhoneIcon size={17} />} label="Phone" value={profile?.phone || "Not set"} />
            <AccountRow icon={<HomeIcon size={17} />} label="Address" value={[profile?.address, profile?.city, profile?.state, profile?.zip].filter(Boolean).join(", ") || "Not set"} />
            <AccountRow icon={<KeyIcon size={17} />} label="License" value={licensePreview} />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[12px] text-slate-500">Your contact info is used to pre-fill dispute letters. Nothing is uploaded — stored locally only.</p>
            <div className="space-y-3">
              <EditField label="Full legal name" value={fullName} onChange={setFullName} placeholder="Jordan Avery" />
              <EditField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
              <EditField label="Phone number" value={phone} onChange={setPhone} placeholder="(555) 000-0000" type="tel" />
              <EditField label="Street address" value={address} onChange={setAddress} placeholder="1234 Main St" />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <EditField label="City" value={city} onChange={setCity} placeholder="Springfield" />
                </div>
                <div className="col-span-1">
                  <EditField label="State" value={stateAbbr} onChange={setStateAbbr} placeholder="CA" />
                </div>
                <div className="col-span-1">
                  <EditField label="ZIP" value={zip} onChange={setZip} placeholder="90210" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSaveProfile}>Save Changes</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
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
          <Button onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Credit%20Analyzer%20Support%20Request`; }} variant="secondary">
            Contact Us For Help
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-slate-700">Start over</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
              Clear all local app data, including saved reports, letters, dispute cases, profile, license, and USB validation cache.
            </p>
          </div>
          <Button variant="danger" onClick={handleClearAllData} disabled={clearingAll} icon={<TrashIcon size={15} />}>
            {clearingAll ? "Clearing..." : "Clear All"}
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
          <Button variant="danger" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </Card>
    </div>
  );

  async function handleSignOut() {
    await clearProfile();
    await resetOnboarding();
    await deactivateLicense();
    setProfile(null);
    setLicense({ key: null, status: "inactive", plan: null, activatedAt: null, message: "Signed out on this device." });
    playSound("click");
    window.dispatchEvent(new Event("cra-pro:sign-out"));
  }

  async function handleClearAllData() {
    const confirmed = window.confirm(
      "Clear all local app data on this device? This removes saved reports, letters, dispute cases, profile, license, and USB validation cache."
    );
    if (!confirmed) return;

    setClearingAll(true);
    try {
      await Promise.all([
        resetLocalDatabase(),
        clearProfile(),
        resetOnboarding(),
        deactivateLicense(),
        forgetUsbValidation(),
      ]);
      setProfile(null);
      setLicense({ key: null, status: "inactive", plan: null, activatedAt: null, message: "All local app data was cleared." });
      await refreshClients();
      setEditing(false);
      playSound("success");
      if (window.electronAPI?.reloadApp) {
        await window.electronAPI.reloadApp();
      } else {
        window.location.reload();
      }
    } finally {
      setClearingAll(false);
    }
  }
}

function AccountRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/55 px-4 py-3.5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-skyGlass-500/12 text-skyGlass-700">{icon}</div>
        <span className="text-[12.5px] font-semibold text-slate-500">{label}</span>
      </div>
      <span className="truncate text-right text-[13px] font-bold text-slate-700">{value}</span>
    </div>
  );
}

function EditField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/70 bg-white/70 px-3.5 py-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 shadow-soft focus-ring transition-smooth"
      />
    </div>
  );
}

function formatLicensePreview(key: string | null): string {
  if (!key) return "No license saved";
  const firstFour = key.replace(/\s+/g, "").slice(0, 4).toUpperCase();
  return `${firstFour}••••••••`;
}
