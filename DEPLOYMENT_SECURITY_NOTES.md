# Credit Report Analyzer Pro — Deployment/Security Notes

This build includes the deployment hardening pass requested:

- Real PDF text extraction from Electron main process for text-based PDFs.
- Upload analysis uses extracted PDF text, not filename-only mock data.
- AI endpoints require licenseKey + machine fingerprint before OpenAI usage.
- Demo license keys and VITE_DEV_BYPASS_LICENSE were removed from production logic.
- Machine fingerprint is generated in Electron main process using device/system identifiers.
- Client/profile/license/app data moved from browser localStorage to Electron encrypted secure storage.
- Backend now has body-size limits, rate limiting, restricted CORS configuration, license middleware, and safer error handling.

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
