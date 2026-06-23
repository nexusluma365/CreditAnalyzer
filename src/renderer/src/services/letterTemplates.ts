import type { GenerateLetterInput, DisputeLetterType } from "@/types";
import { LETTER_TYPE_LABELS } from "@/types";

const TODAY = () =>
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const BUREAU_ADDRESSES: Record<string, string> = {
  Experian: "Experian\nP.O. Box 4500\nAllen, TX 75013",
  Equifax: "Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374",
  TransUnion: "TransUnion LLC Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016",
};

const DISCLAIMER =
  "Research-informed draft prepared with Luma Intelligence's recommended dispute strategy. This is not " +
  "legal advice, and outcomes can vary. Please review all details for accuracy before sending.";

function bodyFor(type: DisputeLetterType, input: GenerateLetterInput): string {
  const { consumerName, accountName, accountNumber, disputeReason } = input;
  const acctRef = accountNumber ? ` (account ending ${accountNumber})` : "";

  switch (type) {
    case "collection_dispute":
      return (
        `My name is ${consumerName}. I am writing to dispute the following item appearing on my credit report: ` +
        `an account listed under ${accountName}${acctRef}. After reviewing my records, I believe this item may ` +
        `be inaccurate, incomplete, or unverifiable for the following reason: ${disputeReason} I am requesting ` +
        `that you investigate this item and correct or remove it from my report if it cannot be fully verified.`
      );
    case "debt_validation":
      return (
        `My name is ${consumerName}. I am requesting validation of the debt reported by ${accountName}${acctRef}. ` +
        `Under the Fair Debt Collection Practices Act, I am entitled to request proof that this debt is valid, ` +
        `that it belongs to me, and that the amount reported is accurate. My reason for this request: ` +
        `${disputeReason} Please provide documentation validating this debt, including the original creditor's ` +
        `name, the amount owed, and proof of my responsibility for it.`
      );
    case "method_of_verification":
      return (
        `My name is ${consumerName}. I previously disputed the item listed under ${accountName}${acctRef}, and ` +
        `your response indicated the item was "verified." I am requesting the specific method of verification ` +
        `used — including what documentation was reviewed and who at the furnisher was contacted. Context for ` +
        `this request: ${disputeReason}`
      );
    case "hard_inquiry_removal":
      return (
        `My name is ${consumerName}. I am disputing a hard inquiry on my credit report from ${accountName}${acctRef}. ` +
        `${disputeReason} I am requesting that you investigate whether this inquiry was made with proper ` +
        `permissible purpose under the Fair Credit Reporting Act, and remove it if authorization cannot be verified.`
      );
    case "goodwill_letter":
      return (
        `My name is ${consumerName}. I am writing to respectfully request a goodwill adjustment regarding an item ` +
        `reported by ${accountName}${acctRef}. ${disputeReason} I value my relationship with this creditor and ` +
        `am asking whether you would consider a goodwill adjustment given my overall account history.`
      );
    case "escalation_letter":
      return (
        `My name is ${consumerName}. I am escalating an unresolved dispute regarding an item from ` +
        `${accountName}${acctRef}. My prior dispute did not result in a satisfactory resolution within the ` +
        `expected timeframe. ${disputeReason} I am requesting that this matter be reviewed by a senior member ` +
        `of your dispute resolution team, along with a complete written explanation of the outcome.`
      );
  }
}

export function buildLetterDraft(input: GenerateLetterInput): string {
  const address = BUREAU_ADDRESSES[input.bureau] ?? input.bureau;
  const body = bodyFor(input.letterType, input);

  return `${TODAY()}

${address}

To Whom It May Concern,

${body}

Please investigate this matter and provide a written response within the timeframe required by the Fair Credit Reporting Act.

Sincerely,
${input.consumerName}

---
${DISCLAIMER}`;
}

export function letterTitleFor(input: GenerateLetterInput): string {
  return `${LETTER_TYPE_LABELS[input.letterType]} — ${input.accountName} (${input.bureau})`;
}
