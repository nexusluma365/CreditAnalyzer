import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

loadLocalEnv();

const APP_NAME = "Credit Report Analyzer Pro";
const VERSION = process.env.npm_package_version ?? "0.1.0";
const LATEST_APP_VERSION = process.env.LATEST_APP_VERSION || VERSION;
const MAC_INSTALLER_URL = process.env.MAC_INSTALLER_URL || "";
const WINDOWS_INSTALLER_URL = process.env.WINDOWS_INSTALLER_URL || "";
const UPDATE_NOTES = process.env.UPDATE_NOTES || "";
const FORCE_UPDATE = process.env.FORCE_UPDATE === "true";
const DEPLOYMENT_COMMIT =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT_SHA ||
  process.env.SOURCE_VERSION ||
  "local";
const PORT = Number(process.env.PORT ?? 3000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 2_000_000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 80);
const AI_RATE_LIMIT_MAX = Number(process.env.AI_RATE_LIMIT_MAX ?? 20);

const KEYGEN_ACCOUNT_ID = process.env.KEYGEN_ACCOUNT_ID ?? "";
const KEYGEN_PRODUCT_ID = normalizeKeygenId(process.env.KEYGEN_PRODUCT_ID ?? "");
const KEYGEN_API_TOKEN = process.env.KEYGEN_API_TOKEN ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "app://.,file://,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ROUTES = [
  "/",
  "/health",
  "/api/version",
  "/api/app-update",
  "/api/license/validate",
  "/api/license/activate",
  "/api/validate-usb-license",
  "/api/analyze-report",
  "/api/generate-letter",
];

function loadLocalEnv(filePath = ".env.local") {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function normalizeKeygenId(id) {
  const trimmed = String(id || "").trim();
  const knownIds = {
    "6935744f": "6935744f-f8ac-4a48-afcb-0a62d1c875d8",
    "13f12dcd": "13f12dcd-6325-497a-a227-5422368cdf10",
  };
  return knownIds[trimmed] ?? trimmed;
}

const rateBuckets = new Map();

function corsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith("file://") ? origin || "*" : "null";
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": allowedOrigin,
    "vary": "Origin",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}

