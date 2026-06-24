/// <reference types="vite/client" />

interface ElectronAPI {
  selectPdfFile: () => Promise<{ filePath: string; fileName: string; fileSize?: number } | null>;
  extractPdfText: (filePath: string) => Promise<string>;
  getMachineFingerprint: () => Promise<string>;
  getMachineName: () => Promise<string>;
  getAppVersion: () => Promise<{ version: string; platform: string }>;
  reloadApp: () => Promise<boolean>;
  apiRequest: (input: {
    url: string;
    method?: string;
    body?: unknown;
  }) => Promise<{ ok: boolean; status: number; data: unknown }>;
  scanUsbLicense: () => Promise<{ found: boolean; licenseRaw: string | null; driveId: string | null }>;
  secureStore: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<boolean>;
    remove: (key: string) => Promise<boolean>;
  };
  platform: string;
  isElectron: boolean;
}

interface Window {
  electronAPI?: ElectronAPI;
}
