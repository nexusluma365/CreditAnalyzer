import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, Badge, Button, ProgressBar, DonutWheel, UiverseCloudLoader } from "@/components/ui";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { SparklesIcon, LayersIcon, AlertTriangleIcon, ArrowUpRightIcon } from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { getReports, getNegativeItems } from "@/services/databaseService";
import { reviewAnalysis } from "@/services/claudeService";
import { CATEGORY_LABELS } from "@/types";
import type { AnalysisResult, CreditReportFile, NegativeItem } from "@/types";

export function AnalysisResultsScreen() {
  const navigate = useNavigate();
  const { activeClientId } = useAppContext();
  const [reports, setReports] = useState<CreditReportFile[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [items, setItems] = useState<NegativeItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getReports(activeClientId).then((list) => {
      setReports(list);
      if (list.length > 0) setSelectedReportId(list[0].id);
    });
  }, [activeClientId]);

  useEffect(() => {
    if (!selectedReportId) return;
    setLoading(true);
    getNegativeItems(selectedReportId).then(async (foundItems) => {
      setItems(foundItems);
      const result = await reviewAnalysis(selectedReportId, foundItems);
      setAnalysis(result);
      setLoading(false);
    });
  }, [selectedReportId]);

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      {reports.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto rounded-3xl bg-white/45 p-2 shadow-soft">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReportId(r.id)}
              className={[
                "flex-shrink-0 rounded-2xl border px-4 py-2 text-[12.5px] font-semibold transition-smooth",
                r.id === selectedReportId
                  ? "border-skyGlass-300 bg-white/80 text-skyGlass-800 shadow-soft"
                  : "border-white/70 text-slate-500 hover:border-skyGlass-300 hover:bg-white/60",
              ].join(" ")}
            >
              {r.fileName}
            </button>
          ))}
        </div>
      )}

      {!selectedReport && (
        <Card>
          <p className="py-8 text-center text-[13px] text-slate-500">
            No reports uploaded yet. Upload a credit report to see analysis results here.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => navigate("/upload")} hoverText="Start Scan">Upload a report</Button>
          </div>
        </Card>
      )}

      {selectedReport && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5">
            <Card>
              <p className="text-[12.5px] font-medium text-slate-500">Report</p>
              <p className="mt-2 text-[15px] font-semibold text-slate-700 truncate">
                {selectedReport.fileName}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                {selectedReport.bureau} &middot; {selectedReport.pages ?? "—"} pages &middot;{" "}
                {new Date(selectedReport.uploadedAt).toLocaleDateString()}
              </p>
            </Card>
            <Card className="flex items-center gap-4">
              <DonutWheel
                value={Math.min(100, (analysis?.totalAccounts ?? items.length) * 7)}
                label={loading ? "—" : String(analysis?.totalAccounts ?? items.length)}
                sublabel="accounts"
                tone="blue"
                size={92}
              />
              <p className="text-[12.5px] font-semibold text-slate-500">Total accounts reviewed</p>
            </Card>
            <Card className="flex items-center gap-4">
              <DonutWheel
                value={Math.min(100, items.length * 9)}
                label={loading ? "—" : String(items.length)}
                sublabel="negative"
                tone="warning"
                size={92}
              />
              <p className="text-[12.5px] font-semibold text-slate-500">Negative items identified</p>
            </Card>
          </div>

          <Card>
            <CardHeader title="Luma Intelligence Review Summary" />
            {loading ? (
              <LoadingNotes />
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-white/55 px-4 py-3.5 shadow-soft">
                  <SparklesIcon size={16} className="mt-0.5 flex-shrink-0 text-skyGlass-600" />
                  <p className="text-[13px] leading-relaxed text-slate-600">
                    {analysis?.overallRiskNote}
                  </p>
                </div>

                {analysis && analysis.qualityFlags.length > 0 && (
                  <div className="space-y-2">
                    {analysis.qualityFlags.map((flag, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-warning-500/20 bg-warning-500/5 px-4 py-3"
                      >
                        <AlertTriangleIcon size={15} className="mt-0.5 flex-shrink-0 text-warning-400" />
                        <p className="text-[12.5px] text-slate-600">{flag}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Findings by Category"
              action={
                <button
                  onClick={() => navigate("/categories")}
                  className="text-[12px] font-semibold text-slate-500 transition-smooth hover:text-skyGlass-700"
                >
                  View detail
                </button>
              }
            />
            <div className="space-y-3">
              {analysis &&
                Object.entries(analysis.categoryCounts)
                  .filter(([, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center gap-4">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-skyGlass-500/15 text-skyGlass-600">
                        <LayersIcon size={14} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-medium text-slate-600">
                            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                          </span>
                          <span className="text-slate-500">{count} item(s)</span>
                        </div>
                        <ProgressBar
                          value={count}
                          max={items.length || 1}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  ))}
            </div>
          </Card>

          <Card className="bg-gradient-to-r from-white/70 to-skyGlass-100/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13.5px] font-semibold text-slate-700">Ready to take action?</p>
                <p className="mt-0.5 text-[12.5px] text-slate-500">
                  Review individual items and draft dispute letters for the ones you'd like to pursue.
                </p>
              </div>
              <Button onClick={() => navigate("/categories")} icon={<ArrowUpRightIcon size={15} />} iconPosition="right" hoverText="Review Now">
                Review items
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function LoadingNotes() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/50 p-4 shadow-soft">
      <UiverseCloudLoader className="scale-75" />
      <div className="flex-1 space-y-3">
        <div className="h-4 animate-pulse rounded-full bg-white/70" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/60" />
      </div>
    </div>
  );
}
