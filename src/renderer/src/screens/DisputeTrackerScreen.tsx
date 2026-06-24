import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Badge, Button } from "@/components/ui";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { UploadIcon } from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { getDisputeCases, upsertDisputeCase } from "@/services/databaseService";
import { DISPUTE_STATUSES, CATEGORY_LABELS, type DisputeCase, type DisputeStatus } from "@/types";

const STATUS_COLORS: Record<DisputeStatus, string> = {
  Pending: "border-slate-300/50 bg-white/50",
  Sent: "border-skyGlass-300/60 bg-skyGlass-500/8",
  Verified: "border-warning-500/30 bg-warning-500/8",
  Removed: "border-brand-500/30 bg-brand-500/8",
  Escalated: "border-danger-500/30 bg-danger-500/8",
};

const STATUS_DOT: Record<DisputeStatus, string> = {
  Pending: "bg-gray-400",
  Sent: "bg-accentBlue-400",
  Verified: "bg-warning-400",
  Removed: "bg-brand-400",
  Escalated: "bg-danger-400",
};

export function DisputeTrackerScreen() {
  const navigate = useNavigate();
  const { activeClientId } = useAppContext();
  const [cases, setCases] = useState<DisputeCase[]>([]);

  useEffect(() => {
    getDisputeCases(activeClientId).then(setCases);
  }, [activeClientId]);

  const handleStatusChange = async (caseItem: DisputeCase, newStatus: DisputeStatus) => {
    const updated = await upsertDisputeCase({ ...caseItem, status: newStatus });
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <DisclaimerBanner compact />

      {cases.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-[14px] font-semibold text-slate-600">No dispute cases yet.</p>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Upload a credit report and generate a dispute letter to start tracking cases here.
          </p>
          <div className="mt-5 flex justify-center">
            <Button onClick={() => navigate("/upload")} variant="secondary" icon={<UploadIcon size={15} />}>
              Upload a report
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {DISPUTE_STATUSES.map((status) => {
          const columnCases = cases.filter((c) => c.status === status);
          return (
            <div key={status} className="flex flex-col">
              <div className="mb-3 flex items-center gap-2 px-2">
                <span className={["h-2 w-2 rounded-full", STATUS_DOT[status]].join(" ")} />
                <h3 className="text-[12.5px] font-semibold text-slate-700">{status}</h3>
                <span className="text-[11px] text-slate-400">({columnCases.length})</span>
              </div>

              <div className="flex-1 space-y-3">
                {columnCases.map((c) => (
                  <Card
                    key={c.id}
                    className={["p-4 border", STATUS_COLORS[c.status]].join(" ")}
                  >
                    <h4 className="text-[13px] font-semibold text-slate-700">{c.creditorName}</h4>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge tone="blue">{c.bureau}</Badge>
                      <Badge tone="neutral">{CATEGORY_LABELS[c.category]}</Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-[11.5px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Date sent</span>
                        <span className="font-semibold text-slate-600">
                          {c.dateSent ? new Date(c.dateSent).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Response received</span>
                        <span className="font-semibold text-slate-600">
                          {c.responseReceivedDate
                            ? new Date(c.responseReceivedDate).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
                      {c.nextRecommendedAction}
                    </p>

                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c, e.target.value as DisputeStatus)}
                      className="mt-3 w-full rounded-xl border border-white/70 bg-white/70 px-2.5 py-2 text-[11.5px] font-semibold text-slate-600 shadow-soft focus-ring focus:border-skyGlass-400/60"
                    >
                      {DISPUTE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          Move to: {s}
                        </option>
                      ))}
                    </select>
                  </Card>
                ))}

                {columnCases.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/70 bg-white/35 py-8 text-center text-[11.5px] text-slate-400">
                    No cases
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
