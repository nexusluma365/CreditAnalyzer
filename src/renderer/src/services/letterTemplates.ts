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

export const COLLECTOR_SEND_NOTE =
  "Send via certified mail, return receipt requested, to the collection agency or original creditor — NOT to the credit bureau.";

const DISCLAIMER =
  "Suggested draft prepared by Luma Intelligence based on your dispute category and account details. This is an educational template — not legal advice, and outcomes vary. Review carefully and personalize before sending.";

function bodyFor(type: DisputeLetterType, input: GenerateLetterInput): string {
  const { consumerName, accountName, accountNumber, disputeReason } = input;
  const acctRef = accountNumber ? ` (account ending ${accountNumber})` : "";

  switch (type) {
    case "609_investigation":
      return (
        `My name is ${consumerName}, and I am exercising my rights under Section 609 of the Fair Credit Reporting Act (15 U.S.C. § 1681g) to request all information in my consumer file related to the account listed under ${accountName}${acctRef}.\n\n` +
        `Pursuant to this right, I am formally requesting that ${input.bureau} provide me with copies of all documents, original contracts, credit applications, subscriber agreements, payment records, account statements, and any other source data that was used to create, populate, or verify this account in my credit report. This includes any documentation obtained from the furnisher during any prior verification process.\n\n` +
        `If the required source documents cannot be produced in full, this account must be promptly deleted from my credit report. An unverifiable item has no legal basis for continued reporting under the FCRA. I am requesting a written response and copies of all supporting documentation within 30 days as required by law. The specific concern prompting this request is: ${disputeReason}`
      );

    case "collection_dispute":
      return (
        `My name is ${consumerName}. I am writing to formally dispute the collection account listed on my credit report under ${accountName}${acctRef}. I am exercising my right to a reinvestigation under Section 611 of the Fair Credit Reporting Act (15 U.S.C. § 1681i).\n\n` +
        `The specific basis for my dispute is as follows: ${disputeReason} I believe this item may be inaccurate, incomplete, or unverifiable under FCRA standards. Common grounds for disputing this type of account include lack of proper documentation, a balance that does not match what was originally reported, a statute of limitations that has expired, or inconsistent reporting across bureaus.\n\n` +
        `Pursuant to 15 U.S.C. § 1681i, I am requesting that ${input.bureau} conduct a thorough reinvestigation of this item. If the collection agency or furnisher cannot provide complete, accurate, and verifiable documentation supporting every element of this account as reported, the item must be corrected or deleted. Please provide written notice of the results of your investigation within 30 days as required under the FCRA.`
      );

    case "charge_off_dispute":
      return (
        `My name is ${consumerName}. I am writing to dispute the accuracy of a charge-off account appearing on my credit report from ${accountName}${acctRef}. Under Section 623 of the Fair Credit Reporting Act (15 U.S.C. § 1681s-2), furnishers of information have a legal duty to report accurate and complete data to consumer reporting agencies.\n\n` +
        `The specific issue I am disputing is: ${disputeReason} Additional grounds that may apply include: the charge-off date may be incorrectly reported; the balance listed may exceed the actual amount at the time of charge-off; this account may also be simultaneously reported by a collection agency, creating duplicate negative entries in my file; or the account status may differ between bureaus, suggesting reporting inconsistencies.\n\n` +
        `I am requesting that ${input.bureau} investigate the accuracy of the charge-off date, the reported balance, the account status, and whether duplicate reporting exists for this same debt. If the information cannot be verified as accurate in all material respects, the item must be corrected or deleted pursuant to 15 U.S.C. § 1681i. Please respond in writing within 30 days.`
      );

    case "method_of_verification":
      return (
        `My name is ${consumerName}. I previously submitted a formal dispute regarding the account listed under ${accountName}${acctRef}, and ${input.bureau} responded indicating the item had been "verified." I am now invoking my right under Section 611(a)(7) of the Fair Credit Reporting Act (15 U.S.C. § 1681i(a)(7)) to receive a full description of the procedure used to determine the accuracy and completeness of the disputed information.\n\n` +
        `Specifically, I am requesting: (1) the name, address, and telephone number of the furnisher that was contacted during the reinvestigation; (2) the specific documents or records reviewed to verify the disputed information; (3) the name or role of the individual at the furnisher who responded; and (4) whether the verification involved review of original source documents or was conducted via automated dispute resolution only (e.g., an e-OSCAR ACDV submission).\n\n` +
        `Please be aware that if the furnisher responded solely with a coded automated response without reviewing original documentation, that process may not constitute adequate verification under the FCRA. The context for my continued dispute is: ${disputeReason} I am requesting this information in writing within 30 days.`
      );

    case "debt_validation":
      return (
        `My name is ${consumerName}. I am writing to formally request validation of the debt your agency is attempting to collect, associated with ${accountName}${acctRef}. This request is made pursuant to Section 809(b) of the Fair Debt Collection Practices Act (15 U.S.C. § 1692g), which grants consumers the right to dispute a debt and request verification within 30 days of first contact.\n\n` +
        `I am requesting the following information in writing: (1) the name and address of the original creditor to whom the debt is owed; (2) an itemized breakdown of the total amount claimed, including principal, interest, fees, and any other charges; (3) proof that your agency is licensed to collect debts in my state; (4) a copy of any signed agreement or contract establishing my obligation for this debt; and (5) proof of assignment or purchase documentation showing your agency's authority to collect on this account. The reason I am disputing this debt is: ${disputeReason}\n\n` +
        `Please note that until this debt is properly validated as required by the FDCPA, you are required to cease all collection activity, including any credit reporting or communication to me about this account. This is a time-sensitive right — if this is within 30 days of your initial contact, this letter serves as my formal dispute and validation request under 15 U.S.C. § 1692g. Send all responses via certified mail.`
      );

    case "creditor_direct":
      return (
        `My name is ${consumerName}. I am submitting a formal direct dispute to your organization regarding information you have furnished to the credit reporting agencies about my account with ${accountName}${acctRef}. This dispute is submitted pursuant to Section 623(a)(8) of the Fair Credit Reporting Act (15 U.S.C. § 1681s-2(a)(8)), which grants consumers the right to dispute inaccurate information directly with the furnisher.\n\n` +
        `The specific inaccuracy I am disputing is: ${disputeReason} This may involve one or more of the following: an incorrect balance or amount reported; an inaccurate account status (e.g., showing open when the account is closed or charged off); incorrect payment history markings; a wrong date of first delinquency; or other factual errors in the data you are reporting.\n\n` +
        `Under 15 U.S.C. § 1681s-2(a)(8), you are required to investigate this dispute within 30 days and report any corrections to all consumer reporting agencies to which you furnish information. I am requesting written confirmation of the results of your investigation and documentation of any corrections submitted to the bureaus. Please respond within 30 days as required by law.`
      );

    case "paid_collection":
      return (
        `My name is ${consumerName}. I am writing to request an update to the reporting status of a collection account listed under ${accountName}${acctRef} that has been paid or settled. Despite this account having been resolved, it continues to be reported with an inaccurate status — such as "open," "unpaid," or "in collections" — which does not reflect the current state of this debt.\n\n` +
        `Under 15 U.S.C. § 1681e(b), consumer reporting agencies are required to follow reasonable procedures to ensure maximum possible accuracy in the information they report. Continuing to report a collection as unpaid or open after payment has been made is a violation of this accuracy standard. I am requesting that ${input.bureau} update this account to reflect its accurate current status as "Paid in Full" or "Settled," and confirm the balance is reported as $0. The basis for my request is: ${disputeReason}\n\n` +
        `If the original collection agency had agreed to a pay-for-delete arrangement, I am additionally requesting full deletion of this item from my credit report. Please investigate the current status of this account with the furnisher and update the reporting accordingly. I am requesting written confirmation of any corrections within 30 days.`
      );

    case "hard_inquiry_removal":
      return (
        `My name is ${consumerName}. I am disputing a hard inquiry appearing on my credit report from ${accountName}${acctRef}. I am exercising my rights under Section 604 of the Fair Credit Reporting Act (15 U.S.C. § 1681b), which defines the permissible purposes for which a consumer report may be accessed.\n\n` +
        `I did not apply for credit with this company. I did not authorize a hard inquiry or credit pull from this entity, and I have no existing or pending business relationship with ${accountName} that would constitute a permissible purpose under the FCRA. The circumstances surrounding this unauthorized inquiry are: ${disputeReason}\n\n` +
        `Accessing a consumer credit report without a legally permissible purpose is a violation of the FCRA. I am requesting that ${input.bureau} immediately investigate the authorization and purpose of this inquiry, and remove it from my credit report if valid consumer authorization cannot be confirmed. Unauthorized inquiries must be deleted regardless of the inquiring party's intent. Please provide written confirmation of the deletion or investigation results within 30 days.`
      );

    case "goodwill_letter":
      return (
        `My name is ${consumerName}, and I am reaching out to respectfully request a goodwill adjustment regarding a late payment notation on my account with ${accountName}${acctRef}.\n\n` +
        `I want to acknowledge that the late payment did occur, and I take full responsibility for that. The circumstances that led to it were: ${disputeReason} Outside of this instance, I am proud of the payment history I have maintained on this account. Before and after this late mark, I have consistently made on-time payments and have worked to honor my financial commitments.\n\n` +
        `I am not asking you to alter the underlying account record or claim the late payment did not happen. I am simply asking whether your organization would consider a one-time goodwill courtesy — removing the late payment notation from the credit bureau reporting — given my overall history with your company. I understand this is entirely at your discretion, and I am grateful for your consideration.\n\n` +
        `This type of goodwill adjustment can make a meaningful difference for individuals working to maintain their financial standing. If you are able to honor this request, I would greatly appreciate written confirmation of the update. Thank you sincerely for your time and consideration.`
      );

    case "repossession_dispute":
      return (
        `My name is ${consumerName}. I am writing to dispute the accuracy of the repossession account listed under ${accountName}${acctRef} on my credit report. I am exercising my right to a reinvestigation under Section 611 of the Fair Credit Reporting Act (15 U.S.C. § 1681i).\n\n` +
        `The specific concern I am raising is: ${disputeReason} Additional grounds that may apply include: the deficiency balance listed does not accurately reflect the net proceeds from the vehicle's sale at auction or private sale; the repossession date may be incorrectly reported; the account status may not accurately distinguish between a voluntary surrender and an involuntary repossession; or the reported balance may include fees or charges that were not properly disclosed.\n\n` +
        `I am requesting that ${input.bureau} investigate and obtain from the furnisher the following documentation: auction or sale records showing the proceeds applied to the balance; the final deficiency calculation after sale proceeds; and any notice of right to redeem or notice of disposition required under UCC Article 9. If the deficiency balance cannot be substantiated with proper sale documentation, or if any other element of this account is found to be inaccurate, I am requesting correction or deletion pursuant to 15 U.S.C. § 1681i. Please respond in writing within 30 days.`
      );

    case "medical_collection":
      return (
        `My name is ${consumerName}. I am writing to dispute a medical collection account appearing on my credit report from ${accountName}${acctRef}. I am invoking my consumer rights under the FDCPA (15 U.S.C. § 1692g), applicable CFPB medical debt guidance, and HIPAA privacy protections.\n\n` +
        `The specific basis for my dispute is: ${disputeReason} I am also requesting full validation of this debt, including: an itemized billing statement from the original healthcare provider; documentation showing how insurance adjudication was applied and whether any applicable claims were submitted and denied; the name and contact information of the original healthcare provider; and proof that this collection agency is authorized to collect on this account. Please note that HIPAA places significant restrictions on what protected health information may be shared in the collections process.\n\n` +
        `Additionally, the CFPB's 2024 medical debt final rule significantly limits the reporting of medical debt on consumer credit reports, and debts under certain thresholds are no longer eligible for bureau reporting under updated industry guidance. I am requesting that ${input.bureau} investigate the validity, amount, and reportability of this account and delete or correct it if it cannot be fully substantiated. Please respond in writing within 30 days.`
      );

    case "bankruptcy_dispute":
      return (
        `My name is ${consumerName}. I am writing to dispute the accuracy of bankruptcy-related information appearing on my credit report, associated with ${accountName}${acctRef}. I am exercising my rights under Section 611 of the Fair Credit Reporting Act (15 U.S.C. § 1681i) and citing the reporting limitations of 15 U.S.C. § 1681c.\n\n` +
        `The specific inaccuracy I am disputing is: ${disputeReason} Additional concerns that may apply include: the bankruptcy may have been dismissed rather than discharged, and should not be reported as completed; accounts that were discharged in bankruptcy should show a balance of $0 with a status of "Discharged in Bankruptcy," not as open or delinquent; the bankruptcy filing date may be incorrectly listed; or individual accounts are being reported both separately as negative items and as part of bankruptcy, creating duplicate derogatory entries.\n\n` +
        `Under 15 U.S.C. § 1681c, a Chapter 7 bankruptcy may only be reported for 10 years from the filing date, and a Chapter 13 bankruptcy may only be reported for 7 years. I am requesting that ${input.bureau} verify the accuracy of the bankruptcy filing date, status, type, and all associated accounts, and correct any reporting inconsistencies or violations. Please respond in writing within 30 days.`
      );

    case "identity_theft":
      return (
        `My name is ${consumerName}. I am a victim of identity theft, and I am writing to formally request that ${input.bureau} block the fraudulent account listed under ${accountName}${acctRef} from my credit report. This request is made pursuant to Section 605B of the Fair Credit Reporting Act (15 U.S.C. § 1681c-2), which requires consumer reporting agencies to block information resulting from identity theft within four business days of receiving an identity theft report.\n\n` +
        `I never opened, authorized, applied for, or benefited from this account in any way. This account was created without my knowledge or consent as a result of identity theft. I am prepared to provide a copy of my FTC Identity Theft Report (filed at IdentityTheft.gov) and, if available, a copy of my police report. The circumstances are as follows: ${disputeReason}\n\n` +
        `This is not a standard dispute under Section 611 — this is a legal blocking request under Section 605B, which carries a 4-business-day response requirement. I am also requesting placement of an extended 7-year fraud alert on my file as permitted by 15 U.S.C. § 1681c-1. Please block this account immediately, provide written confirmation of the block, and notify all other consumer reporting agencies and the furnisher of the block as required by law.`
      );

    case "outdated_account":
      return (
        `My name is ${consumerName}. I am writing to request the immediate removal of an account from my credit report that has exceeded its legally permissible reporting period. The account in question is listed under ${accountName}${acctRef}. This request is made under Section 605(a) of the Fair Credit Reporting Act (15 U.S.C. § 1681c(a)).\n\n` +
        `Under the FCRA, most negative items — including collection accounts, charge-offs, late payments, and other derogatory entries — must be removed from a consumer's credit report no later than seven years from the date of first delinquency (DOFD) on the original account that gave rise to the negative item. The DOFD for this account indicates that the account has met or exceeded this 7-year limit. The specific basis for this dispute is: ${disputeReason}\n\n` +
        `Please note that even if the underlying debt is accurate, its continued reporting is not legally permissible beyond the 7-year period established by 15 U.S.C. § 1681c(a). An item that is accurate but obsolete under the law must still be removed. I am requesting that ${input.bureau} verify the date of first delinquency for this account and promptly delete it from my report if it has exceeded the statutory reporting period. Please confirm deletion in writing within 30 days.`
      );

    case "duplicate_account":
      return (
        `My name is ${consumerName}. I am writing to dispute the duplicate reporting of a single account that appears twice on my credit report — once under the original creditor, ${accountName}${acctRef}, and again under a collection agency reporting the same underlying debt. This creates an unfair and inaccurate double-negative impact on my credit profile for a single financial obligation.\n\n` +
        `Under the Fair Credit Reporting Act, consumer reporting agencies are required to follow reasonable procedures to ensure the maximum possible accuracy of the information they report (15 U.S.C. § 1681e(b)), and Section 611 (15 U.S.C. § 1681i) establishes the right to reinvestigation of disputed items. Reporting the same debt twice — as both an original creditor account and a collection account — constitutes inaccurate and misleading reporting that unfairly penalizes consumers. The specific circumstances are: ${disputeReason}\n\n` +
        `I am requesting that ${input.bureau} investigate both entries and remove the duplicate, retaining only one accurate representation of this debt in my credit file. If neither entry can be fully verified as distinct and non-duplicative, both should be removed. Please provide written confirmation of the investigation results and any corrections made within 30 days.`
      );

    case "escalation_letter":
      return (
        `My name is ${consumerName}. I am writing to formally escalate an unresolved dispute regarding the account listed under ${accountName}${acctRef}. I previously submitted a dispute to ${input.bureau}, and the required response period has elapsed without a satisfactory resolution. The prior dispute concerned: ${disputeReason}\n\n` +
        `The response I received — or the lack thereof — did not adequately resolve the matter. A conclusory "verified" determination without substantive documentation does not meet the reinvestigation standard established under 15 U.S.C. § 1681i. I am requesting that this matter be immediately escalated to a senior reinvestigation specialist for a full review, including a direct examination of the original source documents provided by the furnisher.\n\n` +
        `Please be advised that I intend to file complaints with the Consumer Financial Protection Bureau (consumerfinance.gov/complaint), the Federal Trade Commission, and the applicable state attorney general's office if this dispute is not resolved appropriately. Furthermore, the continued reporting of an unverifiable item following a proper and timely consumer dispute may constitute willful noncompliance under Section 616 of the FCRA (15 U.S.C. § 1681n), which subjects the bureau to liability for actual damages, punitive damages, and attorney's fees. I expect a written response and resolution within 15 days.`
      );
  }
}

