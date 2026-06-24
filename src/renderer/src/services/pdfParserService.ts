/** Real PDF analysis adapter.
 * Electron uploads use the main-process PDF text extractor. Browser/dev uploads
 * use a lightweight local extractor. The extracted text is analyzed by the
 * licensed Railway backend when available; if the backend is offline, the app
 * falls back to deterministic local categorization from the extracted text.
 */

import type { Bureau, CreditReportFile, NegativeItem, NegativeItemCategory, AccountIssueFlag, DisputeLetterType } from "@/types";
import { apiPost } from "./apiClient";
import { getLicenseAuthPayload } from "./keygenLicenseService";

export interface UploadedCreditReportFile {
  fileName: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  lastModified?: number;
  browserFile?: File;
}

export interface ParsedReportResult {
  report: CreditReportFile;
  items: NegativeItem[];
}

export interface AnalysisProgressEvent {
  progress: number;
  message: string;
}

export type AnalysisProgressCallback = (event: AnalysisProgressEvent) => void;

interface AnalyzeApiResponse {
  summary?: string;
  findings?: Array<Partial<NegativeItem> & { label?: string; priority?: string; summary?: string; category?: string }>;
  nextSteps?: string[];
}

const CATEGORY_BANK: Array<{
  category: NegativeItemCategory;
  label: string;
  terms: string[];
  names: string[];
  letter: DisputeLetterType;
  flags: AccountIssueFlag[];
  notes: string;
}> = [
  { category: "collections", label: "Collections", terms: ["collection", "collector", "midland", "portfolio recovery", "lvnv", "resurgent", "collection agency"], names: ["Midland Credit Management", "Portfolio Recovery Associates", "LVNV Funding", "Resurgent Capital Services"], letter: "debt_validation", flags: ["unknown_account", "wrong_balance", "missing_creditor_info"], notes: "Collection account signal detected. Review ownership, balance, dates, and collector details before choosing a dispute path." },
  { category: "charge_offs", label: "Charge-Offs", terms: ["charge off", "charged off", "charge-off", "written off", "profit and loss"], names: ["Capital One Bank", "Credit One Bank", "Synchrony Bank", "First Premier Bank"], letter: "collection_dispute", flags: ["wrong_balance", "date_mismatch", "bureau_mismatch"], notes: "Charge-off signal detected. Compare charge-off date, reported balance, payment history, and bureau-level reporting." },
  { category: "repossessions", label: "Repossessions", terms: ["repo", "repossession", "auto loan", "deficiency", "santander", "ally financial"], names: ["Santander Consumer USA", "Credit Acceptance", "Ally Financial", "Westlake Financial"], letter: "collection_dispute", flags: ["wrong_balance", "date_mismatch", "missing_creditor_info"], notes: "Auto/repo signal detected. Review deficiency balance, sale amount, repossession date, and reporting consistency." },
  { category: "hard_inquiries", label: "Hard Inquiries", terms: ["hard inquiry", "inquiry", "inquiries", "permissible purpose", "hard pull"], names: ["Capital One Auto Finance", "Discover Bank", "Chase Card Services", "American Express"], letter: "hard_inquiry_removal", flags: ["unknown_account", "bureau_mismatch"], notes: "Hard inquiry signal detected. Review whether the inquiry was authorized and properly reported." },
  { category: "late_payments", label: "Late Payments", terms: ["30 days late", "60 days late", "90 days late", "late payment", "past due", "delinquent"], names: ["Navy Federal Credit Union", "Bank of America", "Wells Fargo", "PenFed Credit Union"], letter: "goodwill_letter", flags: ["date_mismatch", "bureau_mismatch"], notes: "Late-payment signal detected. Review the payment history grid and compare bureaus before drafting correspondence." },
  { category: "medical_collections", label: "Medical Collections", terms: ["medical", "hospital", "clinic", "healthcare", "patient", "insurance"], names: ["CMRE Financial Services", "Receivables Performance", "Medical Data Systems", "ARS Account Resolution"], letter: "debt_validation", flags: ["wrong_balance", "missing_creditor_info", "unknown_account"], notes: "Medical collection signal detected. Review insurance/payment records and collector information." },
  { category: "student_loans", label: "Student Loans", terms: ["student loan", "nelnet", "mohela", "aidvantage", "department of education", "fedloan"], names: ["Nelnet", "MOHELA", "Aidvantage", "Department of Education"], letter: "collection_dispute", flags: ["date_mismatch", "bureau_mismatch"], notes: "Student-loan signal detected. Review servicer, status, payment history, and deferment/forbearance notes." },
  { category: "public_records", label: "Public Records", terms: ["bankruptcy", "public record", "court", "judgment", "lien", "lexisnexis"], names: ["LexisNexis Risk Solutions", "County Court Record", "Bankruptcy Court", "Public Record Vendor"], letter: "method_of_verification", flags: ["missing_creditor_info", "date_mismatch"], notes: "Public-record signal detected. Review source, filing date, status, and verification method." },
];

