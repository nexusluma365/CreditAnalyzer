import { AlertTriangleIcon } from "./Icons";

export function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-warning-500/20 bg-white/55 px-3.5 py-2.5 text-[11.5px] text-warning-500 shadow-soft">
        <AlertTriangleIcon size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          Research-informed recommendations — Luma selects the best-fit letter strategy for each item. Not legal advice; outcomes can vary.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning-500/20 bg-white/55 px-5 py-4 shadow-soft">
      <AlertTriangleIcon size={18} className="mt-0.5 flex-shrink-0 text-warning-400" />
      <div>
        <p className="text-[13px] font-semibold text-warning-400">
          Research-informed dispute strategy
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
          Luma Intelligence reviews category, bureau context, issue flags, and market dispute patterns
          to recommend the strongest letter path for each item. You stay in control before sending;
          no app can guarantee bureau action, removals, or score changes.
        </p>
      </div>
    </div>
  );
}
