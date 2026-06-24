#!/usr/bin/env node
/**
 * publish-release.mjs
 * Usage: node scripts/publish-release.mjs [patch|minor|major]
 *
 * 1. Bumps the version in package.json
 * 2. Builds macOS DMG and Windows EXE
 * 3. Creates a GitHub Release and uploads both installers
 * 4. Prints the download URLs so you can update Railway env vars
 *
 * Requires: gh CLI (brew install gh), already authenticated
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const bump = process.argv[2] || "patch";
const pkgPath = resolve("package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

// Bump version
const [major, minor, patch] = pkg.version.split(".").map(Number);
let newVersion;
if (bump === "major") newVersion = `${major + 1}.0.0`;
else if (bump === "minor") newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`\n-> Version bumped to ${newVersion}\n`);

// Build
console.log("-> Building macOS DMG...");
execSync("npm run package:mac", { stdio: "inherit" });
console.log("-> Building Windows EXE...");
execSync("npm run package:win", { stdio: "inherit" });

// Commit version bump
execSync(`git add package.json && git commit -m "chore: release v${newVersion}" && git push`, { stdio: "inherit" });

// Create GitHub Release
const tag = `v${newVersion}`;
const dmg = "release/CreditAnalyzer.dmg";
const exe = "release/CreditAnalyzer Setup.exe";

console.log(`\n-> Creating GitHub Release ${tag}...`);
execSync(
  `gh release create ${tag} "${dmg}" "${exe}" \
    --title "Credit Report Analyzer Pro ${tag}" \
    --notes "Release ${tag} — built $(date '+%Y-%m-%d'). Download CreditAnalyzer.dmg for macOS or \\"CreditAnalyzer Setup.exe\\" for Windows."`,
  { stdio: "inherit" }
);

// Print the download URLs
const repo = execSync("gh repo view --json nameWithOwner -q .nameWithOwner").toString().trim();
const macUrl = `https://github.com/${repo}/releases/download/${tag}/CreditAnalyzer.dmg`;
const winUrl = `https://github.com/${repo}/releases/download/${tag}/CreditAnalyzer%20Setup.exe`;

console.log(`
Release ${tag} published!

GitHub Release: https://github.com/${repo}/releases/tag/${tag}

Download URLs:
  macOS: ${macUrl}
  Windows: ${winUrl}

-> Update these Railway environment variables to enable auto-updates:
  LATEST_APP_VERSION=${newVersion}
  MAC_INSTALLER_URL=${macUrl}
  WINDOWS_INSTALLER_URL=${winUrl}

After updating Railway, running apps will auto-detect the update and prompt to install.
`);
