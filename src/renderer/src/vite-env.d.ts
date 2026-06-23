/// <reference types="vite/client" />

interface ElectronAPI {
  selectPdfFile: () => Promise<{ filePath: string; fileName: string; fileSize?: number } | null>;
  extractPdfText: (filePath: string) => Promise<string>;
  getMachineFingerprint: () => Promise<string>;
  getMachineName: () => Promise<string>;
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
