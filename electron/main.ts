import { app, BrowserWindow, ipcMain, dialog, safeStorage, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import zlib from "node:zlib";
import pdfParse from "pdf-parse";

const USB_LICENSE_PATH = path.join(".credit-key", "license.dat");
const USB_LICENSE_FILENAMES = new Set([
  "license.dat",
  "license.json",
  "licens.json",
  ".license.json",
  ".licens.json",
  "credit-license.json",
  ".credit-license.json",
]);
const USB_LICENSE_DIRS = new Set([".credit-key", "credit-key", ".license", "license"]);
const USB_SCAN_DEPTH = 3;

const isDev = process.env.NODE_ENV === "development";
let mainWindow: BrowserWindow | null = null;
let updateInstallInProgress = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    backgroundColor: "#101218",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dialog:selectPdf", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select a credit report PDF",
    properties: ["openFile"],
    filters: [{ name: "PDF Documents", extensions: ["pdf"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const stat = await fs.stat(filePath).catch(() => null);
  return { filePath, fileName: path.basename(filePath), fileSize: stat?.size ?? undefined };
});

ipcMain.handle("pdf:extractText", async (_event, filePath: string) => {
  if (!filePath || !filePath.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please select a PDF file.");
  }
  const buffer = await fs.readFile(filePath);
  return extractTextFromPdfBuffer(buffer);
});

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // Primary: use pdf-parse (Mozilla PDF.js — handles all standard PDF structures)
  try {
    const result = await pdfParse(buffer, { max: 0 });
    const text = cleanExtractedText(result.text ?? "");
    if (text.length >= 40) return text.slice(0, 180000);
  } catch { /* fall through to manual extractor */ }

  // Fallback: manual zlib + text-operator extractor for unusual PDFs
  const manual = extractTextManual(buffer);
  if (manual.length >= 40) return manual;

  throw new Error(
    "Unable to extract text from this PDF. This can happen with scanned, image-only, encrypted, or heavily styled PDFs. " +
    "Please try exporting a fresh copy of your credit report as a text-based PDF from your bureau's website " +
    "(Experian, Equifax, or TransUnion), then re-upload."
  );
}

ipcMain.handle("machine:fingerprint", async () => getMachineFingerprint());
ipcMain.handle("machine:name", async () => `${os.hostname()} (${process.platform})`);
ipcMain.handle("app:version", async () => ({
  version: app.getVersion(),
  platform: process.platform,
}));
ipcMain.handle("app:reload", async () => {
  mainWindow?.webContents.reloadIgnoringCache();
  return true;
});
ipcMain.handle(
  "app:updateAndInstall",
  async (_event, input: { downloadUrl: string; latestVersion: string }) =>
    downloadAndLaunchInstaller(input)
);

ipcMain.handle("usb:scan", async () => {
  const drives = await getRemovableDrivePaths();
  for (const drivePath of drives) {
    const licenseRaw = await findUsbLicenseValue(drivePath);
    if (licenseRaw) {
      return { found: true, licenseRaw, driveId: drivePath, drivesDetected: drives };
    }
  }
  // Return drives list even when no license file found so the UI can distinguish
  // "no USB plugged in" from "USB present but missing license file".
  return { found: false, licenseRaw: null, driveId: null, drivesDetected: drives };
});

ipcMain.handle("secureStore:get", async (_event, key: string) => readSecureValue(key));
ipcMain.handle("secureStore:set", async (_event, key: string, value: string) => writeSecureValue(key, value));
ipcMain.handle("secureStore:remove", async (_event, key: string) => removeSecureValue(key));
ipcMain.handle(
  "api:request",
  async (_event, input: { url: string; method?: string; body?: unknown }) => {
    const url = new URL(input.url);
    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Unsupported API URL protocol.");
    }

    const response = await fetch(url, {
      method: input.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
    });
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    return { ok: response.ok, status: response.status, data };
  }
);

