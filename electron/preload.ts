import { contextBridge, ipcRenderer } from "electron";

export interface SelectedPdfFile {
  filePath: string;
  fileName: string;
  fileSize?: number;
}

contextBridge.exposeInMainWorld("electronAPI", {
  selectPdfFile: (): Promise<SelectedPdfFile | null> => ipcRenderer.invoke("dialog:selectPdf"),
  extractPdfText: (filePath: string): Promise<string> => ipcRenderer.invoke("pdf:extractText", filePath),
  getMachineFingerprint: (): Promise<string> => ipcRenderer.invoke("machine:fingerprint"),
  getMachineName: (): Promise<string> => ipcRenderer.invoke("machine:name"),
  getAppVersion: (): Promise<{ version: string; platform: string }> => ipcRenderer.invoke("app:version"),
  reloadApp: (): Promise<boolean> => ipcRenderer.invoke("app:reload"),
  apiRequest: (input: { url: string; method?: string; body?: unknown }) =>
    ipcRenderer.invoke("api:request", input),
  scanUsbLicense: (): Promise<{ found: boolean; licenseRaw: string | null; driveId: string | null }> =>
    ipcRenderer.invoke("usb:scan"),
  secureStore: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke("secureStore:get", key),
    set: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke("secureStore:set", key, value),
    remove: (key: string): Promise<boolean> => ipcRenderer.invoke("secureStore:remove", key),
  },
  platform: process.platform,
  isElectron: true,
});
