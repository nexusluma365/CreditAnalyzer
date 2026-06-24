import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, ProgressBar, Badge, UiverseCloudLoader } from "@/components/ui";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { UploadIcon, FileTextIcon, CheckCircleIcon, AlertTriangleIcon } from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { parseCreditReportPdf, type UploadedCreditReportFile } from "@/services/pdfParserService";
import { addReport, addNegativeItems } from "@/services/databaseService";
import { playSound } from "@/services/soundService";

type Stage = "idle" | "selected" | "uploading" | "analyzing" | "saving" | "done";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MIN_SCAN_DURATION_MS = 3_800;

export function UploadScreen() {
  const navigate = useNavigate();
  const { activeClientId, activeClient } = useAppContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [selectedFile, setSelectedFile] = useState<UploadedCreditReportFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisNotes, setAnalysisNotes] = useState<string[]>([]);

  const handleFile = useCallback((file: UploadedCreditReportFile) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setStage("idle");
      setError(validationError);
      return;
    }
    setSelectedFile(file);
    setStage("selected");
    setProgress(0);
    setAnalysisNotes([]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        lastModified: file.lastModified,
        browserFile: file,
      });
    }
  };

  const handleBrowse = async () => {
    setError(null);
    playSound("click");
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.selectPdfFile) {
      const result = await electronAPI.selectPdfFile();
      if (result) {
        handleFile({ fileName: result.fileName, filePath: result.filePath, fileSize: result.fileSize, mimeType: "application/pdf" });
      }
      return;
    }
    inputRef.current?.click();
  };

  const handleBrowserFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/pdf",
      lastModified: file.lastModified,
      browserFile: file,
    });
    e.currentTarget.value = "";
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    playSound("click");
    setError(null);
    setStage("uploading");
    setProgress(8);
    setAnalysisNotes(["Preparing a private local scan session..."]);
    const scanStartedAt = Date.now();
    await delay(450);

    setStage("analyzing");
    setProgress(18);
    setAnalysisNotes((notes) => [
      ...notes,
      "Reading the report slowly enough to compare bureaus, account ownership, balances, dates, statuses, and negative-item patterns...",
    ]);
    await delay(650);

    try {
      const { report, items } = await parseCreditReportPdf(selectedFile, activeClientId, ({ progress, message }) => {
        setProgress(progress);
        setAnalysisNotes((notes) => appendUnique(notes, message));
      });
      const remainingScanTime = Math.max(0, MIN_SCAN_DURATION_MS - (Date.now() - scanStartedAt));
      if (remainingScanTime > 0) {
        setAnalysisNotes((notes) => appendUnique(notes, "Final review pass: checking for duplicate reporting, bureau mismatches, and missing creditor details..."));
        await delay(remainingScanTime);
      }
      setProgress(88);
      setAnalysisNotes((notes) => [
        ...notes,
        `Detected ${items.length} possible negative item(s) and grouped them by dispute category.`,
        "Matching each item to the strongest research-informed letter strategy based on category, issue signals, and dispute patterns...",
      ]);
      await delay(500);

      setStage("saving");
      setProgress(94);
      await addReport(report);
      await addNegativeItems(items);
      setProgress(100);
      setStage("done");
      setAnalysisNotes((notes) => [...notes, "Analysis saved. Opening your categorized negative-item list..."]);
      await delay(700);
      navigate("/categories");
    } catch (error) {
      setStage("selected");
      setProgress(0);
      setError(error instanceof Error ? error.message : "The report could not be analyzed. Please try another text-based PDF.");
      playSound("error");
    }
  };

  const fileName = selectedFile?.fileName ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DisclaimerBanner />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-700">Upload a credit report manually</h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Select a PDF credit report from your device. Luma Intelligence will prepare a research-informed analysis and organize the best dispute opportunities for review.
            </p>
          </div>
          <Badge tone="blue">Local-first MVP</Badge>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleBrowserFile}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={[
            "mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-smooth",
            isDragOver
              ? "border-skyGlass-400 bg-white/65 shadow-glow"
              : "border-white/70 bg-white/45 soft-inset",
          ].join(" ")}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-skyGlass-500/15 text-skyGlass-600 shadow-soft">
            <UploadIcon size={24} />
          </div>
          <p className="text-[14px] font-semibold text-slate-700">
            Drag and drop your credit report PDF here
          </p>
          <p className="mt-1 text-[12.5px] text-slate-500">or choose it manually from your device</p>
          <Button onClick={handleBrowse} variant="secondary" className="mt-3">
            Browse files
          </Button>
          <p className="mt-4 text-[11px] text-slate-400">PDF only &middot; Max 25MB &middot; Works with Experian, Equifax, TransUnion, and 3-bureau reports</p>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning-500/25 bg-warning-500/10 px-4 py-4 text-[12.5px] text-warning-200">
            <AlertTriangleIcon size={16} className="mt-0.5 flex-shrink-0 text-warning-400" />
            <div className="whitespace-pre-line leading-relaxed">{error}</div>
          </div>
        )}

        {stage !== "idle" && selectedFile && (
          <div className="mt-5 rounded-2xl border border-white/70 bg-white/55 px-4 py-3.5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-skyGlass-500/15 text-skyGlass-600">
                {stage === "uploading" || stage === "analyzing" || stage === "saving" ? (
                  <UiverseCloudLoader className="scale-50" />
                ) : (
                  <FileTextIcon size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-700">{fileName}</p>
                <p className="text-[11.5px] text-slate-500">
                  {stage === "selected" && "Ready to analyze"}
                  {stage === "uploading" && "Storing report locally..."}
                  {stage === "analyzing" && "Luma is matching negative items to best-fit dispute strategies..."}
                  {stage === "saving" && "Saving findings to the local dashboard..."}
                  {stage === "done" && "Analysis complete"}
                  {selectedFile.fileSize ? ` · ${formatFileSize(selectedFile.fileSize)}` : ""}
                </p>
              </div>
              {stage === "done" && <CheckCircleIcon size={18} className="text-brand-400" />}
            </div>
            {(stage === "uploading" || stage === "analyzing" || stage === "saving") && (
              <ProgressBar value={progress} tone="neon" className="mt-3" />
            )}
            {analysisNotes.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-[11.5px] text-slate-500">
                {analysisNotes.map((note) => (
                  <li key={note} className="flex gap-2 animate-fade-in">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-skyGlass-500" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/45 p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] font-medium text-slate-500">
            {!selectedFile && "Upload a PDF first, then Luma can analyze it."}
            {selectedFile && stage === "selected" && "Report selected. Start analysis when you’re ready."}
            {selectedFile && stage !== "selected" && "Luma Intelligence is reviewing this report."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {selectedFile && stage === "selected" && (
              <Button onClick={() => { setSelectedFile(null); setStage("idle"); }} variant="secondary">
                Choose different file
              </Button>
            )}
            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile || stage !== "selected"}
              size="lg"
              hoverText={selectedFile && stage === "selected" ? "Find Items" : "Upload PDF"}
            >
              {stage === "uploading" || stage === "analyzing" || stage === "saving" ? "Analyzing..." : "Analyze Report"}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h4 className="text-[13.5px] font-semibold text-slate-700">What happens next</h4>
        <ol className="mt-3 space-y-2.5 text-[12.5px] text-slate-500">
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/70 text-[10.5px] font-bold text-skyGlass-700">1</span>
            Your report text is extracted locally. Licensed AI analysis is routed through your secure Railway backend, never directly from the desktop app.
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/70 text-[10.5px] font-bold text-skyGlass-700">2</span>
            The analyzer organizes possible negative items into collections, charge-offs, inquiries, repossessions, late payments, and other categories.
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/70 text-[10.5px] font-bold text-skyGlass-700">3</span>
            You can review each item, select a bureau, generate the recommended dispute letter, save it, and track the next action.
          </li>
        </ol>
      </Card>
    </div>
  );
}

function validateFile(file: UploadedCreditReportFile): string | null {
  if (!file.fileName.toLowerCase().endsWith(".pdf")) {
    return "Please select a PDF credit report. This uploader currently accepts .pdf files only.";
  }
  if (file.fileSize && file.fileSize > MAX_FILE_SIZE) {
    return "This file is larger than 25MB. Please upload a smaller PDF or compressed credit report.";
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendUnique(notes: string[], next: string): string[] {
  return notes.includes(next) ? notes : [...notes, next];
}
