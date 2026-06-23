# Credit Report Analyzer Pro

Cross-platform Electron + React desktop app for research-informed credit report review, negative-item organization, dispute workflow tracking, and dispute-letter drafting.

## What is ready

- Electron + React + TypeScript app shell
- Manual PDF upload UI and drag/drop flow
- Local report/client/letter/tracker persistence
- Keygen license activation service wired to the backend API
- Railway-ready Node API server
- OpenAI-backed dispute letter endpoint with safe local fallback
- Report-analysis endpoint with OpenAI support and safe local fallback
- PDF/Word-compatible letter export
- TypeScript typecheck and production build passing

## Install

```bash
npm install
```

## Local development

Run the backend API in one terminal:

```bash
npm run dev:api
```

Run the desktop app in another terminal:

```bash
npm run dev
```

## Railway backend variables

Add these to Railway Variables:

```env
KEYGEN_ACCOUNT_ID=
KEYGEN_PRODUCT_ID=6935744f-f8ac-4a48-afcb-0a62d1c875d8
KEYGEN_POLICY_ID=13f12dcd-6325-497a-a227-5422368cdf10
KEYGEN_API_TOKEN=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

After editing variables in Railway, click **Deploy**.

## Pre-deployment verification

Run these before shipping a backend deploy or packaging customer installers:

```bash
npm ci
npm run typecheck
npm run build
npm audit --audit-level=high
```

The project has been verified with Electron 42, electron-builder 26, and Vite 8. Do not add `VITE_DEV_BYPASS_LICENSE` or any demo license bypass variable to local or deployment environments; the production flow validates through the Railway API and Keygen.

## Connect the desktop app to Railway

Before building the desktop app for customers, set:

```env
VITE_API_BASE_URL=https://your-railway-service.up.railway.app
```

Then run:

```bash
npm run build
```

## Package installers

Windows:

```bash
npm run package:win
```

Mac:

```bash
npm run package:mac
```

The macOS packaging command produces `release/Credit Report Analyzer Pro-0.1.0.dmg`. For customer distribution, configure a real app icon in the Electron Builder `buildResources` directory and provide Apple Developer ID signing/notarization credentials in the build environment. Without those external credentials, Electron Builder can create a DMG, but macOS will treat it as unsigned.

## USB delivery structure

Put these files on the USB:

```text
Credit Report Analyzer Pro Setup 0.1.0.exe
Credit Report Analyzer Pro-0.1.0.dmg
START-HERE.pdf
LicenseKey.txt
```

The app validates the license against your Railway API, which talks to Keygen. Do not put OpenAI, Claude, Stripe, or Keygen admin tokens on the USB.

## Compliance note

All analysis and letters are research-informed recommendations based on dispute category, issue signals, and common market patterns. The app does not provide legal advice, does not guarantee removals, does not guarantee score increases, and does not guarantee funding approvals.