function sendJson(req, res, statusCode, body) {
  res.writeHead(statusCode, corsHeaders(req));
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function rateLimit(req, keyPrefix = "global", max = RATE_LIMIT_MAX) {
  const key = `${keyPrefix}:${clientIp(req)}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key) ?? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > max) {
    const err = new Error("Too many requests. Please wait and try again.");
    err.statusCode = 429;
    throw err;
  }
}

async function readJson(req) {
  let raw = "";
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const err = new Error("Request body is too large.");
      err.statusCode = 413;
      throw err;
    }
    raw += chunk;
  }
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch {
    const err = new Error("Invalid JSON body");
    err.statusCode = 400;
    throw err;
  }
}

function requireEnv(name, value) {
  if (!value) {
    const err = new Error(`${name} is not configured on the server`);
    err.statusCode = 500;
    throw err;
  }
}

function keygenUrl(path) {
  requireEnv("KEYGEN_ACCOUNT_ID", KEYGEN_ACCOUNT_ID);
  return `https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}${path}`;
}

async function keygenRequest(path, options = {}) {
  requireEnv("KEYGEN_API_TOKEN", KEYGEN_API_TOKEN);
  const response = await fetch(keygenUrl(path), {
    ...options,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${KEYGEN_API_TOKEN}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const err = new Error(data?.errors?.[0]?.detail || data?.errors?.[0]?.title || `Keygen request failed (${response.status})`);
    err.statusCode = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function validateLicenseWithKeygen({ licenseKey, fingerprint }) {
  requireEnv("KEYGEN_PRODUCT_ID", KEYGEN_PRODUCT_ID);
  const validation = await keygenRequest("/licenses/actions/validate-key", {
    method: "POST",
    body: JSON.stringify({
      meta: {
        key: licenseKey,
        scope: { product: KEYGEN_PRODUCT_ID, ...(fingerprint ? { fingerprint } : {}) },
      },
    }),
  });
  const meta = validation?.meta ?? {};
  const license = validation?.data ?? null;
  return {
    valid: Boolean(meta.valid),
    code: meta.code ?? null,
    licenseId: license?.id ?? null,
    status: license?.attributes?.status ?? (meta.valid ? "ACTIVE" : "INVALID"),
    expiry: license?.attributes?.expiry ?? null,
    policyId: license?.relationships?.policy?.data?.id ?? null,
    message: meta.detail || (meta.valid ? "License validated successfully." : "License is not valid."),
    raw: { meta, license },
  };
}

async function requireValidLicense(body) {
  const licenseKey = String(body.licenseKey ?? "").trim();
  const fingerprint = String(body.fingerprint ?? "").trim();
  if (!licenseKey || !fingerprint) {
    const err = new Error("A valid license key and machine fingerprint are required.");
    err.statusCode = 401;
    throw err;
  }
  const result = await validateLicenseWithKeygen({ licenseKey, fingerprint });
  if (!result.valid) {
    const err = new Error(result.message || "License is not active.");
    err.statusCode = 403;
    err.details = result;
    throw err;
  }
  return result;
}

async function createMachineForLicense({ licenseId, fingerprint, name }) {
  if (!licenseId || !fingerprint) return null;
  try {
    return await keygenRequest("/machines", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "machines",
          attributes: { fingerprint, name: name || `Machine ${new Date().toISOString()}`, platform: "desktop" },
          relationships: { license: { data: { type: "licenses", id: licenseId } } },
        },
      }),
    });
  } catch (error) {
    return { warning: error.message };
  }
}

async function getLicenseHolderInfo(licenseId) {
  if (!licenseId) return { userName: null, userEmail: null };
  try {
    const data = await keygenRequest(`/licenses/${licenseId}?include=user`);
    const included = data?.included ?? [];
    const user = included.find((i) => i.type === "users");
    if (user) {
      const a = user.attributes ?? {};
      const fullName = [a.firstName, a.lastName].filter(Boolean).join(" ") || a.name || null;
      return { userName: fullName || null, userEmail: a.email || null };
    }
    const licenseAttrs = data?.data?.attributes ?? {};
    return { userName: licenseAttrs.name || null, userEmail: null };
  } catch {
    return { userName: null, userEmail: null };
  }
}

function maskLicenseKey(key) {
  if (!key || typeof key !== "string") return null;
  const parts = key.split("-");
  if (parts.length < 2) return "****";
  const last = parts[parts.length - 1];
  const masked = parts.slice(0, -1).map(() => "****").join("-");
  return `${masked}-${last}`;
}

function compareVersions(a, b) {
  const pa = String(a || "0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const pb = String(b || "0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function installerUrlForPlatform(platform) {
  if (platform === "darwin") return MAC_INSTALLER_URL || null;
  if (platform === "win32") return WINDOWS_INSTALLER_URL || null;
  return MAC_INSTALLER_URL || WINDOWS_INSTALLER_URL || null;
}

// ── Credit report validation ──────────────────────────────────────────────────
const BUREAU_TOKENS = ["transunion", "equifax", "experian", "trans union"];
const CREDIT_REPORT_TOKENS = [
  "credit report", "credit history", "credit file", "credit profile", "consumer disclosure",
  "annual credit report", "credit score", "fico", "vantagescore", "payment history",
  "account review", "credit summary", "credit information",
];
const NEGATIVE_TOKENS = [
  "collection", "charge-off", "charged off", "charge off",
  "late payment", "30 days late", "60 days late", "90 days late",
  "delinquent", "past due", "repossession", "repo", "bankruptcy",
  "hard inquiry", "inquiries", "judgment", "lien", "public record",
  "negative", "derogatory",
];

function isCreditReport(text) {
  const norm = text.toLowerCase();
  const hasBureau = BUREAU_TOKENS.some((t) => norm.includes(t));
  const hasReportSignal = CREDIT_REPORT_TOKENS.some((t) => norm.includes(t));
  const hasNegativeSignal = NEGATIVE_TOKENS.some((t) => norm.includes(t));
  return hasBureau || hasReportSignal || hasNegativeSignal;
}

// ── Build the shared analysis prompt ─────────────────────────────────────────
function buildAnalysisPrompt(reportText, fileName) {
  return `You are a certified credit analyst reviewing an extracted text from a consumer credit report PDF.

Your job is to THOROUGHLY scan the text and identify every negative item, inaccuracy, and dispute opportunity visible in this report.

Return ONLY a valid JSON object with exactly these keys:

{
  "summary": "1-2 sentence description of what this report contains and what was found",
  "bureau": "which bureau(s) issued this report — Experian, Equifax, TransUnion, or Multiple",
  "findings": [
    {
      "category": "collections | charge_offs | repossessions | hard_inquiries | late_payments | medical_collections | student_loans | public_records",
      "creditorName": "EXACT creditor or collection agency name as it appears in the report text",
      "accountNumberMasked": "masked account number in format •••• XXXX (last 4 digits), or null if not visible",
      "balance": 1234 (numeric dollar amount with NO currency symbol, or null if not stated),
      "originalAmount": 1800 (original charge-off/debt amount if different from balance, or null),
      "dateOpened": "date account was opened, format MM/YYYY or YYYY-MM-DD if visible, else null",
      "dateReported": "date last reported to bureau if visible, else null",
      "bureausReporting": ["Experian", "Equifax", "TransUnion"] (only list bureaus explicitly reporting this item),
      "issueFlags": array of applicable flags from: ["wrong_balance", "duplicate_account", "unknown_account", "date_mismatch", "bureau_mismatch", "missing_creditor_info"],
      "recommendedLetterType": "collection_dispute | debt_validation | method_of_verification | hard_inquiry_removal | goodwill_letter | escalation_letter",
      "disputeOpportunityScore": integer 1-100 (higher = stronger FCRA dispute potential),
      "notes": "1-2 sentences: WHAT specific issue was found in this item AND why it may be disputable under FCRA"
    }
  ],
  "nextSteps": ["action 1", "action 2", "action 3"]
}

Critical extraction rules:
- Use the EXACT creditor/agency name from the report text — never use generic labels like "Collections"
- Extract real account numbers from the text (mask to last 4 digits as •••• XXXX)
- Extract actual dollar amounts (balance, original amount) from the text
- Extract actual dates as written in the report
- List ONLY the bureaus that explicitly appear to report this specific item
- ONLY include genuinely negative items: collections, charge-offs, late payments, hard inquiries, repossessions, public records, derogatory marks
- Skip accounts in good standing with no negative history
- Score 80-100: clear FCRA violations (wrong dates, unrecognized account, unverifiable debt, missing info)
- Score 60-79: disputable items with some supporting signals
- Score 40-59: valid negative items with limited but possible dispute grounds
- Score 1-39: accurate items with minimal dispute opportunity
- Do NOT give legal advice or guarantee outcomes
- This analysis is for educational dispute assistance only

Credit report PDF (filename: ${fileName}):

${String(reportText).slice(0, 70000)}`;
}

// ── Claude (Anthropic) analyzer — primary path ────────────────────────────────
async function analyzeWithClaude({ reportText, fileName }) {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: buildAnalysisPrompt(reportText, fileName) }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.content?.[0]?.text ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// ── OpenAI analyzer — secondary path ──────────────────────────────────────────
async function analyzeWithOpenAI({ reportText, fileName }) {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a credit analyst. Return only valid JSON. This is for educational dispute assistance — do not guarantee outcomes or give legal advice." },
          { role: "user", content: buildAnalysisPrompt(reportText, fileName) },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ── Deep local text scanner — offline fallback ────────────────────────────────
// Reads the actual PDF text to find real creditor names, balances, and dates.
// Used only when both AI paths are unavailable.
function localDeepScan(reportText = "", fileName = "credit-report.pdf") {
  const fullText = `${fileName}\n${reportText}`;
  const norm = fullText.toLowerCase();

  // Detect bureaus
  const reportBureaus = [];
  if (norm.includes("experian")) reportBureaus.push("Experian");
  if (norm.includes("equifax")) reportBureaus.push("Equifax");
  if (norm.includes("transunion") || norm.includes("trans union")) reportBureaus.push("TransUnion");
  if (!reportBureaus.length) reportBureaus.push("Experian", "Equifax", "TransUnion");

  const findings = [];
  const lines = fullText.split(/\r?\n/);

  // Category signal map — check surrounding context for each match
  const CATEGORY_SIGNALS = [
    { category: "collections", letter: "debt_validation", triggers: ["collection account", "sent to collection", "placed in collection", "collection agency", "midland", "portfolio recovery", "lvnv", "resurgent", "enhanced recovery", "transworld", "cavalry", "unifin", "asset acceptance", "national credit", "cmre", "receivables management"] },
    { category: "charge_offs", letter: "collection_dispute", triggers: ["charge-off", "charged off", "charge off", "written off", "profit and loss"] },
    { category: "repossessions", letter: "collection_dispute", triggers: ["repossession", "voluntary repo", "involuntary repo", "deficiency balance", "auto deficiency"] },
    { category: "late_payments", letter: "goodwill_letter", triggers: ["30 days late", "60 days late", "90 days late", "30-day late", "60-day late", "90-day late", "late payment", "delinquent", "past due"] },
    { category: "medical_collections", letter: "debt_validation", triggers: ["medical collection", "healthcare collection", "hospital collection", "medical debt", "patient balance", "cmre financial", "medical data systems"] },
    { category: "hard_inquiries", letter: "hard_inquiry_removal", triggers: ["hard inquiry", "hard pull", "inquiries", "inquiry date", "permissible purpose"] },
    { category: "student_loans", letter: "collection_dispute", triggers: ["student loan", "nelnet", "mohela", "aidvantage", "department of education", "fedloan", "navient", "sallie mae"] },
    { category: "public_records", letter: "method_of_verification", triggers: ["bankruptcy", "chapter 7", "chapter 13", "public record", "civil judgment", "tax lien", "court judgment"] },
  ];

  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;

    // Look at a window of surrounding lines for signals
    const windowLines = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 20));
    const windowText = windowLines.join("\n");
    const windowNorm = windowText.toLowerCase();

    let matchedCategory = null;
    for (const sig of CATEGORY_SIGNALS) {
      if (sig.triggers.some((t) => windowNorm.includes(t))) {
        matchedCategory = sig;
        break;
      }
    }
    if (!matchedCategory) continue;

    // Identify the creditor name: prefer the first prominent line in the window
    // that looks like a company name (all caps, or title-case company)
    let creditorName = extractCreditorName(windowLines, matchedCategory.triggers);
    if (!creditorName || seen.has(creditorName.toUpperCase())) continue;
    seen.add(creditorName.toUpperCase());

    // Extract fields from the window
    const balanceMatch = windowText.match(/(?:balance|amount|owed|current|total)[:\s$]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i);
    const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : null;

    const origMatch = windowText.match(/(?:original|charge.?off|original amount|amount charged)[:\s$]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i);
    const originalAmount = origMatch ? parseFloat(origMatch[1].replace(/,/g, "")) : (balance ? Math.round(balance * 1.18) : null);

    const acctMatch = windowText.match(/(?:account|acct)[^0-9\n]{0,20}([xX*•\s\-]*[0-9]{3,8})/i);
    const accountNumberMasked = acctMatch ? `•••• ${acctMatch[1].replace(/[^0-9]/g, "").slice(-4)}` : null;

    const dateMatch = windowText.match(/\b(\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i);
    const dateOpened = dateMatch ? dateMatch[0] : null;

    const itemBureaus = [];
    if (windowNorm.includes("experian")) itemBureaus.push("Experian");
    if (windowNorm.includes("equifax")) itemBureaus.push("Equifax");
    if (windowNorm.includes("transunion") || windowNorm.includes("trans union")) itemBureaus.push("TransUnion");
    const bureausReporting = itemBureaus.length ? itemBureaus : [...reportBureaus];

    const flags = [];
    if (!balance) flags.push("missing_creditor_info");
    if (!dateOpened) flags.push("date_mismatch");
    if (bureausReporting.length === 1) flags.push("bureau_mismatch");
    if (!accountNumberMasked) flags.push("unknown_account");

    const score = Math.min(95, 52 + flags.length * 9 + (matchedCategory.category === "collections" || matchedCategory.category === "charge_offs" ? 8 : 0));

    findings.push({
      category: matchedCategory.category,
      creditorName,
      accountNumberMasked: accountNumberMasked || null,
      balance: balance || null,
      originalAmount: originalAmount || null,
      dateOpened: dateOpened || null,
      dateReported: null,
      bureausReporting,
      issueFlags: flags.slice(0, 3),
      recommendedLetterType: matchedCategory.letter,
      disputeOpportunityScore: score,
      notes: `${matchedCategory.category.replace(/_/g, " ")} account found in the extracted report text. Review the actual balance, dates, and bureau reporting for accuracy before deciding on a dispute path. This is a recommended review, not a legal determination.`,
    });

    i += 8; // skip ahead to avoid re-processing the same block
  }

  if (!findings.length) {
    // Absolute fallback — keyword category match without fake data
    for (const sig of CATEGORY_SIGNALS) {
      if (sig.triggers.some((t) => norm.includes(t))) {
        findings.push({
          category: sig.category,
          creditorName: `Unidentified ${sig.category.replace(/_/g, " ")} account`,
          accountNumberMasked: null,
          balance: null,
          originalAmount: null,
          dateOpened: null,
          dateReported: null,
          bureausReporting: reportBureaus,
          issueFlags: ["missing_creditor_info"],
          recommendedLetterType: sig.letter,
          disputeOpportunityScore: 55,
          notes: `Signals matching ${sig.category.replace(/_/g, " ")} were found in the report text, but the specific account details could not be automatically extracted. Review the full report to locate the creditor, balance, and dates before sending any letter.`,
        });
      }
    }
  }

  const summary = findings.length
    ? `Extracted ${findings.length} potential negative item(s) from the credit report. AI analysis was unavailable — review all details carefully as auto-extraction may be incomplete.`
    : "The PDF text was read but no clear negative items were automatically identified. Upload through the AI-connected backend for a deeper scan.";

  return {
    summary,
    bureau: reportBureaus.length > 1 ? "Multiple" : (reportBureaus[0] || "Unknown"),
    findings,
    nextSteps: [
      "Compare each extracted item against your original report PDF.",
      "Start with items that have the highest dispute opportunity score.",
      "Generate the recommended dispute letter for each item you want to challenge.",
    ],
  };
}

// Extract the most likely creditor name from a window of lines
function extractCreditorName(lines, triggers) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 80) continue;
    // Skip lines that are just trigger words, dates, or numbers
    if (triggers.some((t) => trimmed.toLowerCase() === t)) continue;
    if (/^[\d\s\$\.\,\-\/]+$/.test(trimmed)) continue;
    if (/^(account|balance|date|status|bureau|reported|opened|type|amount|inquiry|high credit)$/i.test(trimmed.trim())) continue;
    // Prefer ALL-CAPS names (typical of Experian/Equifax/TransUnion formatted reports)
    if (/^[A-Z][A-Z\s&\-\.,0-9]{3,}$/.test(trimmed)) return trimmed;
  }
  // Fallback: first non-trivial line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 4 && trimmed.length <= 80 && /[A-Za-z]{3,}/.test(trimmed)) return trimmed;
  }
  return null;
}

function fallbackLetter(input) {
  const today = new Date().toLocaleDateString();
  return `${input.consumerName || "Consumer Name"}\n${today}\n\n${input.bureau || "Credit Bureau"}\n\nRe: ${input.accountName || "Account"} ${input.accountNumber ? `(${input.accountNumber})` : ""}\n\nTo Whom It May Concern,\n\nI am writing to request an investigation of the account listed above. Based on my review, I believe this item may contain inaccurate, incomplete, or unverifiable information. The specific issue I would like reviewed is:\n\n${input.disputeReason || "Please verify the accuracy, completeness, ownership, balance, dates, and reporting of this account."}\n\nPlease investigate this matter and provide the results of your investigation in writing. If the information cannot be verified as accurate and complete, please update or remove the item as required by applicable credit reporting rules.\n\nThis letter is an educational draft and does not claim a guaranteed outcome.\n\nSincerely,\n${input.consumerName || "Consumer Name"}`;
}

const LETTER_TYPE_CONTEXTS = {
  "609_investigation": "FCRA §609 investigation request — consumer is requesting all documents the bureau used to create or verify this account. Legal basis: 15 U.S.C. § 1681g.",
  "collection_dispute": "FCRA §611 bureau dispute — challenging accuracy, completeness, or verifiability of a collection account. Legal basis: 15 U.S.C. § 1681i.",
  "charge_off_dispute": "FCRA §623 charge-off accuracy dispute — challenging balance, date, status, or double-reporting of a charged-off account. Legal basis: 15 U.S.C. § 1681s-2.",
  "method_of_verification": "FCRA §611(a)(7) escalation — requesting the specific method used to verify a previously disputed item after the bureau said 'verified'. Legal basis: 15 U.S.C. § 1681i(a)(7).",
  "debt_validation": "FDCPA §809(b) — consumer requesting validation of debt from the collection agency. This letter goes to the collector, NOT the bureau. Legal basis: 15 U.S.C. § 1692g.",
  "creditor_direct": "FCRA §623 direct creditor dispute — disputing inaccurate information directly with the original creditor who furnished it. Legal basis: 15 U.S.C. § 1681s-2(a)(8).",
  "paid_collection": "Paid collection status update — requesting the bureau/collector update the account status to reflect that this collection has been paid or settled.",
  "hard_inquiry_removal": "FCRA §604 unauthorized inquiry — disputing a hard inquiry the consumer never authorized. Legal basis: 15 U.S.C. § 1681b.",
  "goodwill_letter": "Goodwill adjustment — respectful appeal to the original creditor to remove a late payment notation as a courtesy. Not a legal claim — a goodwill request based on positive account history.",
  "repossession_dispute": "Repossession dispute — challenging the accuracy of the deficiency balance, repo date, or sale proceeds credited. References UCC Article 9 required notices.",
  "medical_collection": "Medical collection dispute — citing CFPB 2024 medical debt rules and HIPAA protections. Requesting validation of the debt and insurance adjudication records.",
  "bankruptcy_dispute": "Bankruptcy accuracy dispute — ensuring accounts are properly marked as discharged, dismissed, or correctly dated within FCRA §605 reporting periods.",
  "identity_theft": "FCRA §605B identity theft block — requesting immediate blocking of fraudulent account. 4-business-day block requirement. References FTC Identity Theft Report.",
  "outdated_account": "FCRA §605 obsolescence — requesting removal of an account that has exceeded the 7-year reporting period from date of first delinquency.",
  "duplicate_account": "Duplicate account removal — disputing the same account appearing twice creating a double-negative impact on the credit profile.",
  "escalation_letter": "Escalation letter — referencing prior unresolved dispute, noting intent to file CFPB/FTC complaint, citing FCRA §616 willful noncompliance risk.",
};

function buildLetterPrompt(input) {
  const letterType = String(input.letterType || "collection_dispute");
  const letterContext = LETTER_TYPE_CONTEXTS[letterType] || "General credit dispute letter.";
  const isCollector = letterType === "debt_validation" || letterType === "creditor_direct";

  // Build sender header from profile fields
  const senderLines = [
    input.consumerName || "Consumer",
    input.consumerAddress,
    [input.consumerCity, input.consumerState, input.consumerZip].filter(Boolean).join(", "),
    input.consumerPhone,
    input.consumerEmail,
  ].filter(Boolean);
  const senderBlock = senderLines.join("\n");

  const BUREAU_MAILING = {
    Experian: "Experian\nP.O. Box 4500\nAllen, TX 75013",
    Equifax: "Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374",
    TransUnion: "TransUnion LLC Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016",
  };
  const recipientBlock = isCollector
    ? "[Collection Agency / Original Creditor Name]\n[Street Address]\n[City, State ZIP]\n\n(Send via certified mail, return receipt requested — NOT to the bureau)"
    : (BUREAU_MAILING[input.bureau] || `${input.bureau || "Credit Bureau"}\n[Bureau Address]`);

  const systemMsg = "You are a senior consumer protection attorney and credit dispute specialist with 20 years of experience. Before drafting any letter, you reason through the specific facts of the case, identify the strongest legal arguments under FCRA and FDCPA, and select the precise statutory provisions that apply to this consumer's situation. Your letters are professional, factually grounded, legally specific, and tailored — never generic. You frame your output as an educational draft that helps consumers understand their rights, always noting it is not legal advice and outcomes vary.";

  const userMsg = `DISPUTE CASE BRIEF
Consumer: ${input.consumerName || "Consumer"}
Account / Creditor: ${input.accountName || "Unknown Account"} (${input.accountNumber ? `ending ${input.accountNumber}` : "no account number"})
Bureau: ${input.bureau || "Credit Bureau"}
Category: ${input.category || "collections"}
Letter Strategy: ${letterType}
Legal Context: ${letterContext}
Dispute Reason: ${input.disputeReason || "Account appears inaccurate or unverifiable."}

TASK
Step 1 — Case Analysis (reasoning only, do NOT include in the final letter):
Analyze the facts. What are the two or three strongest grounds for this specific dispute? Which exact FCRA/FDCPA sections apply? Any timing considerations (7-year rule, 30-day window, 4-business-day §605B requirement)?

Step 2 — Draft the complete letter using EXACTLY this format:

${senderBlock}

[Today's date — write the actual date]

${recipientBlock}

Re: [Subject line referencing account name and account number if available]

To Whom It May Concern,

[Body: 2–4 professional paragraphs citing specific U.S.C. section numbers (e.g., 15 U.S.C. § 1681i). Reference the strongest legal grounds from Step 1. Include a clear action request: investigate, delete, validate, block, or correct. Demand written response within 30 days (or 4 business days for §605B identity theft cases).]

Sincerely,
${input.consumerName || "Consumer"}

— Educational draft prepared by Luma Intelligence. This is not legal advice. Review all facts, personalize before sending, and consult a consumer attorney for guidance. Outcomes vary and are not guaranteed.`;

  return { systemMsg, userMsg };
}

async function generateLetterWithClaude(input) {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const { systemMsg, userMsg } = buildLetterPrompt(input);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemMsg,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "";
    return text.length > 200 ? text : null;
  } catch { return null; }
}

async function generateLetterWithOpenAI(input) {
  if (!OPENAI_API_KEY) return null;
  try {
    const { systemMsg, userMsg } = buildLetterPrompt(input);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.25,
        messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return text.length > 200 ? text : null;
  } catch { return null; }
}

async function generateLetter(input) {
  return (
    (await generateLetterWithClaude(input)) ??
    (await generateLetterWithOpenAI(input)) ??
    fallbackLetter(input)
  );
}

const server = createServer(async (req, res) => {
  try {
    rateLimit(req);
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/") return sendJson(req, res, 200, { name: APP_NAME, version: VERSION, status: "ok", service: "api", deploymentCommit: DEPLOYMENT_COMMIT, routes: ROUTES });
    if (req.method === "GET" && url.pathname === "/health") return sendJson(req, res, 200, { status: "ok", uptime: Number(process.uptime().toFixed(3)), timestamp: new Date().toISOString(), deploymentCommit: DEPLOYMENT_COMMIT, routes: ROUTES, env: { keygen: Boolean(KEYGEN_ACCOUNT_ID && KEYGEN_API_TOKEN && KEYGEN_PRODUCT_ID), openai: Boolean(OPENAI_API_KEY), anthropic: Boolean(ANTHROPIC_API_KEY) } });
    if (req.method === "GET" && url.pathname === "/api/version") return sendJson(req, res, 200, { name: APP_NAME, version: VERSION, node: process.version, platform: process.platform, deploymentCommit: DEPLOYMENT_COMMIT });
    if (req.method === "GET" && url.pathname === "/api/app-update") {
      const appVersion = String(url.searchParams.get("version") || "0.0.0");
      const platform = String(url.searchParams.get("platform") || "");
      return sendJson(req, res, 200, {
        name: APP_NAME,
        appVersion,
        latestVersion: LATEST_APP_VERSION,
        updateAvailable: compareVersions(LATEST_APP_VERSION, appVersion) > 0,
        forceUpdate: FORCE_UPDATE,
        deploymentCommit: DEPLOYMENT_COMMIT,
        downloadUrl: installerUrlForPlatform(platform),
        notes: UPDATE_NOTES || null,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/license/validate") {
      const body = await readJson(req);
      const licenseKey = String(body.licenseKey ?? "").trim();
      if (!licenseKey) return sendJson(req, res, 400, { valid: false, message: "Missing licenseKey" });
      return sendJson(req, res, 200, await validateLicenseWithKeygen({ licenseKey, fingerprint: String(body.fingerprint ?? "").trim() }));
    }

    if (req.method === "POST" && url.pathname === "/api/license/activate") {
      const body = await readJson(req);
      const licenseKey = String(body.licenseKey ?? "").trim();
      const fingerprint = String(body.fingerprint ?? "").trim();
      if (!licenseKey) return sendJson(req, res, 400, { valid: false, message: "Missing licenseKey" });
      const result = await validateLicenseWithKeygen({ licenseKey, fingerprint: "" });
      let machine = null;
      let finalResult = result;
      if (result.valid && fingerprint && result.licenseId) {
        machine = await createMachineForLicense({ licenseId: result.licenseId, fingerprint, name: body.machineName });
        finalResult = await validateLicenseWithKeygen({ licenseKey, fingerprint });
      }
      return sendJson(req, res, 200, { ...finalResult, activated: finalResult.valid, machine });
    }

    if (req.method === "POST" && url.pathname === "/api/validate-usb-license") {
      const body = await readJson(req);
      const licenseKey = String(body.licenseKey ?? "").trim();
      if (!licenseKey) {
        return sendJson(req, res, 400, { valid: false, reason: "Missing license key.", maskedLicense: null });
      }
      try {
        // USB dongle is the authentication factor — do not scope by machine fingerprint.
        const result = await validateLicenseWithKeygen({ licenseKey, fingerprint: "" });
        const maskedLicense = maskLicenseKey(licenseKey);
        if (result.valid) {
          const holderInfo = await getLicenseHolderInfo(result.licenseId);
          return sendJson(req, res, 200, {
            valid: true,
            reason: result.message || "License validated.",
            maskedLicense,
            userName: holderInfo.userName,
            userEmail: holderInfo.userEmail,
          });
        }
        return sendJson(req, res, 200, { valid: false, reason: result.message || "License is not active.", maskedLicense });
      } catch (error) {
        return sendJson(req, res, 200, { valid: false, reason: error.message || "Validation failed.", maskedLicense: null });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-report") {
      rateLimit(req, "ai", AI_RATE_LIMIT_MAX);
      const body = await readJson(req);
      await requireValidLicense(body);
      const reportText = String(body.reportText ?? body.text ?? "");
      const fileName = String(body.fileName ?? "credit-report.pdf");
      if (reportText.length < 40) return sendJson(req, res, 400, { ok: false, error: "Extracted report text is too short to analyze." });
      // Validate this looks like a credit report before spending AI tokens
      if (!isCreditReport(reportText)) {
        return sendJson(req, res, 422, {
          ok: false,
          error: "This file is not recognized as a credit report. To use this app, you need your official full credit report from one of the three major bureaus:\n\n• Experian — experian.com or call 1-888-397-3742\n• Equifax — equifax.com or call 1-800-685-1111\n• TransUnion — transunion.com or call 1-800-916-8800\n\nLog in or call, request your full credit report, and download it as a PDF. Then upload that file here.",
        });
      }
      // Claude → OpenAI → local deep scan
      const analysis =
        (await analyzeWithClaude({ reportText, fileName })) ??
        (await analyzeWithOpenAI({ reportText, fileName })) ??
        localDeepScan(reportText, fileName);
      return sendJson(req, res, 200, { ok: true, ...analysis });
    }

    if (req.method === "POST" && url.pathname === "/api/generate-letter") {
      rateLimit(req, "ai", AI_RATE_LIMIT_MAX);
      const body = await readJson(req);
      await requireValidLicense(body);
      const letter = await generateLetter(body);
      return sendJson(req, res, 200, { ok: true, id: randomUUID(), letter });
    }

    return sendJson(req, res, 404, { error: "Not Found", statusCode: 404 });
  } catch (error) {
    return sendJson(req, res, error.statusCode || 500, { error: error.message || "Server error", message: error.message || "Server error", statusCode: error.statusCode || 500, details: process.env.NODE_ENV === "development" ? error.details : undefined });
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`${APP_NAME} API listening on port ${PORT}`));
function shutdown(signal) { server.close(() => { console.log(`Received ${signal}; API server closed.`); process.exit(0); }); }
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