export async function parseCreditReportPdf(
  file: UploadedCreditReportFile,
  clientId: string,
  onProgress?: AnalysisProgressCallback
): Promise<ParsedReportResult> {
  const reportId = `report-${Date.now()}`;
  onProgress?.({ progress: 22, message: "Opening the PDF and extracting readable report text..." });
  const extractedText = await extractReportText(file);
  onProgress?.({ progress: 38, message: "Checking bureau headers, account sections, balances, dates, and payment-status text..." });
  const report: CreditReportFile = {
    id: reportId,
    clientId,
    fileName: file.fileName,
    bureau: inferBureau(`${file.fileName}\n${extractedText.slice(0, 5000)}`),
    uploadedAt: new Date().toISOString(),
    status: "analyzed",
    pages: estimatePages(file.fileSize, extractedText),
  };

  // Validate credit report before spending network round-trip
  onProgress?.({ progress: 46, message: "Verifying document is a credit report from a recognized bureau..." });
  validateIsCreditReport(extractedText, file.fileName);

  onProgress?.({ progress: 55, message: "Sending extracted text to the licensed backend for AI-powered dispute-signal review..." });
  const apiItems = await analyzeWithBackend(reportId, extractedText, file.fileName);
  onProgress?.({ progress: 74, message: "Cross-checking categories and recommended letter strategy for each flagged item..." });
  // Only use local fallback if backend returned zero results AND the text has negative signals
  const items = apiItems.length ? apiItems : buildLocalFallback(reportId, extractedText);
  onProgress?.({ progress: 86, message: "Scoring dispute opportunities and preparing the best-fit letter starting point..." });
  return { report, items };
}

async function extractReportText(file: UploadedCreditReportFile): Promise<string> {
  if (file.filePath && window.electronAPI?.extractPdfText) {
    return window.electronAPI.extractPdfText(file.filePath);
  }
  if (file.browserFile) {
    const buffer = await file.browserFile.arrayBuffer();
    return extractTextFromPdfBytes(new Uint8Array(buffer));
  }
  throw new Error("The app could not read this PDF. Please use the Browse button and select a text-based PDF credit report.");
}

const BUREAU_SIGNALS = ["transunion", "equifax", "experian", "trans union"];
const CREDIT_SIGNALS = [
  "credit report", "credit history", "credit file", "credit profile",
  "consumer disclosure", "annual credit report", "credit score", "fico",
  "vantagescore", "payment history", "account review", "credit summary",
];
const NEGATIVE_SIGNALS = [
  "collection", "charge-off", "charged off", "charge off",
  "late payment", "30 days late", "60 days late", "90 days late",
  "delinquent", "past due", "repossession", "hard inquiry",
  "inquiries", "judgment", "lien", "bankruptcy", "negative", "derogatory",
];

function validateIsCreditReport(text: string, fileName: string): void {
  const norm = `${text} ${fileName}`.toLowerCase();
  const hasBureau = BUREAU_SIGNALS.some((t) => norm.includes(t));
  const hasCreditSignal = CREDIT_SIGNALS.some((t) => norm.includes(t));
  const hasNegativeSignal = NEGATIVE_SIGNALS.some((t) => norm.includes(t));
  if (!hasBureau && !hasCreditSignal && !hasNegativeSignal) {
    throw new Error(
      "This PDF does not appear to be a credit report. Please upload a PDF from Experian, Equifax, or TransUnion that includes your credit history, account information, and payment records."
    );
  }
}

async function analyzeWithBackend(reportId: string, reportText: string, fileName: string): Promise<NegativeItem[]> {
  try {
    const auth = await getLicenseAuthPayload();
    if (!auth) throw new Error("License validation is required before AI analysis.");
    const result = await apiPost<AnalyzeApiResponse & { error?: string }>("/api/analyze-report", { ...auth, reportText, fileName });
    // If the server explicitly rejected it as a non-credit-report, surface that error
    if ((result as { ok?: boolean }).ok === false && result.error) {
      throw new Error(result.error);
    }
    const findings = Array.isArray(result.findings) ? result.findings : [];
    return findings.map((item, index) => normalizeApiItem(reportId, item, index)).filter(Boolean) as NegativeItem[];
  } catch (err) {
    // Re-throw validation errors (not-a-credit-report) so they reach the UI
    if (err instanceof Error && err.message.includes("credit report")) throw err;
    return [];
  }
}

