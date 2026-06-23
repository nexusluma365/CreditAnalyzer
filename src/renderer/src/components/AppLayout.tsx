import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of recent activity and dispute progress" },
  "/upload": { title: "Upload Credit Report", subtitle: "Add a new PDF report for analysis" },
  "/analysis": { title: "Analysis Results", subtitle: "Luma Intelligence review of the selected report" },
  "/categories": { title: "Negative Items", subtitle: "Items grouped by category for review" },
  "/accounts": { title: "Account Detail", subtitle: "Review a single negative item in depth" },
  "/letters": { title: "Dispute Letter", subtitle: "Draft research-informed dispute correspondence" },
  "/tracker": { title: "Dispute Tracker", subtitle: "Track bureau responses and next actions" },
  "/settings": { title: "Account", subtitle: "Your profile, license summary, and support contact" },
};

export function AppLayout() {
  const location = useLocation();
  const matched = Object.keys(ROUTE_TITLES)
    .filter((path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  const { title, subtitle } = ROUTE_TITLES[matched] ?? { title: "Credit Report Analyzer Pro" };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-grid-glow">
      <div className="pointer-events-none absolute right-5 top-8 h-40 w-52 dot-matrix opacity-70" />
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-white/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-skyGlass-400/20 blur-3xl" />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} subtitle={subtitle} />
        <main className="app-scroll flex-1 overflow-y-auto px-6 py-6 text-slate-600 lg:px-8">
          <div className="app-content mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
