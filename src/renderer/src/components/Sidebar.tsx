import { NavLink } from "react-router-dom";
import {
  GridIcon,
  UploadIcon,
  FileSearchIcon,
  LayersIcon,
  TrackerIcon,
  SettingsIcon,
  ScaleIcon,
} from "./Icons";
import { useAppContext } from "@/context/AppContext";
import { playSound } from "@/services/soundService";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: GridIcon },
  { to: "/upload", label: "Upload", icon: UploadIcon },
  { to: "/analysis", label: "Analysis", icon: FileSearchIcon },
  { to: "/categories", label: "Negative Items", icon: LayersIcon },
  { to: "/tracker", label: "Tracker", icon: TrackerIcon },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-[13.5px] font-semibold transition-smooth focus-ring",
    isActive
      ? "bg-white/72 text-skyGlass-800 shadow-soft border border-white/80"
      : "text-slate-500 hover:bg-white/45 hover:text-skyGlass-800 border border-transparent",
  ].join(" ");

export function Sidebar() {
  const { activeClient, profile } = useAppContext();
  const displayName = profile?.fullName?.trim() || activeClient?.fullName || "Default User";
  const disputeSummary = activeClient?.reportsCount
    ? `${activeClient.activeDisputes} active dispute${activeClient.activeDisputes === 1 ? "" : "s"}`
    : "—";

  return (
    <aside className="relative m-5 mr-0 flex h-[calc(100%-2.5rem)] w-[17rem] flex-shrink-0 flex-col overflow-hidden rounded-[2rem] glass-panel-strong">
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/70 blur-3xl" />

      <div className="relative flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-skyGlass-500 to-accentBlue-500 shadow-glowSm">
          <ScaleIcon size={19} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-slate-700 tracking-tight">
            CRA Pro
          </div>
          <div className="text-[10.5px] text-slate-400 -mt-0.5">
            Credit Report Analyzer
          </div>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className={navLinkClass} end={to === "/"} onClick={() => playSound("click")}>
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-6 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </div>
        <ul className="mt-2 space-y-1.5">
          <li>
            <NavLink to="/settings" className={navLinkClass} onClick={() => playSound("click")}>
              <SettingsIcon size={17} />
              <span>Account</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {(activeClient || profile) && (
        <div className="relative m-3 rounded-3xl bg-white/58 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-skyGlass-700">
              Active Profile
            </span>
            <ChevronLinkDot />
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-glowSm"
              style={{
                backgroundColor: activeClient?.avatarColor ?? "#5d9ceb",
              }}
            >
              {initials(displayName)}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12.5px] font-semibold text-slate-700">
                {displayName}
              </div>
              <div className="text-[10.5px] text-slate-400">
                {profile?.email || disputeSummary}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function ChevronLinkDot() {
  return <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-skyGlass-500" />;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
