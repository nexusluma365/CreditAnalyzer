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
  apiRequest: (input: { url: string; method?: string; body?: unknown }) =>
    ipcRenderer.invoke("api:request", input),
  secureStore: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke("secureStore:get", key),
    set: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke("secureStore:set", key, value),
    remove: (key: string): Promise<boolean> => ipcRenderer.invoke("secureStore:remove", key),
  },
  platform: process.platform,
  isElectron: true,
});
