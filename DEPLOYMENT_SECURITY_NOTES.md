# Credit Report Analyzer Pro — Deployment/Security Notes

This build includes the deployment hardening pass requested:

- Real PDF text extraction from Electron main process for text-based PDFs.
- Upload analysis uses extracted PDF text, not filename-only mock data.
- AI endpoints require licenseKey + machine fingerprint before OpenAI usage.
- Demo license keys and VITE_DEV_BYPASS_LICENSE were removed from production logic.
- Machine fingerprint is generated in Electron main process using device/system identifiers.
- Client/profile/license/app data moved from browser localStorage to Electron encrypted secure storage.
- Backend now has body-size limits, rate limiting, restricted CORS configuration, license middleware, and safer error handling.
- macOS packaging is configured for hardened runtime, Developer ID distribution signing, and notarization through electron-builder.
- USB removal during an active USB-licensed session locks/logs out the app with a "Please Reconnect Key" prompt and automatically unlocks after reinsertion.
- Settings includes a confirmed Clear All action that removes local reports, letters, dispute cases, profile, license, onboarding, and USB validation cache.

## macOS signing and notarization

Apple trust requires a paid Apple Developer account and release credentials in the packaging environment. Build with one of these notarization credential sets:

Recommended App Store Connect API key:

APPLE_API_KEY=/absolute/path/AuthKey_XXXXXXXXXX.p8
APPLE_API_KEY_ID=XXXXXXXXXX
APPLE_API_ISSUER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CSC_LINK=/absolute/path/DeveloperIDApplication.p12
CSC_KEY_PASSWORD=...

Apple ID fallback:

APPLE_ID=developer@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=TEAMID1234
CSC_LINK=/absolute/path/DeveloperIDApplication.p12
CSC_KEY_PASSWORD=...

Without these external credentials, `npm run package:mac` can still create a DMG for local testing, but macOS Gatekeeper will treat it as unsigned/unnotarized.

## Railway environment variables

Required:

KEYGEN_ACCOUNT_ID=
KEYGEN_PRODUCT_ID=
KEYGEN_POLICY_ID=
KEYGEN_API_TOKEN=
OPENAI_API_KEY=

Recommended:

ALLOWED_ORIGINS=http://localhost:5173,file://,app://.
MAX_BODY_BYTES=2000000
RATE_LIMIT_MAX=80
AI_RATE_LIMIT_MAX=20
OPENAI_MODEL=gpt-4o-mini

Optional:

ANTHROPIC_API_KEY=

## Important limits

Text-based PDFs are supported. Scanned/image-only or encrypted PDFs still require OCR, which is intentionally not bundled in this desktop build.
