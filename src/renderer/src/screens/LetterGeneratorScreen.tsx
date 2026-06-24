import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardHeader, Button, Badge, UiverseCloudLoader } from "@/components/ui";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { SparklesIcon, DownloadIcon, SaveIcon, FileTextIcon, CheckCircleIcon } from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { generateLetter, exportLetterAsPdf, exportLetterAsDocx } from "@/services/letterGeneratorService";
import { saveLetter } from "@/services/databaseService";
import {
  LETTER_TYPE_LABELS,
  CATEGORY_LABELS,
  type Bureau,
  type DisputeLetterType,
  type NegativeItemCategory,
  type GenerateLetterInput,
  type NegativeItem,
  type DisputeLetter,
} from "@/types";

const BUREAUS: Bureau[] = ["Experian", "Equifax", "TransUnion"];

export function LetterGeneratorScreen() {
  const location = useLocation();
  const { activeClient, activeClientId, profile } = useAppContext();
  const prefillItem = (location.state as { fromItem?: NegativeItem } | null)?.fromItem;

  const [form, setForm] = useState<GenerateLetterInput>({
    consumerName: profile?.fullName ?? activeClient?.fullName ?? "",
    consumerEmail: profile?.email ?? activeClient?.email,
    consumerPhone: profile?.phone,
    consumerAddress: profile?.address,
    consumerCity: profile?.city,
    consumerState: profile?.state,
    consumerZip: profile?.zip,
    bureau: prefillItem?.bureausReporting[0] ?? "Experian",
    accountName: prefillItem?.creditorName ?? "",
    accountNumber: prefillItem?.accountNumberMasked ?? "",
    disputeReason: "",
    category: prefillItem?.category ?? "collections",
    letterType: prefillItem?.recommendedLetterType ?? "collection_dispute",
  });

  const [draft, setDraft] = useState<string>("");
  const [currentLetter, setCurrentLetter] = useState<DisputeLetter | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    const name = profile?.fullName ?? activeClient?.fullName;
    if (name) setForm((f) => ({ ...f, consumerName: name }));
  }, [activeClient, profile]);

  const handleGenerate = async () => {
    setGenerating(true);
    setSaveState("idle");
    const { letter } = await generateLetter(activeClientId, form, prefillItem?.id);
    setCurrentLetter(letter);
    setDraft(letter.bodyText);
    setGenerating(false);
  };

  const handleSave = async () => {
    const letter = currentLetter ?? (await generateLetter(activeClientId, form, prefillItem?.id)).letter;
    await saveLetter({ ...letter, bodyText: draft, updatedAt: new Date().toISOString() });
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  };

  const handleExport = async (format: "pdf" | "docx") => {
    const letter = currentLetter ?? (await generateLetter(activeClientId, form, prefillItem?.id)).letter;
    const finalLetter = { ...letter, bodyText: draft, updatedAt: new Date().toISOString() };
    const result =
      format === "pdf" ? await exportLetterAsPdf(finalLetter) : await exportLetterAsDocx(finalLetter);
    setExportMessage(`${result.fileName} — ${result.message}`);
    setTimeout(() => setExportMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader title="Letter Details" />
          <div className="space-y-4">
            <Field label="Consumer name">
              <Input
                value={form.consumerName}
                onChange={(v) => setForm({ ...form, consumerName: v })}
                placeholder="Full legal name"
              />
            </Field>

            <Field label="Bureau">
              <Select
                value={form.bureau}
                onChange={(v) => setForm({ ...form, bureau: v as Bureau })}
                options={BUREAUS.map((b) => ({ value: b, label: b }))}
              />
            </Field>

            <Field label="Account / creditor name">
              <Input
                value={form.accountName}
                onChange={(v) => setForm({ ...form, accountName: v })}
                placeholder="e.g. Midland Credit Management"
              />
            </Field>

            <Field label="Account number (masked)">
              <Input
                value={form.accountNumber}
                onChange={(v) => setForm({ ...form, accountNumber: v })}
                placeholder="e.g. •••• 4471"
              />
            </Field>

            <Field label="Category">
              <Select
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v as NegativeItemCategory })}
                options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Field>

            <Field label="Letter type">
              <Select
                value={form.letterType}
                onChange={(v) => setForm({ ...form, letterType: v as DisputeLetterType })}
                options={Object.entries(LETTER_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Field>

            <Field label="Dispute reason">
              <Textarea
                value={form.disputeReason}
                onChange={(v) => setForm({ ...form, disputeReason: v })}
                placeholder="Describe why you believe this item may be inaccurate or unverifiable..."
                rows={3}
              />
            </Field>

            <Button
              onClick={handleGenerate}
              fullWidth
              size="lg"
              disabled={generating || !form.accountName || !form.consumerName}
              icon={<SparklesIcon size={16} />}
              hoverText="Draft Now"
            >
              {generating ? "Drafting letter..." : "Generate Letter"}
            </Button>
          </div>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader
            title="Editable Draft"
            action={
              draft && (
                <Badge tone="brand">
                  <FileTextIcon size={11} /> Research-informed draft
                </Badge>
              )
            }
          />

          {!draft && !generating && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/70 bg-white/40 py-20 text-center shadow-soft">
              <SparklesIcon size={28} className="mb-3 text-skyGlass-500" />
              <p className="text-[13px] text-slate-500">
                Fill in the details and generate a draft to preview it here.
              </p>
            </div>
          )}

          {generating && (
            <div className="flex flex-1 flex-col items-center justify-center py-20">
              <UiverseCloudLoader />
              <p className="mt-4 text-[12.5px] text-slate-500">
                Drafting your recommended dispute letter...
              </p>
            </div>
          )}

          {draft && !generating && (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[420px] flex-1 resize-none rounded-2xl border border-white/70 bg-white/58 p-4 text-[12.5px] leading-relaxed text-slate-700 shadow-soft focus-ring focus:border-skyGlass-400/60"
              />

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <Button onClick={handleSave} variant="secondary" icon={<SaveIcon size={15} />}>
                  {saveState === "saved" ? "Saved" : "Save letter"}
                </Button>
                <Button
                  onClick={() => handleExport("pdf")}
                  variant="secondary"
                  icon={<DownloadIcon size={15} />}
                >
                  Export as PDF
                </Button>
                <Button
                  onClick={() => handleExport("docx")}
                  variant="secondary"
                  icon={<DownloadIcon size={15} />}
                >
                  Export as Word
                </Button>
                {saveState === "saved" && (
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-brand-400">
                    <CheckCircleIcon size={14} /> Saved to letters
                  </span>
                )}
              </div>

              {exportMessage && (
                <p className="mt-2.5 text-[11.5px] text-slate-500">{exportMessage}</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-white/70 bg-white/58 px-3.5 py-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 shadow-soft focus-ring focus:border-skyGlass-400/60"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-white/70 bg-white/58 px-3.5 py-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 shadow-soft focus-ring focus:border-skyGlass-400/60"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/70 bg-white/58 px-3.5 py-2.5 text-[13px] text-slate-700 shadow-soft focus-ring focus:border-skyGlass-400/60"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
