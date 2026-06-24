import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, Badge, Button, ProgressBar, DonutWheel } from "@/components/ui";
import {
  UploadIcon,
  FileTextIcon,
  ArrowUpRightIcon,
  TrackerIcon,
  LayersIcon,
  SparklesIcon,
} from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { getReports, getDisputeCases, getNegativeItems } from "@/services/databaseService";
import { CATEGORY_LABELS } from "@/types";
import { playSound } from "@/services/soundService";
import type { CreditReportFile, DisputeCase, NegativeItem } from "@/types";

const LICENSE_BADGE: Record<string, { tone: "brand" | "blue" | "warning" | "danger"; label: string }> = {
  active: { tone: "brand", label: "License Active" },
  trial: { tone: "blue", label: "Trial" },
  expired: { tone: "danger", label: "Expired" },
  inactive: { tone: "warning", label: "Inactive" },
};

export function DashboardScreen() {
  const navigate = useNavigate();
  const { activeClientId, activeClient, profile, license } = useAppContext();
  const [reports, setReports] = useState<CreditReportFile[]>([]);
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [negativeItems, setNegativeItems] = useState<NegativeItem[]>([]);

  useEffect(() => {
    getReports(activeClientId).then(setReports);
    getDisputeCases(activeClientId).then(setCases);
    getReports(activeClientId).then(async (foundReports) => {
      const all: NegativeItem[] = [];
      for (const report of foundReports) {
        all.push(...(await getNegativeItems(report.id)));
      }
      setNegativeItems(all);
    });
  }, [activeClientId]);

  const categoryCounts = negativeItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const totalNegative = negativeItems.length;
  const totalSent = cases.filter((c) => c.status !== "Pending").length;
  const resolved = cases.filter((c) => c.status === "Removed" || c.status === "Verified").length;
  const completionPct = cases.length > 0 ? Math.round((resolved / cases.length) * 100) : 0;
  const lastReport = reports[0];
  const licenseBadge = LICENSE_BADGE[license.status] ?? LICENSE_BADGE.inactive;
  const firstName = profile?.fullName?.split(" ")[0];

  // Welcome prompt — shown once per session when no reports exist
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeChecked = useRef(false);
  useEffect(() => {
    if (welcomeChecked.current) return;
    welcomeChecked.current = true;
    if (!sessionStorage.getItem("cra-welcome-shown")) {
      setShowWelcome(true);
    }
  }, []);
  // Hide once a report is uploaded
  useEffect(() => { if (reports.length > 0) setShowWelcome(false); }, [reports.length]);
  const dismissWelcome = () => {
    sessionStorage.setItem("cra-welcome-shown", "1");
    setShowWelcome(false);
  };
  const goUpload = () => { dismissWelcome(); navigate("/upload"); };

  // Live Luma insight — computed from actual negative items
  const lumaInsight = buildLumaInsight(negativeItems, categoryCounts);

  return (
    <div className="relative space-y-5 lg:space-y-6">

      {/* ── Welcome prompt ─────────────────────────────────────────────── */}
      {showWelcome && reports.length === 0 && (
        <div className="animate-scale-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-[6px]">
          <div className="animate-fade-in-up relative mx-4 w-full max-w-md glass-panel-strong rounded-3xl p-8 shadow-glowLg text-center"
               style={{ animationDelay: "60ms" }}>
            {/* Glow orbs */}
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-skyGlass-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accentBlue-400/15 blur-3xl" />

            <div className="relative">
              {/* Icon */}
              <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-skyGlass-500 to-accentBlue-500 shadow-glowLg">
                <span className="absolute inline-flex h-16 w-16 animate-ping rounded-2xl bg-skyGlass-400 opacity-20" />
                <UploadIcon size={28} className="relative text-white" />
              </div>

              <h2 className="text-[22px] font-bold leading-tight text-slate-700">
                Upload Your Credit Report
              </h2>
              <p className="mt-0.5 text-[22px] font-bold leading-tight text-skyGlass-700">
                To Get Started
              </p>

              <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
                Luma Intelligence will scan your PDF, identify negative items, and map the best dispute letter strategy for each one.
              </p>

              <button
                onClick={goUpload}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-skyGlass-500 to-accentBlue-500 py-3.5 text-[14px] font-bold text-white shadow-glowLg transition-smooth hover:opacity-90 active:scale-[0.98]"
              >
                <UploadIcon size={17} /> Upload Credit Report
              </button>

              <button
                onClick={dismissWelcome}
                className="mt-3.5 text-[12px] text-slate-400 transition-smooth hover:text-slate-600"
              >
                Explore dashboard first
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Welcome header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-slate-700">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            Here&rsquo;s the latest on your credit report analysis.
          </p>
        </div>
        <Badge tone={licenseBadge.tone} className="shadow-glowSm">
          {licenseBadge.label}
        </Badge>
      </div>

      {/* Top row: Upload CTA + headline stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5">
        <Card glass className="overflow-hidden shadow-glowLg lg:col-span-1">
          <div className="flex h-full flex-col justify-between text-slate-700">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-skyGlass-500/15 text-skyGlass-700 shadow-soft">
                <UploadIcon size={19} />
              </div>
              <h3 className="text-[16px] font-bold">Upload Credit Report</h3>
              <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
                Add a new PDF report to identify possible inaccuracies and dispute opportunities.
              </p>
            </div>
            <div className="mt-5">
              <Button
                onClick={() => {
                  playSound("click");
                  navigate("/upload");
                }}
                icon={<ArrowUpRightIcon size={16} />}
                iconPosition="right"
                hoverText="Start Scan"
              >
                Upload now
              </Button>
            </div>
          </div>
        </Card>

        <Card glass className="flex items-center gap-5">
          <DonutWheel value={Math.min(100, totalNegative * 8)} label={String(totalNegative)} sublabel="items" tone="warning" />
          <div>
            <p className="text-[12.5px] font-semibold text-slate-500">Total negative items found</p>
            <div className="mt-2 flex items-baseline gap-2">
              <Badge tone="warning">Across {reports.length || 1} report(s)</Badge>
            </div>
            <p className="mt-3 text-[12px] text-slate-500">
              Spanning {Object.keys(categoryCounts).length} categories — review each for possible dispute opportunities.
            </p>
            <button
              onClick={() => navigate("/categories")}
              className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-skyGlass-700 transition-smooth hover:text-skyGlass-900"
            >
              Review negative items <ArrowUpRightIcon size={13} />
            </button>
          </div>
        </Card>

        <Card glass className="flex items-center gap-5">
          <DonutWheel value={completionPct} label={`${completionPct}%`} sublabel="resolved" tone="brand" />
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold text-slate-500">Dispute progress</p>
            <ProgressBar value={completionPct} className="mt-4" />
            <p className="mt-3 text-[12px] text-slate-500">
              {totalSent} of {cases.length || 0} dispute case(s) sent to bureaus.
            </p>
          </div>
        </Card>
      </div>

      {/* Last analysis summary */}
      <Card>
        <CardHeader
          title="Last Analysis Summary"
          action={
            lastReport && (
              <button
                onClick={() => navigate("/categories")}
                className="text-[12px] font-semibold text-slate-500 transition-smooth hover:text-skyGlass-700"
              >
                Review items
              </button>
            )
          }
        />
        {lastReport ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-500/15 text-neon-400">
                <FileTextIcon size={17} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-slate-700">{lastReport.fileName}</p>
                <p className="text-[11.5px] text-slate-500">
                  {lastReport.bureau} &middot; Uploaded {new Date(lastReport.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Badge tone={lastReport.status === "analyzed" ? "brand" : "warning"}>
              {lastReport.status === "analyzed" ? "Analyzed" : "Processing"}
            </Badge>
          </div>
        ) : (
          <p className="py-4 text-center text-[13px] text-slate-500">
            No analysis yet — upload a credit report to find and categorize negative items.
          </p>
        )}
      </Card>

      {/* Recent Analyses + Dispute Progress Tracker */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Analyses"
            action={
              <button
                onClick={() => navigate("/categories")}
                className="text-[12px] font-semibold text-slate-500 transition-smooth hover:text-skyGlass-700"
              >
                View all
              </button>
            }
          />
          <div className="space-y-3">
            {reports.length === 0 && (
              <p className="py-6 text-center text-[13px] text-slate-500">
              No reports uploaded yet for {activeClient?.fullName ?? "this profile"}.
              </p>
            )}
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => navigate("/categories")}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/70 bg-white/55 px-4 py-3.5 shadow-soft transition-smooth hover:border-skyGlass-300"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon-500/15 text-neon-400">
                    <FileTextIcon size={16} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-700">{report.fileName}</p>
                    <p className="text-[11.5px] text-slate-500">
                      {report.bureau} &middot; {new Date(report.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge tone={report.status === "analyzed" ? "brand" : "warning"}>
                  {report.status === "analyzed" ? "Analyzed" : "Processing"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Dispute Progress Tracker" />
          <div className="space-y-3.5">
            {cases.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[12.5px] font-semibold text-slate-700">{c.creditorName}</p>
                  <p className="text-[11px] text-slate-500">{c.bureau}</p>
                </div>
                <StatusDot status={c.status} />
              </div>
            ))}
            {cases.length === 0 && (
              <p className="py-4 text-center text-[12.5px] text-slate-500">No active disputes yet.</p>
            )}
          </div>
          <button
            onClick={() => navigate("/tracker")}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/45 py-2.5 text-[12.5px] font-semibold text-slate-500 transition-smooth hover:border-skyGlass-300 hover:text-skyGlass-700"
          >
            <TrackerIcon size={14} /> Open full tracker
          </button>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader
          title="Negative Items by Category"
          action={
            <button
              onClick={() => navigate("/categories")}
              className="text-[12px] font-semibold text-slate-500 transition-smooth hover:text-skyGlass-700"
            >
              View all
            </button>
          }
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <div
              key={category}
              onClick={() => navigate("/categories")}
              className="cursor-pointer rounded-2xl border border-white/70 bg-white/55 px-4 py-3.5 shadow-soft transition-smooth hover:border-skyGlass-300"
            >
              <div className="flex items-center justify-between">
                <LayersIcon size={15} className="text-neon-400" />
                <span className="text-[18px] font-bold text-slate-700">{count}</span>
              </div>
              <p className="mt-2 text-[11.5px] font-semibold text-slate-500">
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Luma Intelligence quick insight strip */}
      <Card glass className="shadow-glow">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-neon-500/15 text-neon-400">
            <SparklesIcon size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[13.5px] font-semibold text-slate-700">Luma Intelligence quick insight</p>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{lumaInsight}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate("/categories")}>
            Review items
          </Button>
        </div>
      </Card>
    </div>
  );
}

function buildLumaInsight(
  items: import("@/types").NegativeItem[],
  counts: Record<string, number>
): string {
  if (items.length === 0) {
    return "Upload a credit report — Luma Intelligence will analyze negative items and prioritize your highest-impact dispute opportunities.";
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0];
  const secondCategory = sorted[1];

  const topLabel = CATEGORY_LABELS[topCategory[0] as keyof typeof CATEGORY_LABELS] ?? topCategory[0];
  const highScore = items.filter((i) => i.disputeOpportunityScore >= 7);
  const highScoreCount = highScore.length;

  if (highScoreCount > 0 && secondCategory) {
    const secondLabel = CATEGORY_LABELS[secondCategory[0] as keyof typeof CATEGORY_LABELS] ?? secondCategory[0];
    return `${topCategory[1]} ${topLabel.toLowerCase()} item${topCategory[1] !== 1 ? "s" : ""} and ${secondCategory[1]} ${secondLabel.toLowerCase()} account${secondCategory[1] !== 1 ? "s" : ""} — ${highScoreCount} item${highScoreCount !== 1 ? "s" : ""} scored 7+ for dispute priority. Luma recommends starting there.`;
  }

  if (highScoreCount > 0) {
    return `${items.length} negative item${items.length !== 1 ? "s" : ""} found across ${sorted.length} ${sorted.length !== 1 ? "categories" : "category"} — ${highScoreCount} flagged as high-priority by Luma Intelligence. Review these first for the fastest credit impact.`;
  }

  return `${items.length} negative item${items.length !== 1 ? "s" : ""} found, led by ${topCategory[1]} ${topLabel.toLowerCase()} account${topCategory[1] !== 1 ? "s" : ""}. Luma recommends reviewing each for possible inaccuracies before sending dispute letters.`;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-gray-400",
    Sent: "bg-neon-400",
    Verified: "bg-warning-400",
    Removed: "bg-brand-400",
    Escalated: "bg-danger-400",
  };
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">
      <span className={["h-2 w-2 rounded-full", colors[status] ?? "bg-gray-400"].join(" ")} />
      {status}
    </span>
  );
}
