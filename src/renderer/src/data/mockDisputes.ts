import type { DisputeLetter, DisputeCase } from "@/types";

export const mockLetters: DisputeLetter[] = [
  {
    id: "letter-1",
    clientId: "client-1",
    negativeItemId: "item-1",
    letterType: "debt_validation",
    bureau: "Experian",
    creditorName: "Midland Credit Management",
    accountNumberMasked: "•••• 4471",
    title: "Debt Validation Request — Midland Credit Management (Experian)",
    bodyText:
      "I am requesting validation of the debt reported by Midland Credit Management (account ending 4471). " +
      "Under the Fair Debt Collection Practices Act, I am entitled to request proof that this debt is valid, " +
      "that it belongs to me, and that the amount reported is accurate. Please provide documentation validating " +
      "this debt, including the original creditor's name, the amount owed, and proof of my responsibility for it.",
    createdAt: "2026-05-04T13:00:00.000Z",
    updatedAt: "2026-05-04T13:00:00.000Z",
  },
  {
    id: "letter-2",
    clientId: "client-1",
    negativeItemId: "item-3",
    letterType: "hard_inquiry_removal",
    bureau: "Experian",
    creditorName: "Synchrony Bank",
    accountNumberMasked: "•••• 1190",
    title: "Hard Inquiry Removal Request — Synchrony Bank (Experian)",
    bodyText:
      "I am disputing a hard inquiry on my credit report from Synchrony Bank (account ending 1190). I do not " +
      "recall authorizing this inquiry, and I am requesting that you investigate whether it was made with proper " +
      "permissible purpose under the Fair Credit Reporting Act. If authorization cannot be verified, please remove " +
      "this inquiry from my report.",
    createdAt: "2026-05-20T09:30:00.000Z",
    updatedAt: "2026-05-20T09:30:00.000Z",
  },
];

export const mockDisputeCases: DisputeCase[] = [
  {
    id: "case-1",
    clientId: "client-1",
    letterId: "letter-1",
    creditorName: "Midland Credit Management",
    bureau: "Experian",
    category: "collections",
    dateSent: "2026-05-05",
    nextRecommendedAction: "Awaiting bureau response — follow up if no reply by day 30.",
    status: "Sent",
    createdAt: "2026-05-04T13:05:00.000Z",
    updatedAt: "2026-05-05T08:00:00.000Z",
  },
  {
    id: "case-2",
    clientId: "client-1",
    letterId: "letter-2",
    creditorName: "Synchrony Bank",
    bureau: "Experian",
    category: "hard_inquiries",
    dateSent: "2026-05-21",
    responseReceivedDate: "2026-06-10",
    nextRecommendedAction: "Bureau verified the inquiry — consider requesting method of verification.",
    status: "Verified",
    createdAt: "2026-05-20T09:35:00.000Z",
    updatedAt: "2026-06-10T11:00:00.000Z",
  },
  {
    id: "case-3",
    clientId: "client-1",
    creditorName: "Atrium Health Billing",
    bureau: "Equifax",
    category: "medical_collections",
    nextRecommendedAction: "Draft and send a debt validation letter.",
    status: "Pending",
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z",
  },
  {
    id: "case-4",
    clientId: "client-3",
    creditorName: "Westlake Financial",
    bureau: "Equifax",
    category: "repossessions",
    dateSent: "2026-04-02",
    responseReceivedDate: "2026-05-01",
    nextRecommendedAction: "Item removed — monitor next statement cycle to confirm.",
    status: "Removed",
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-05-01T14:20:00.000Z",
  },
  {
    id: "case-5",
    clientId: "client-3",
    creditorName: "Carvana LLC",
    bureau: "TransUnion",
    category: "hard_inquiries",
    dateSent: "2026-05-10",
    responseReceivedDate: "2026-06-02",
    nextRecommendedAction: "No resolution after first dispute — escalation letter recommended.",
    status: "Escalated",
    createdAt: "2026-05-09T09:00:00.000Z",
    updatedAt: "2026-06-02T16:45:00.000Z",
  },
];
