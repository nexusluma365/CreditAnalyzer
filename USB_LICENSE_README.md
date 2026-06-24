# Credit Report Analyzer Pro USB License Setup

This file explains what the app looks for on a customer USB drive and what must be present so the USB key and desktop app communicate correctly.

## What The App Looks For

When the app starts, and every few seconds while it is unlocked, it scans removable drives for a license key file.

The app checks these direct paths first:

```text
.credit-key/license.dat
.credit-key/license.json
.credit-key/licens.json
license.json
licens.json
.license.json
.licens.json
```

The app also scans a small part of the USB for files named:

```text
license.dat
license.json
licens.json
.license.json
.licens.json
credit-license.json
.credit-license.json
```

Hidden files and hidden folders are okay. The app can read hidden files even when the user cannot see them in Finder or File Explorer.

## Recommended USB Structure

Use this structure for customer USB drives:

```text
CreditAnalyzer Setup.exe
CreditAnalyzer.dmg
START-HERE.txt
.credit-key/
  license.dat
```

Optional JSON format:

```text
.credit-key/
  licens.json
```

## License File Formats

### Plain Text

`license.dat` should contain only the customer license key:

```text
CUSTOMER-KEYGEN-LICENSE-KEY
```

### JSON

JSON license files may use any of these field names:

```json
{
  "licenseKey": "CUSTOMER-KEYGEN-LICENSE-KEY"
}
```

Also accepted:

```json
{
  "license_key": "CUSTOMER-KEYGEN-LICENSE-KEY"
}
```

```json
{
  "key": "CUSTOMER-KEYGEN-LICENSE-KEY"
}
```

```json
{
  "license": "CUSTOMER-KEYGEN-LICENSE-KEY"
}
```

## How The App Validates The USB

1. The app finds the license file on the USB.
2. The app reads the license key.
3. The app sends the key, device fingerprint, USB drive id, and app version to the Railway backend.
4. The backend validates the license with Keygen.
5. If valid, the app unlocks.
6. If the USB is removed, the app locks again within a few seconds.

If the internet/backend goes offline after a successful USB validation, the app can temporarily accept the same USB key during the short offline grace window. The USB must still be plugged in.

## Required Backend Information

The USB itself should not contain backend secrets. These belong on Railway:

```env
KEYGEN_ACCOUNT_ID=
KEYGEN_PRODUCT_ID=
KEYGEN_API_TOKEN=
LATEST_APP_VERSION=
MAC_INSTALLER_URL=
WINDOWS_INSTALLER_URL=
```

The desktop app communicates with the Railway backend configured at build time through `VITE_API_BASE_URL`, or the default production backend in the app.

## Do Not Put These On The USB

Never copy these to a customer USB:

```text
.env
.env.local
KEYGEN_API_TOKEN
OPENAI_API_KEY
ANTHROPIC_API_KEY
src/
api/
electron/
node_modules/
package.json
```

The customer USB should contain only the installers, user instructions, and the customer license key file.

## Windows Setup Example

```powershell
New-Item -ItemType Directory "E:\.credit-key"
"CUSTOMER-KEYGEN-LICENSE-KEY" | Out-File "E:\.credit-key\license.dat" -Encoding utf8 -NoNewline
attrib +h +s "E:\.credit-key"
```

## macOS Setup Example

```bash
mkdir /Volumes/CREDIT_ANALYZER/.credit-key
printf "CUSTOMER-KEYGEN-LICENSE-KEY" > /Volumes/CREDIT_ANALYZER/.credit-key/license.dat
chflags hidden /Volumes/CREDIT_ANALYZER/.credit-key
```

## Final Test Checklist

```text
[ ] USB contains CreditAnalyzer Setup.exe
[ ] USB contains CreditAnalyzer.dmg
[ ] USB contains START-HERE.txt
[ ] USB contains .credit-key/license.dat or supported JSON license file
[ ] License key is active in Keygen
[ ] Railway backend is deployed and has Keygen variables configured
[ ] App unlocks when USB is inserted
[ ] App locks when USB is removed
[ ] App unlocks again when the same USB is reinserted
[ ] App can validate after reconnecting to internet/backend
```
