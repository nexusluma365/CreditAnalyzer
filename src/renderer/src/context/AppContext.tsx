import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Client, LicenseInfo } from "@/types";
import { DEFAULT_CLIENT_ID, getClients } from "@/services/databaseService";
import { getStoredLicense } from "@/services/keygenLicenseService";
import { getStoredProfile, getStoredProfileAsync, type UserProfile } from "@/services/userProfileService";

interface AppContextValue {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  activeClientId: string;
  setActiveClientId: (id: string) => void;
  activeClient: Client | undefined;
  businessModeEnabled: boolean;
  setBusinessModeEnabled: (enabled: boolean) => void;
  license: LicenseInfo;
  setLicense: (license: LicenseInfo) => void;
  licenseLoaded: boolean;
  refreshClients: () => Promise<void>;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string>(DEFAULT_CLIENT_ID);
  const [businessModeEnabled, setBusinessModeEnabled] = useState(false);
  const [license, setLicense] = useState<LicenseInfo>({
    key: null,
    status: "inactive",
    plan: null,
    activatedAt: null,
    message: "No license has been activated on this device.",
  });
  const [licenseLoaded, setLicenseLoaded] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(() => getStoredProfile());

  const refreshClients = async () => {
    const list = await getClients();
    setClients(list);
    if (!list.some((client) => client.id === activeClientId)) {
      setActiveClientId(list[0]?.id ?? DEFAULT_CLIENT_ID);
    }
  };

  useEffect(() => {
    refreshClients();
    getStoredProfileAsync().then(setProfile).catch(() => setProfile(null));
    getStoredLicense()
      .then(setLicense)
      .finally(() => setLicenseLoaded(true));
  }, []);

  const activeClient = clients.find((c) => c.id === activeClientId);

  return (
    <AppContext.Provider
      value={{
        clients,
        setClients,
        activeClientId,
        setActiveClientId,
        activeClient,
        businessModeEnabled,
        setBusinessModeEnabled,
        license,
        setLicense,
        licenseLoaded,
        refreshClients,
        profile,
        setProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
