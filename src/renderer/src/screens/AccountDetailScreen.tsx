import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardHeader, Badge, Button, UiverseCloudLoader } from "@/components/ui";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import {
  ChevronLeftIcon,
  AlertTriangleIcon,
  SparklesIcon,
  ScaleIcon,
  DownloadIcon,
  CheckCircleIcon,
} from "@/components/Icons";
import { getNegativeItemById, saveLetter } from "@/services/databaseService";
import { suggestDisputeReasonForItem } from "@/services/openaiService";
import { CATEGORY_LABELS, ISSUE_FLAG_LABELS, LETTER_TYPE_LABELS } from "@/types";
import { generateLetter, exportLetterAsPdf } from "@/services/letterGeneratorService";
import { useAppContext } from "@/context/AppContext";
import type { DisputeLetter, GenerateLetterInput, NegativeItem } from "@/types";

export function AccountDetailScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { activeClientId, activeClient, profile } = useAppContext();
  const [item, setItem] = useState<NegativeItem | null>(null);
  const [suggestion, setSuggestion] = useState<string>("");
  const [letter, setLetter] = useState<DisputeLetter | null>(null);
  const [letterState, setLetterState] = useState<"idle" | "generating" | "ready" | "downloaded">("idle");
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    getNegativeItemById(itemId).then((found) => {
      setItem(found ?? null);
      if (found) suggestDisputeReasonForItem(found).then(setSuggestion);
    });
  }, [itemId]);

  if (!item) {
    return (
      <div className="py-16 text-center text-[13px] text-gray-500">
        Item not found.
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/categories")}>
            Back to categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate("/categories")}
        className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 transition-smooth hover:text-skyGlass-700"
      >
        <ChevronLeftIcon size={15} /> Back to all items
      </button>

      <DisclaimerBanner compact />

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <Badge tone="brand" className="mb-2.5">
              {CATEGORY_LABELS[item.category]}
            </Badge>
            <h2 className="text-[20px] font-bold text-slate-700">{item.creditorName}</h2>
            <p className="mt-1 text-[13px] text-slate-500">{item.accountNumberMasked}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[28px] font-bold text-brand-400">
              {item.disputeOpportunityScore}
            </span>
            <span className="text-[11px] text-slate-500">dispute opportunity</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DetailField label="Balance" value={item.balance ? `$${item.balance.toLocaleString()}` : "—"} />
          <DetailField
            label="Original amount"
            value={item.originalAmount ? `$${item.originalAmount.toLocaleString()}` : "—"}
          />
          <DetailField label="Date opened" value={item.dateOpened ?? "—"} />
          <DetailField label="Date reported" value={item.dateReported ?? "—"} />
        </div>

        <div className="mt-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
            Reporting bureaus
          </p>
          <div className="mt-2 flex gap-2">
            {item.bureausReporting.map((b) => (
              <Badge key={b} tone="blue">
                {b}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {item.issueFlags.length > 0 && (
        <Card>
          <CardHeader title="Possible Inaccuracy Flags" />
          <div className="space-y-2.5">
            {item.issueFlags.map((flag) => (
              <div
                key={flag}
                className="flex items-start gap-3 rounded-xl border border-warning-500/20 bg-warning-500/5 px-4 py-3"
              >
                <AlertTriangleIcon size={15} className="mt-0.5 flex-shrink-0 text-warning-400" />
                <p className="text-[12.5px] text-slate-600">{ISSUE_FLAG_LABELS[flag]}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Analyst Notes" />
        <p className="text-[13px] leading-relaxed text-slate-600">{item.notes}</p>
      </Card>

      <Card className="border-accentBlue-500/20 bg-accentBlue-500/5">
        <div className="flex items-start gap-3">
          <SparklesIcon size={16} className="mt-0.5 flex-shrink-0 text-accentBlue-400" />
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold text-accentBlue-400">
              Luma Intelligence recommended dispute reason
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              {suggestion || "Generating suggestion..."}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-slate-500">Recommended letter type</p>
            <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-slate-700">
              <ScaleIcon size={16} className="text-brand-400" />
              {LETTER_TYPE_LABELS[item.recommendedLetterType]}
            </p>
            <p className="mt-1 max-w-md text-[12px] leading-relaxed text-slate-500">
              Chosen by Luma Intelligence from the item category, bureau context, issue flags,
              and market research on which letter strategies fit this dispute type best.
            </p>
          </div>
          <Button onClick={() => handleCreateLetter()} disabled={letterState === "generating"} hoverText="Write Letter">
            {letterState === "generating" ? "Creating Letter..." : "Create Dispute Letter"}
          </Button>
        </div>
      </Card>

      {(letterState === "generating" || letter) && (
        <Card glow>
          <CardHeader
            title="Dispute Letter Preview"
            action={
              letter && (
                <Badge tone="brand">
                  <CheckCircleIcon size={12} /> Ready
                </Badge>
              )
            }
          />

          {letterState === "generating" && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/50 py-14 text-center shadow-soft">
              <UiverseCloudLoader />
              <p className="mt-4 text-[13px] font-semibold text-slate-600">
                Writing your recommended dispute letter...
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                Using the selected negative item, bureau, issue flags, and suggested dispute reason.
              </p>
            </div>
          )}

          {letter && letterState !== "generating" && (
            <>
              <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-soft">
                <h3 className="text-[15px] font-bold text-slate-700">{letter.title}</h3>
                <pre className="mt-4 max-h-[520px] whitespace-pre-wrap rounded-xl bg-white/55 p-4 font-sans text-[12.5px] leading-relaxed text-slate-700">
                  {letter.bodyText}
                </pre>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={handleDownloadLetter} icon={<DownloadIcon size={15} />} hoverText="Save PDF">
                  Download Letter
                </Button>
                <Button variant="secondary" onClick={() => navigate("/letters", { state: { fromItem: item } })}>
                  Edit Letter
                </Button>
                {downloadMessage && (
                  <span className="text-[12px] font-medium text-slate-500">{downloadMessage}</span>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );

  async function handleCreateLetter() {
    if (!item || letterState === "generating") return;
    setLetterState("generating");
    setDownloadMessage(null);
    const input: GenerateLetterInput = {
      consumerName: activeClient?.fullName ?? profile?.fullName ?? "Consumer Name",
      bureau: item.bureausReporting[0] ?? "Experian",
      accountName: item.creditorName,
      accountNumber: item.accountNumberMasked,
      disputeReason:
        suggestion ||
        "Please verify the accuracy, completeness, ownership, balance, dates, and reporting of this account.",
      category: item.category,
      letterType: item.recommendedLetterType,
    };
    const generated = await generateLetter(activeClientId, input, item.id);
    await saveLetter(generated);
    setLetter(generated);
    setLetterState("ready");
  }

  async function handleDownloadLetter() {
    if (!letter) return;
    const result = await exportLetterAsPdf(letter);
    setLetterState("downloaded");
    setDownloadMessage(result.message);
  }
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[13.5px] font-semibold text-slate-700">{value}</p>
    </div>
  );
}