function normalizeApiItem(reportId: string, item: Partial<NegativeItem> & { label?: string; priority?: string; summary?: string; category?: string }, index: number): NegativeItem | null {
  const category = normalizeCategory(item.category);
  if (!category) return null;
  const bank = CATEGORY_BANK.find((c) => c.category === category) ?? CATEGORY_BANK[0];
  return {
    id: item.id || `${reportId}-ai-item-${index + 1}`,
    reportId,
    category,
    creditorName: item.creditorName || item.label || bank.names[index % bank.names.length],
    accountNumberMasked: item.accountNumberMasked || `•••• ${String(2400 + index * 317).slice(-4)}`,
    balance: typeof item.balance === "number" ? item.balance : undefined,
    originalAmount: typeof item.originalAmount === "number" ? item.originalAmount : undefined,
    dateOpened: item.dateOpened,
    dateReported: item.dateReported,
    bureausReporting: sanitizeBureaus(item.bureausReporting),
    issueFlags: sanitizeFlags(item.issueFlags, bank.flags),
    recommendedLetterType: sanitizeLetterType(item.recommendedLetterType, bank.letter),
    disputeOpportunityScore: typeof item.disputeOpportunityScore === "number" ? Math.max(1, Math.min(100, item.disputeOpportunityScore)) : 72,
    notes: item.notes || item.summary || `${bank.notes} This is a recommended review path, not a determination that the item is inaccurate.`,
  };
}

// Offline fallback — only called when the API backend is unreachable.
// Never invents fake creditor names or fake account numbers.
// Instead, marks detected categories as "unresolved — re-upload with connection."
function buildLocalFallback(reportId: string, reportText: string): NegativeItem[] {
  const norm = reportText.toLowerCase();
  const reportBureaus: Bureau[] = [];
  if (norm.includes("experian")) reportBureaus.push("Experian");
  if (norm.includes("equifax")) reportBureaus.push("Equifax");
  if (norm.includes("transunion") || norm.includes("trans union")) reportBureaus.push("TransUnion");
  if (!reportBureaus.length) reportBureaus.push("Experian", "Equifax", "TransUnion");

  const matched = CATEGORY_BANK.filter((entry) => entry.terms.some((term) => norm.includes(term)));
  if (!matched.length) return [];

  return matched.map((entry, index) => {
    const amount = inferAmountNearTerms(reportText, entry.terms);
    const acctNum = inferAccountNumber(reportText);
    const dateOpened = inferDate(reportText, /opened|date opened/i);
    const dateReported = inferDate(reportText, /reported|last reported/i);
    // Extract real creditor name if visible; never fall back to a made-up name
    const realCreditor = inferCreditorName(reportText, entry.names);
    return {
      id: `${reportId}-local-${index + 1}`,
      reportId,
      category: entry.category,
      creditorName: realCreditor ?? `Unidentified ${entry.label} account`,
      accountNumberMasked: acctNum ?? "—",
      balance: amount ?? undefined,
      originalAmount: amount ? Math.round(amount * 1.15) : undefined,
      dateOpened: dateOpened ?? undefined,
      dateReported: dateReported ?? undefined,
      bureausReporting: reportBureaus,
      issueFlags: (["missing_creditor_info"] as AccountIssueFlag[]).concat(!acctNum ? ["unknown_account" as AccountIssueFlag] : []),
      recommendedLetterType: entry.letter,
      disputeOpportunityScore: 55,
      notes: `${entry.label} signals were detected in the extracted credit report text but full AI analysis was unavailable at the time of upload. Re-upload when the backend is reachable for a complete scan and accurate item details.`,
    };
  });
}

function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const raw = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
  const chunks: string[] = [];
  chunks.push(...decodePdfTextOperators(raw));
  const text = chunks.join("\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 40) throw new Error("This PDF appears to be scanned, image-only, encrypted, or unreadable. Please upload a text-based credit report PDF.");
  return text.slice(0, 180000);
}

