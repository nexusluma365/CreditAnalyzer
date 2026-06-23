/**
 * claudeService.ts
 * -----------------
 * PLACEHOLDER. All functions return mock/sample data so the UI works fully
 * before a real API key is added.
 *
 * Intended real responsibility (per the product spec):
 *   - Review overall report structure, account categorization, and
 *     surface workflow suggestions / quality checks on the analysis
 *     produced from a parsed credit report.
 *
 * TO GO LIVE LATER:
 *   1. Add a secure backend-provided Anthropic configuration.
 *   2. Replace the mock body of `reviewAnalysis` with a real call to
 *      https://api.anthropic.com/v1/messages, passing the extracted
 *      negative items as structured input and requesting structured
 *      JSON output (categoryCounts, notes, qualityFlags).
 *   3. Keep the return shape (AnalysisResult) stable — AnalysisResultsScreen
 *      and CategoriesScreen already render against it.
 *
 * COMPLIANCE: Output should present research-informed recommendations — describe
 * patterns, possibilities, and best-fit dispute paths, never assert a legal
 * conclusion or promise a specific outcome.
 */

import type { AnalysisResult, NegativeItem, NegativeItemCategory } from "@/types";

export async function reviewAnalysis(
  reportId: string,
  items: NegativeItem[]
): Promise<AnalysisResult> {
  await delay(900);

  const categoryCounts: Record<NegativeItemCategory, number> = {
    collections: 0,
    charge_offs: 0,
    repossessions: 0,
    late_payments: 0,
    hard_inquiries: 0,
    medical_collections: 0,
    student_loans: 0,
    public_records: 0,
  };
  for (const item of items) {
    categoryCounts[item.category] += 1;
  }

  const qualityFlags: string[] = [];
  const flaggedItems = items.filter((i) => i.issueFlags.length > 0);
  if (flaggedItems.length > 0) {
    qualityFlags.push(
      `${flaggedItems.length} of ${items.length} item(s) have one or more possible inaccuracy flags worth reviewing.`
    );
  }
  const highOpportunity = items.filter((i) => i.disputeOpportunityScore >= 70);
  if (highOpportunity.length > 0) {
    qualityFlags.push(
      `${highOpportunity.length} item(s) show a higher research-informed dispute-priority signal and may be worth reviewing first.`
    );
  }

  return {
    reportId,
    generatedAt: new Date().toISOString(),
    totalAccounts: items.length + 6, // mock: includes positive accounts not shown here
    totalNegativeItems: items.length,
    categoryCounts,
    overallRiskNote:
      "Luma Intelligence uses research-informed dispute strategy to recommend the best-fit review path for each item. This is not a legal determination, and outcomes can vary.",
    qualityFlags,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