async function downloadAndLaunchInstaller(input: { downloadUrl: string; latestVersion: string }) {
  if (isDev) {
    return { ok: false, message: "Auto-install updates are disabled in development." };
  }
  if (updateInstallInProgress) {
    return { ok: true, message: "An update is already downloading." };
  }

  const url = new URL(input.downloadUrl);
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Unsupported update URL protocol.");
  }

  updateInstallInProgress = true;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Update download failed (${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const updateDir = path.join(app.getPath("userData"), "updates");
    await fs.mkdir(updateDir, { recursive: true });
    const installerPath = path.join(
      updateDir,
      `CreditAnalyzer-${sanitizeFilePart(input.latestVersion || app.getVersion())}${installerExtension(url)}`
    );
    await fs.writeFile(installerPath, Buffer.from(arrayBuffer));
    const openError = await shell.openPath(installerPath);
    if (openError) throw new Error(openError);
    setTimeout(() => app.quit(), 2500);
    return { ok: true, message: "Update installer launched. The app will close so the update can finish." };
  } catch (error) {
    updateInstallInProgress = false;
    throw error;
  }
}

function installerExtension(url: URL): string {
  const ext = path.extname(url.pathname);
  if (ext) return ext;
  if (process.platform === "win32") return ".exe";
  if (process.platform === "darwin") return ".dmg";
  return ".bin";
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "update";
}

async function getRemovableDrivePaths(): Promise<string[]> {
  const candidates: string[] = [];
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS: /Volumes contains all mounted volumes; skip well-known system ones
    const systemVolumes = new Set([
      "Macintosh HD", "Macintosh HD - Data", "Recovery",
      "Preboot", "VM", "Update", "xarts", "hardware",
    ]);
    try {
      const entries = await fs.readdir("/Volumes");
      for (const entry of entries) {
        if (!systemVolumes.has(entry) && !entry.startsWith(".")) {
          candidates.push(`/Volumes/${entry}`);
        }
      }
    } catch { /* /Volumes inaccessible */ }

  } else if (platform === "win32") {
    // Windows: probe drive letters D–Z (A/B are floppy, C is system)
    for (const letter of "DEFGHIJKLMNOPQRSTUVWXYZ") {
      const drivePath = `${letter}:\\`;
      if (existsSync(drivePath)) candidates.push(drivePath);
    }

  } else {
    // Linux: check /media/<user>/*, /media/*, /mnt/*, /run/media/*
    const username = os.userInfo().username;
    const bases = [`/media/${username}`, "/media", "/mnt", "/run/media"];
    for (const base of bases) {
      try {
        const entries = await fs.readdir(base);
        for (const entry of entries) {
          const full = path.join(base, entry);
          try {
            const stat = await fs.stat(full);
            if (stat.isDirectory()) candidates.push(full);
          } catch { /* stat failed */ }
        }
      } catch { /* base not present */ }
    }
  }

  return candidates;
}

async function findUsbLicenseValue(drivePath: string): Promise<string | null> {
  const directPaths = [
    path.join(drivePath, USB_LICENSE_PATH),
    path.join(drivePath, ".credit-key", "license.json"),
    path.join(drivePath, ".credit-key", "licens.json"),
    path.join(drivePath, "license.json"),
    path.join(drivePath, "licens.json"),
    path.join(drivePath, ".license.json"),
    path.join(drivePath, ".licens.json"),
  ];

  for (const filePath of directPaths) {
    const key = readLicenseFile(filePath);
    if (key) return key;
  }

  return scanLicenseTree(drivePath, 0);
}

async function scanLicenseTree(dirPath: string, depth: number): Promise<string | null> {
  if (depth > USB_SCAN_DEPTH) return null;
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dirPath);
  } catch {
    return null;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const lower = entry.toLowerCase();
    if (USB_LICENSE_FILENAMES.has(lower)) {
      const key = readLicenseFile(fullPath);
      if (key) return key;
    }
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const lower = entry.toLowerCase();
    if (depth > 0 && !USB_LICENSE_DIRS.has(lower) && !lower.includes("license") && !lower.includes("licens")) {
      continue;
    }
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) continue;
      const key = await scanLicenseTree(fullPath, depth + 1);
      if (key) return key;
    } catch {
      // Ignore unreadable hidden/system folders on removable media.
    }
  }

  return null;
}

function readLicenseFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf8").trim();
    if (!raw) return null;
    if (filePath.toLowerCase().endsWith(".json")) {
      return extractLicenseFromJson(raw);
    }
    return raw;
  } catch {
    return null;
  }
}

function extractLicenseFromJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    return findLicenseString(parsed);
  } catch {
    return raw.length > 16 ? raw : null;
  }
}

function findLicenseString(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const preferredKeys = ["licenseKey", "license_key", "key", "license", "activationKey", "activation_key"];
  for (const key of preferredKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim().length > 8) return candidate.trim();
  }
  for (const child of Object.values(record)) {
    if (typeof child === "object") {
      const nested = findLicenseString(child);
      if (nested) return nested;
    }
  }
  return null;
}

function getStorageDir() {
  const dir = path.join(app.getPath("userData"), "secure-store");
  return dir;
}

function safeKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex") + ".bin";
}

function getStorePath(key: string) {
  return path.join(getStorageDir(), safeKey(key));
}

async function writeSecureValue(key: string, value: string) {
  await fs.mkdir(getStorageDir(), { recursive: true });
  const encrypted = encryptString(value);
  await fs.writeFile(getStorePath(key), encrypted);
  return true;
}

async function readSecureValue(key: string) {
  const filePath = getStorePath(key);
  if (!existsSync(filePath)) return null;
  const payload = await fs.readFile(filePath);
  return decryptString(payload);
}

async function removeSecureValue(key: string) {
  await fs.rm(getStorePath(key), { force: true });
  return true;
}

function encryptString(value: string): Buffer {
  const plain = Buffer.from(value, "utf8");
  if (safeStorage.isEncryptionAvailable()) {
    return Buffer.concat([Buffer.from("SAFE1:"), safeStorage.encryptString(value)]);
  }
  const key = fallbackEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("GCM1:"), iv, tag, encrypted]);
}

function decryptString(payload: Buffer): string | null {
  try {
    const prefix = payload.subarray(0, 6).toString("utf8");
    const body = payload.subarray(6);
    if (prefix === "SAFE1:") return safeStorage.decryptString(body);
    if (prefix === "GCM1:") {
      const iv = body.subarray(0, 12);
      const tag = body.subarray(12, 28);
      const encrypted = body.subarray(28);
      const decipher = crypto.createDecipheriv("aes-256-gcm", fallbackEncryptionKey(), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    }
    return null;
  } catch {
    return null;
  }
}

function fallbackEncryptionKey() {
  return crypto
    .createHash("sha256")
    .update([app.getName(), app.getPath("userData"), os.hostname(), os.userInfo().username].join("|"))
    .digest();
}

function getMachineFingerprint() {
  const parts = [
    app.getName(),
    process.platform,
    os.arch(),
    os.hostname(),
    os.userInfo().username,
    os.cpus()?.[0]?.model ?? "cpu",
    os.totalmem().toString(),
  ];
  return `cra-${crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 48)}`;
}

function extractTextManual(buffer: Buffer): string {
  const chunks: string[] = [];
  const raw = buffer.toString("latin1");

  // Try plain text operators in the raw (uncompressed) body first.
  chunks.push(...decodePdfTextOperators(raw));

  // Parse each content stream and try every decompression strategy.
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw))) {
    const rawStream = match[1];
    const streamBuf = Buffer.from(rawStream, "latin1");

    // Strategy 1: plain FlateDecode (zlib / raw deflate)
    const inflated = inflateMaybe(streamBuf);
    if (inflated) { chunks.push(...decodePdfTextOperators(inflated.toString("latin1"))); continue; }

    // Strategy 2: ASCII85Decode → FlateDecode (common in ReportLab PDFs)
    const a85Buf = decodeAscii85(rawStream);
    if (a85Buf) {
      const a85Inflated = inflateMaybe(a85Buf);
      if (a85Inflated) { chunks.push(...decodePdfTextOperators(a85Inflated.toString("latin1"))); continue; }
      // Strategy 3: ASCII85-decoded content might already be raw operators
      chunks.push(...decodePdfTextOperators(a85Buf.toString("latin1")));
      continue;
    }

    // Strategy 4: try the stream bytes as raw operators (uncompressed streams)
    chunks.push(...decodePdfTextOperators(rawStream));
  }

  const text = cleanExtractedText(chunks.join("\n"));
  return text.length < 40 ? "" : text.slice(0, 180000);
}

