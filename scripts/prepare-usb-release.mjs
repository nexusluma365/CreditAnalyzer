#!/usr/bin/env node
/**
 * prepare-usb-release.js
 *
 * Scaffolds the /usb-release folder with documentation and example files.
 * Run via:  npm run prepare:usb
 *
 * This script NEVER:
 *   - copies source code
 *   - copies .env files or any secrets
 *   - includes real license keys
 *   - modifies the built app or installer files
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "usb-release");

function ensure(dir) {
  mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
  if (existsSync(filePath)) {
    console.log(`  skip  ${filePath.replace(ROOT, "")}`);
    return;
  }
  writeFileSync(filePath, content, "utf8");
  console.log(`  wrote ${filePath.replace(ROOT, "")}`);
}

console.log("\nPreparing /usb-release scaffold...\n");

ensure(join(OUT, ".credit-key"));

// ── license.dat.example ──────────────────────────────────────────────────────
write(
  join(OUT, ".credit-key", "license.dat.example"),
  "PASTE_CUSTOMER_KEYGEN_LICENSE_HERE\n"
);

write(
  join(OUT, ".credit-key", "licens.json.example"),
  JSON.stringify({ licenseKey: "PASTE_CUSTOMER_KEYGEN_LICENSE_HERE" }, null, 2) + "\n"
);

// ── README_USB_SETUP.txt ─────────────────────────────────────────────────────
write(
  join(OUT, "README_USB_SETUP.txt"),
  `========================================================
Credit Report Analyzer Pro — USB Distribution Setup
Internal Guide (DO NOT include this file on customer USBs)
========================================================

WHAT FILES BELONG ON THE CUSTOMER USB
--------------------------------------
  CreditAnalyzer Setup.exe      <- Windows installer
  CreditAnalyzer.dmg            <- macOS installer
  START-HERE.txt                <- Customer instructions
  .credit-key/
      license.dat               <- Customer's Keygen license key
      licens.json               <- Optional hidden JSON format, {"licenseKey":"KEY"}

WHAT MUST NEVER BE COPIED TO THE USB
--------------------------------------
  /src, /electron, /api         Source code
  /node_modules                 Dependencies
  .env, .env.local              Secrets
  package.json                  Project manifest
  vite.config.ts                Build config
  KEYGEN_API_TOKEN              Never expose this
  OPENAI_API_KEY                Never expose this

See BUILD_AND_USB_EXPORT_CHECKLIST.txt for the full step-by-step.
`
);

// ── START-HERE.txt ───────────────────────────────────────────────────────────
write(
  join(OUT, "START-HERE.txt"),
  `========================================================
Credit Report Analyzer Pro — Quick Start
========================================================

BEFORE YOU BEGIN
-----------------
Keep this USB drive plugged in before and while using the app.
An internet connection is required to verify your license.

STEP 1 — Install the App
--------------------------
  Windows: Double-click  CreditAnalyzer Setup.exe
  Mac:     Double-click  CreditAnalyzer.dmg
           Drag the app into your Applications folder.

STEP 2 — Launch the App
-------------------------
Open Credit Report Analyzer Pro. It will detect your USB key
automatically — no manual license entry is needed.

TROUBLESHOOTING
----------------
"Please plug in your Credit Analyzer USB key to continue."
  Remove the USB, wait 3 seconds, plug it back in.
  The app will unlock automatically within a few seconds.

"Cannot reach the validation server."
  Check your internet connection and try again.

DO NOT
-------
- Delete or rename any files on this USB drive.
- Share this USB drive. It is licensed for one user only.

Need help? Contact support with your name and order number.
`
);

// ── BUILD_AND_USB_EXPORT_CHECKLIST.txt ───────────────────────────────────────
write(
  join(OUT, "BUILD_AND_USB_EXPORT_CHECKLIST.txt"),
  `========================================================
Credit Report Analyzer Pro — Build & USB Export Checklist
Internal Use Only
========================================================

STEP 1 — Build
  npm run build
  npm run package:all
    -> release/CreditAnalyzer.dmg
    -> release/CreditAnalyzer Setup.exe

STEP 2 — Format USB
  Format as exFAT, label: CREDIT_ANALYZER

STEP 3 — Copy to USB root
  release/CreditAnalyzer.dmg
  release/CreditAnalyzer Setup.exe
  usb-release/START-HERE.txt

  DO NOT copy: /src /api .env package.json secrets

STEP 4 — Create hidden license folder
  macOS:   mkdir /Volumes/CREDIT_ANALYZER/.credit-key
  Windows: New-Item -ItemType Directory "E:\\.credit-key"

STEP 5 — Add customer license key
  macOS:   echo "KEY" > /Volumes/CREDIT_ANALYZER/.credit-key/license.dat
  Windows: "KEY" | Out-File "E:\\.credit-key\\license.dat" -Encoding utf8 -NoNewline

STEP 6 — Hide the folder
  macOS:   chflags hidden /Volumes/CREDIT_ANALYZER/.credit-key
  Windows: attrib +h +s "E:\\.credit-key"

STEP 7 — Test
  [ ] Eject and reinsert USB
  [ ] Install and launch app
  [ ] App unlocks automatically
  [ ] Remove USB -> app logs out / locks within ~5 s
  [ ] Reinsert USB -> app unlocks within ~5 s
  [ ] Test one full analysis to confirm backend + license end-to-end

STEP 8 — Record key in Keygen dashboard, then ship.

To revoke: suspend/revoke the license in Keygen.
Effect takes hold within 60 seconds on the customer's machine.
`
);

console.log("\nDone. Review the files in /usb-release before shipping.\n");
console.log(
  "Reminder: copy only installer files + START-HERE.txt + .credit-key/license.dat to the USB.\n"
);
