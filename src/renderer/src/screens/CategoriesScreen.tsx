import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Badge, Button, DonutWheel } from "@/components/ui";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { LayersIcon, ChevronRightIcon, SearchIcon, UploadIcon } from "@/components/Icons";
import { useAppContext } from "@/context/AppContext";
import { getReports, getNegativeItems } from "@/services/databaseService";
import { CATEGORY_LABELS, ISSUE_FLAG_LABELS, LETTER_TYPE_LABELS, type NegativeItemCategory } from "@/types";
import type { NegativeItem } from "@/types";

export function CategoriesScreen() {
  const navigate = useNavigate();
  const { activeClientId } = useAppContext();
  const [items, setItems] = useState<NegativeItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<NegativeItemCategory | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getReports(activeClientId).then(async (reports) => {
      const all: NegativeItem[] = [];
      for (const r of reports) {
        const found = await getNegativeItems(r.id);
        all.push(...found);
      }
      setItems(all);
    });
  }, [activeClientId]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, [items]);

  const filteredItems = items
    .filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        !search || item.creditorName.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => b.disputeOpportunityScore - a.disputeOpportunityScore);
  const hasItems = items.length > 0;

  return (
    <div className="space-y-6">
      <DisclaimerBanner compact />

      <div className="flex flex-col gap-3 rounded-3xl bg-white/45 p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by creditor name..."
            className="w-full rounded-2xl border border-white/70 bg-white/70 py-3 pl-10 pr-3.5 text-[13px] text-slate-700 placeholder:text-slate-400 shadow-soft focus-ring focus:border-skyGlass-400/60"
          />
        </div>
        <Button onClick={() => navigate("/upload")} variant="secondary" icon={<UploadIcon size={15} />}>
          Upload Report
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <CategoryTile
          label="All Items"
          count={items.length}
          showCount={hasItems}
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {(Object.keys(CATEGORY_LABELS) as NegativeItemCategory[]).map((cat) => (
          <CategoryTile
            key={cat}
            label={CATEGORY_LABELS[cat]}
            count={categoryCounts[cat] ?? 0}
            showCount={hasItems}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filteredItems.map((item, index) => (
          <Card
            key={item.id}
            onClick={() => navigate(`/accounts/${item.id}`)}
            className="flex flex-col"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone="brand">{CATEGORY_LABELS[item.category]}</Badge>
                  {index === 0 && (
                    <Badge tone="blue">Dispute first</Badge>
                  )}
                </div>
                <h4 className="text-[14.5px] font-semibold text-slate-700">{item.creditorName}</h4>
                <p className="text-[11.5px] text-slate-500">{item.accountNumberMasked}</p>
              </div>
              <DisputeScore score={item.disputeOpportunityScore} />
            </div>

            <div className="mt-3 rounded-2xl border border-skyGlass-500/20 bg-white/45 px-3.5 py-3 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-skyGlass-700">
                Recommended letter
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-700">
                {LETTER_TYPE_LABELS[item.recommendedLetterType]}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
                Luma selected this from the category, issue flags, and dispute priority score.
              </p>
            </div>

            {item.issueFlags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.issueFlags.map((flag) => (
                  <Badge key={flag} tone="warning">
                    {ISSUE_FLAG_LABELS[flag]}
                  </Badge>
                ))}
              </div>
            )}

            <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">
              {item.notes}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-white/70 pt-3.5">
              <span className="text-[11.5px] text-slate-500">
                Reporting: {item.bureausReporting.join(", ")}
              </span>
              <span className="flex items-center gap-1 text-[12px] font-semibold text-skyGlass-700">
                View details <ChevronRightIcon size={13} />
              </span>
            </div>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <Card className="col-span-full text-center">
            <p className="text-[13px] font-semibold text-slate-600">No items match this filter.</p>
            <p className="mt-1 text-[12px] text-slate-500">Try another category, clear the search, or upload a new report.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function CategoryTile({
  label,
  count,
  showCount,
  active,
  onClick,
}: {
  label: string;
  count: number;
  showCount: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-3xl border px-4 py-4 text-left transition-smooth",
        active
          ? "border-skyGlass-300 bg-white/75 shadow-glow"
          : "border-white/70 bg-white/52 shadow-soft hover:border-skyGlass-300",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <LayersIcon size={14} className={active ? "text-skyGlass-700" : "text-slate-400"} />
        <DonutWheel value={showCount ? Math.min(100, count * 12) : 0} label={showCount ? String(count) : "—"} tone={active ? "blue" : "brand"} size={58} />
      </div>
      <p className="mt-3 text-[11.5px] font-semibold text-slate-500">{label}</p>
    </button>
  );
}

function DisputeScore({ score }: { score: number }) {
  const tone = score >= 70 ? "text-brand-500" : score >= 45 ? "text-warning-500" : "text-slate-400";
  return (
    <div className="flex flex-col items-end">
      <span className={["text-[16px] font-bold", tone].join(" ")}>{score}</span>
      <span className="text-[10px] text-slate-400">opportunity</span>
    </div>
  );
}