export function buildLetterDraft(input: GenerateLetterInput): string {
  const isCollectorLetter = input.letterType === "debt_validation" || input.letterType === "creditor_direct";
  const recipientAddress = BUREAU_ADDRESSES[input.bureau] ?? input.bureau;
  const body = bodyFor(input.letterType, input);

  const recipientBlock = isCollectorLetter
    ? `[Collection Agency / Original Creditor Name]\n[Street Address]\n[City, State ZIP]\n\nNote: ${COLLECTOR_SEND_NOTE}`
    : recipientAddress;

  // Build sender contact block from whatever the profile has
  const addrLine1 = input.consumerAddress || "[Your Street Address]";
  const addrLine2 = [
    input.consumerCity || "[City]",
    input.consumerState || "[State]",
    input.consumerZip || "[ZIP]",
  ].join(", ");
  const phoneLine = input.consumerPhone || "[Phone Number]";
  const emailLine = input.consumerEmail || "[Email Address]";

  const senderBlock = `${input.consumerName}
${addrLine1}
${addrLine2}
${phoneLine}
${emailLine}`;

  return `${senderBlock}

${TODAY()}

${recipientBlock}

Re: Formal Dispute — ${input.accountName}${input.accountNumber ? ` (Account ending ${input.accountNumber})` : ""}

To Whom It May Concern,

${body}

I am including copies of supporting documents (if applicable) and request that all correspondence be directed to me at the address listed above. Please investigate this matter and provide a written response within the timeframe required by applicable federal law.

Sincerely,
${input.consumerName}

---
${DISCLAIMER}`;
}

export function letterTitleFor(input: GenerateLetterInput): string {
  return `${LETTER_TYPE_LABELS[input.letterType]} — ${input.accountName} (${input.bureau})`;
}