// Decode ASCII85 (Base85) encoded data. Handles both raw and <~ ~> delimited forms.
function decodeAscii85(input: string): Buffer | null {
  try {
    const end = input.indexOf("~>");
    let data = (end !== -1 ? input.slice(0, end) : input).replace(/\s/g, "");
    if (data.startsWith("<~")) data = data.slice(2);
    const out: number[] = [];
    let i = 0;
    while (i < data.length) {
      if (data[i] === "z") { out.push(0, 0, 0, 0); i++; continue; }
      const group = data.slice(i, i + 5);
      const n = group.length;
      if (n === 0) break;
      let value = 0;
      for (let j = 0; j < n; j++) value += (group.charCodeAt(j) - 33) * Math.pow(85, 4 - j);
      // Pad incomplete groups so partial bytes can be extracted correctly
      for (let j = n; j < 5; j++) value += 84 * Math.pow(85, 4 - j);
      // Extract up to (n-1) bytes from the 4-byte group
      const b = [
        Math.floor(value / 16777216) & 255,
        Math.floor(value / 65536) & 255,
        Math.floor(value / 256) & 255,
        value & 255,
      ];
      for (let k = 0; k < n - 1; k++) out.push(b[k]);
      i += n;
    }
    return out.length > 0 ? Buffer.from(out) : null;
  } catch { return null; }
}

function inflateMaybe(buf: Buffer): Buffer | null {
  const variants = [buf, trimBinaryWhitespace(buf)];
  for (const candidate of variants) {
    try { return zlib.inflateSync(candidate); } catch {}
    try { return zlib.inflateRawSync(candidate); } catch {}
  }
  return null;
}

function trimBinaryWhitespace(buf: Buffer) {
  let start = 0;
  let end = buf.length;
  while (start < end && [0x0a, 0x0d, 0x20].includes(buf[start])) start += 1;
  while (end > start && [0x0a, 0x0d, 0x20].includes(buf[end - 1])) end -= 1;
  return buf.subarray(start, end);
}

function decodePdfTextOperators(content: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;

  // (text) Tj — standard show string
  const tjRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  while ((match = tjRegex.exec(content))) out.push(decodePdfLiteral(match[0].replace(/\s*Tj$/, "")));

  // [(text) -kern (text)] TJ — kerned show string array
  const tjArrayRegex = /\[((?:\s*(?:\((?:\\.|[^\\)])*\)|-?\d+(?:\.\d+)?))*\s*)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(content))) {
    const pieces = match[1].match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    if (pieces.length) out.push(pieces.map(decodePdfLiteral).join(""));
  }

  // (text) ' — move to next line and show (shorthand)
  const apostropheRegex = /\((?:\\.|[^\\)])*\)\s*'/g;
  while ((match = apostropheRegex.exec(content))) out.push(decodePdfLiteral(match[0].replace(/\s*'$/, "")));

  return out;
}

function decodePdfLiteral(literal: string): string {
  let s = literal.startsWith("(") && literal.endsWith(")") ? literal.slice(1, -1) : literal;
  s = s.replace(/\\([nrtbf()\\])/g, (_m, ch) => {
    switch (ch) {
      case "n": return "\n";
      case "r": return "\r";
      case "t": return "\t";
      case "b": return "\b";
      case "f": return "\f";
      default: return ch;
    }
  });
  s = s.replace(/\\([0-7]{1,3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)));
  return s;
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
