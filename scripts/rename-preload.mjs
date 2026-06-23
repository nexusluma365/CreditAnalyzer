// Renames dist-electron/preload.js -> dist-electron/preload.cjs.
//
// Why this exists: root package.json has "type": "module", but Electron
// preload scripts attached to sandboxed renderers must be CommonJS.
// Renaming to .cjs forces CommonJS loading regardless of the "type" field.
//
// The main process (main.js) stays as .js — a dist-electron/package.json
// with {"type":"commonjs"} makes Node treat every .js there as CJS, which
// is needed because Electron 32's bundled Node.js (v20.18.1) has broken
// ESM→CJS interop for the `electron` built-in module.
import { renameSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const from = path.join(__dirname, "..", "dist-electron", "preload.js");
const to = path.join(__dirname, "..", "dist-electron", "preload.cjs");

if (existsSync(from)) {
  renameSync(from, to);
  console.log("renamed dist-electron/preload.js -> preload.cjs");
} else {
  console.warn("rename-preload: expected file not found:", from);
}