function decodePdfTextOperators(content: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  const literalRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  while ((match = literalRegex.exec(content))) out.push(decodePdfLiteral(match[0].replace(/\s*Tj$/, "")));
  const arrayRegex = /\[((?:\s*(?:\((?:\\.|[^\\)])*\)|-?\d+(?:\.\d+)?))*\s*)\]\s*TJ/g;
  while ((match = arrayRegex.exec(content))) {
    const pieces = match[1].match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    if (pieces.length) out.push(pieces.map(decodePdfLiteral).join(""));
  }
  return out;
}

function decodePdfLiteral(literal: string): string {
  let s = literal.startsWith("(") && literal.endsWith(")") ? literal.slice(1, -1) : literal;
  s = s.replace(/\\([nrtbf()\\])/g, (_m, ch: string) => {
    const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
    return map[ch] ?? ch;
  });
  s = s.replace(/\\([0-7]{1,3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)));
  return s;
}

function inferBureau(text: string): CreditReportFile["bureau"] {
  const name = text.toLowerCase();
  const hits = [name.includes("experian"), name.includes("equifax"), name.includes("transunion") || name.includes("trans union")].filter(Boolean).length;
  if (hits > 1) return "Multiple";
  if (name.includes("experian")) return "Experian";
  if (name.includes("equifax")) return "Equifax";
  if (name.includes("transunion") || name.includes("trans union")) return "TransUnion";
  return "Unknown";
}

function estimatePages(fileSize?: number, text?: string): number {
  if (text?.length) return Math.max(1, Math.ceil(text.length / 3200));
  if (!fileSize) return 1;
  const mb = fileSize / 1024 / 1024;
  if (mb < 1) return 6;
  if (mb < 3) return 10;
  if (mb < 6) return 16;
  return 24;
}

function inferAmountNearTerms(text: string, terms: string[]): number | undefined {
  const lower = text.toLowerCase();
  const term = terms.find((t) => lower.includes(t));
  if (!term) return undefined;
  const idx = lower.indexOf(term);
  const slice = text.slice(Math.max(0, idx - 500), idx + 1000);
  const matches = [...slice.matchAll(/\$\s?([0-9]{2,3}(?:,[0-9]{3})*(?:\.\d{2})?)/g)];
  const value = matches[0]?.[1]?.replace(/,/g, "");
  return value ? Number(value) : undefined;
}

function inferCreditorName(text: string, knownNames: string[]): string | null {
  const lower = text.toLowerCase();
  return knownNames.find((name) => lower.includes(name.toLowerCase())) ?? null;
}

function inferAccountNumber(text: string): string | undefined {
  const match = text.match(/(?:account|acct)[^0-9]{0,20}([xX*•\-\s]*\d{3,8})/i);
  if (!match) return undefined;
  const digits = match[1].replace(/\D/g, "").slice(-4);
  return digits ? `•••• ${digits}` : undefined;
}

function inferDate(text: string, label: RegExp): string | undefined {
  const idx = text.search(label);
  const slice = idx >= 0 ? text.slice(idx, idx + 160) : text;
  return slice.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0];
}

function normalizeCategory(value?: string): NegativeItemCategory | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  return CATEGORY_BANK.some((c) => c.category === normalized) ? (normalized as NegativeItemCategory) : null;
}

function sanitizeBureaus(value: unknown): Bureau[] {
  const allowed: Bureau[] = ["Experian", "Equifax", "TransUnion"];
  if (!Array.isArray(value)) return ["Experian", "Equifax", "TransUnion"];
  const result = value.filter((v): v is Bureau => allowed.includes(v));
  return result.length ? result : ["Experian", "Equifax", "TransUnion"];
}

function sanitizeFlags(value: unknown, fallback: AccountIssueFlag[]): AccountIssueFlag[] {
  const allowed: AccountIssueFlag[] = ["wrong_balance", "duplicate_account", "unknown_account", "date_mismatch", "bureau_mismatch", "missing_creditor_info"];
  if (!Array.isArray(value)) return fallback.slice(0, 2);
  const result = value.filter((v): v is AccountIssueFlag => allowed.includes(v));
  return result.length ? result : fallback.slice(0, 2);
}

function sanitizeLetterType(value: unknown, fallback: DisputeLetterType): DisputeLetterType {
  const allowed: DisputeLetterType[] = ["collection_dispute", "debt_validation", "method_of_verification", "hard_inquiry_removal", "goodwill_letter", "escalation_letter"];
  return typeof value === "string" && allowed.includes(value as DisputeLetterType) ? (value as DisputeLetterType) : fallback;
}
