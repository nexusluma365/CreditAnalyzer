import type { GenerateLetterInput, NegativeItem } from "@/types";
import { buildLetterDraft } from "./letterTemplates";
import { apiPost } from "./apiClient";
import { getLicenseAuthPayload } from "./keygenLicenseService";

export async function draftDisputeLetter(input: GenerateLetterInput): Promise<{ text: string; aiUsed: boolean }> {
  try {
    const auth = await getLicenseAuthPayload();
    if (!auth) throw new Error("License validation is required before AI letter generation.");
    const result = await apiPost<{ ok: boolean; letter: string }>("/api/generate-letter", { ...input, ...auth });
    if (result?.letter) return { text: result.letter, aiUsed: true };
  } catch {
    // AI unavailable — fall through to local educational template
  }
  // Minimum visual pause so the user understands analysis occurred
  await delay(1800);
  return { text: buildLetterDraft(input), aiUsed: false };
}

export async function suggestDisputeReasonForItem(item: NegativeItem): Promise<string> {
  await delay(250);
  if (item.issueFlags.includes("wrong_balance")) return "The balance reported does not match my records and may be inaccurate.";
  if (item.issueFlags.includes("duplicate_account")) return "This account appears to be reported more than once, which may be inflating my balances.";
  if (item.issueFlags.includes("unknown_account")) return "I do not recognize this account and have no record of opening it.";
  if (item.issueFlags.includes("date_mismatch")) return "The dates associated with this account are inconsistent across reporting periods.";
  if (item.issueFlags.includes("bureau_mismatch")) return "This item is reported differently across bureaus, which suggests a possible inaccuracy.";
  if (item.issueFlags.includes("missing_creditor_info")) return "This listing is missing standard creditor information needed to verify it.";
  return "I believe this item may contain inaccurate or unverifiable information.";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
