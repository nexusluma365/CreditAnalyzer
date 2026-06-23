import { SunIcon, MoonIcon } from "./Icons";
import { useTheme } from "@/context/ThemeContext";
import { useAppContext } from "@/context/AppContext";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-brand-400",
  trial: "bg-skyGlass-500",
  expired: "bg-danger-400",
  inactive: "bg-warning-400",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Licensed",
  trial: "Trial",
  expired: "Expired",
  inactive: "Inactive",
};

export function Topbar({ title, subtitle }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const {
    license,
    profile,
  } = useAppContext();

  const displayName = profile?.fullName ?? "Guest User";
  const displayInitials = initials(displayName);

  return (
    <header className="relative mx-6 mt-5 flex items-center justify-between gap-5 rounded-[2rem] glass-panel px-6 py-5 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-[24px] font-bold tracking-tight text-slate-700 lg:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/62 px-3 py-2 text-[12px] font-semibold text-slate-500 shadow-soft sm:flex">
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              STATUS_DOT[license.status] ?? "bg-gray-400",
            ].join(" ")}
          />
          {STATUS_LABEL[license.status] ?? "Unknown"}
        </div>

        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/62 text-slate-500 shadow-soft transition-smooth hover:border-skyGlass-300 hover:text-skyGlass-800 focus-ring"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>

        <div className="ml-1 flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/62 px-2.5 py-1.5 shadow-soft">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-skyGlass-500 to-accentBlue-500 text-[12px] font-bold text-white shadow-glowSm">
            {displayInitials}
          </div>
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold text-slate-700">{displayName}</div>
            <div className="text-[10.5px] text-slate-400">{profile?.email ?? "—"}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
