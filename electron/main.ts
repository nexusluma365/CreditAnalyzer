import { app, BrowserWindow, ipcMain, dialog, safeStorage } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import zlib from "node:zlib";

const isDev = process.env.NODE_ENV === "development";
let mainWindow: BrowserWindow | null = null;

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

ipcMain.handle("machine:fingerprint", async () => getMachineFingerprint());
ipcMain.handle("machine:name", async () => `${os.hostname()} (${process.platform})`);

ipcMain.handle("secureStore:get", async (_event, key: string) => readSecureValue(key));
ipcMain.handle("secureStore:set", async (_event, key: string, value: string) => writeSecureValue(key, value));
ipcMain.handle("secureStore:remove", async (_event, key: string) => removeSecureValue(key));

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

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const chunks: string[] = [];
  const raw = buffer.toString("latin1");

  // Extract plain text objects.
  chunks.push(...decodePdfTextOperators(raw));

  // Extract common FlateDecode streams. This covers many generated credit reports.
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw))) {
    const streamBody = Buffer.from(match[1], "latin1");
    const inflated = inflateMaybe(streamBody);
    if (inflated) chunks.push(...decodePdfTextOperators(inflated.toString("latin1")));
  }

  const text = cleanExtractedText(chunks.join("\n"));
  if (text.length < 40) {
    throw new Error(
      "This PDF appears to be scanned, image-only, encrypted, or otherwise unreadable. Please upload a text-based credit report PDF."
    );
  }
  return text.slice(0, 180000);
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
  const literalRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = literalRegex.exec(content))) out.push(decodePdfLiteral(match[0].replace(/\s*Tj$/, "")));

  const arrayRegex = /\[((?:\s*(?:\((?:\\.|[^\\)])*\)|-?\d+(?:\.\d+)?))*\s*)\]\s*TJ/g;
  while ((match = arrayRegex.exec(content))) {
    const inner = match[1];
    const pieces = inner.match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    if (pieces.length) out.push(pieces.map(decodePdfLiteral).join(""));
  }
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
