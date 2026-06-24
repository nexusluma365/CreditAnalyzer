// Core domain types. Mock data (src/data) and placeholder services
// (src/services) are both built against these so swapping in a real
// backend later (SQLite, OpenAI, Claude, Keygen) means only the services
// change — components and screens stay the same.

export type NegativeItemCategory =
  | "collections"
  | "charge_offs"
  | "repossessions"
  | "late_payments"
  | "hard_inquiries"
  | "medical_collections"
  | "student_loans"
  | "public_records";

export const CATEGORY_LABELS: Record<NegativeItemCategory, string> = {
  collections: "Collections",
  charge_offs: "Charge-Offs",
  repossessions: "Repossessions",
  late_payments: "Late Payments",
  hard_inquiries: "Hard Inquiries",
  medical_collections: "Medical Collections",
  student_loans: "Student Loans",
  public_records: "Public Records",
};

export type Bureau = "Experian" | "Equifax" | "TransUnion";

export type AccountIssueFlag =
  | "wrong_balance"
  | "duplicate_account"
  | "unknown_account"
  | "date_mismatch"
  | "bureau_mismatch"
  | "missing_creditor_info";

export const ISSUE_FLAG_LABELS: Record<AccountIssueFlag, string> = {
  wrong_balance: "Possible incorrect balance",
  duplicate_account: "Possible duplicate account",
  unknown_account: "Unrecognized account",
  date_mismatch: "Date inconsistency",
  bureau_mismatch: "Mismatch between bureaus",
  missing_creditor_info: "Missing creditor information",
};

export type DisputeLetterType =
  // ── Bureau investigation letters ─────────────────────────────
  | "609_investigation"          // FCRA §609 — request all documents bureau holds
  | "collection_dispute"         // General collection account dispute to bureau
  | "charge_off_dispute"         // Charge-off accuracy challenge to bureau
  | "method_of_verification"     // FCRA §611(a)(7) — how was this verified?
  // ── Sent to collector / furnisher ────────────────────────────
  | "debt_validation"            // FDCPA §809(b) — validate the debt
  | "creditor_direct"            // FCRA §623 — direct dispute to original creditor
  | "paid_collection"            // Request status update: paid/settled collection
  // ── Situation-specific bureau letters ────────────────────────
  | "hard_inquiry_removal"       // Unauthorized inquiry removal
  | "goodwill_letter"            // Goodwill late-payment removal (to creditor)
  | "repossession_dispute"       // Repo deficiency / balance inaccuracy
  | "medical_collection"         // Medical debt dispute (CFPB 2023 rules)
  | "bankruptcy_dispute"         // Bankruptcy reporting accuracy
  | "identity_theft"             // Fraudulent / unauthorized account
  | "outdated_account"           // FCRA §605 7-year obsolescence removal
  | "duplicate_account"          // Duplicate account reporting removal
  // ── Follow-up / escalation ───────────────────────────────────
  | "escalation_letter";         // Escalation after failed reinvestigation

export const LETTER_TYPE_LABELS: Record<DisputeLetterType, string> = {
  "609_investigation":       "§609 Investigation Request",
  collection_dispute:        "Collection Account Dispute",
  charge_off_dispute:        "Charge-Off Accuracy Dispute",
  method_of_verification:    "Method of Verification Request",
  debt_validation:           "Debt Validation Request (FDCPA)",
  creditor_direct:           "Direct Creditor Dispute (§623)",
  paid_collection:           "Paid Collection Status Update",
  hard_inquiry_removal:      "Unauthorized Inquiry Removal",
  goodwill_letter:           "Goodwill Adjustment Request",
  repossession_dispute:      "Repossession Dispute",
  medical_collection:        "Medical Collection Dispute",
  bankruptcy_dispute:        "Bankruptcy Reporting Dispute",
  identity_theft:            "Identity Theft / Fraud Block",
  outdated_account:          "Outdated Account Removal (§605)",
  duplicate_account:         "Duplicate Account Removal",
  escalation_letter:         "Escalation & Re-Investigation",
};

export type DisputeStatus = "Pending" | "Sent" | "Verified" | "Removed" | "Escalated";

export const DISPUTE_STATUSES: DisputeStatus[] = [
  "Pending",
  "Sent",
  "Verified",
  "Removed",
  "Escalated",
];

export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  createdAt: string;
  activeDisputes: number;
  reportsCount: number;
  avatarColor: string;
}

export interface CreditReportFile {
  id: string;
  clientId: string;
  fileName: string;
  bureau: Bureau | "Multiple" | "Unknown";
  uploadedAt: string;
  status: "uploaded" | "analyzing" | "analyzed" | "failed";
  pages?: number;
}

export interface NegativeItem {
  id: string;
  reportId: string;
  category: NegativeItemCategory;
  creditorName: string;
  accountNumberMasked: string;
  balance?: number;
  originalAmount?: number;
  dateOpened?: string;
  dateReported?: string;
  bureausReporting: Bureau[];
  issueFlags: AccountIssueFlag[];
  recommendedLetterType: DisputeLetterType;
  disputeOpportunityScore: number; // 0-100, research-informed prioritization signal
  notes: string;
}

export interface AnalysisResult {
  reportId: string;
  generatedAt: string;
  totalAccounts: number;
  totalNegativeItems: number;
  categoryCounts: Record<NegativeItemCategory, number>;
  overallRiskNote: string;
  qualityFlags: string[];
}

export interface DisputeLetter {
  id: string;
  clientId: string;
  negativeItemId?: string;
  letterType: DisputeLetterType;
  bureau: Bureau;
  creditorName: string;
  accountNumberMasked?: string;
  title: string;
  bodyText: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeCase {
  id: string;
  clientId: string;
  letterId?: string;
  creditorName: string;
  bureau: Bureau;
  category: NegativeItemCategory;
  dateSent?: string;
  responseReceivedDate?: string;
  nextRecommendedAction: string;
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
}

export type LicenseStatus = "active" | "inactive" | "expired" | "trial";

export interface LicenseInfo {
  key: string | null;
  status: LicenseStatus;
  plan: "individual" | "business" | null;
  activatedAt: string | null;
  trialDaysRemaining?: number;
  expiresAt?: string | null;
  message?: string;
}

export type ThemeMode = "dark" | "light";

export interface GenerateLetterInput {
  consumerName: string;
  bureau: Bureau;
  accountName: string;
  accountNumber: string;
  disputeReason: string;
  category: NegativeItemCategory;
  letterType: DisputeLetterType;
}
