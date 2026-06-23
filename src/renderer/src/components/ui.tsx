import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
  glass = false,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Use the frosted glass surface instead of the flat dark card. */
  glass?: boolean;
  /** Add a soft neon-blue border glow. */
  glow?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        "rounded-3xl p-5 sm:p-6",
        glass ? "glass-panel" : "soft-card",
        glow ? "shadow-glow" : "",
        onClick ? "cursor-pointer transition-smooth hover:-translate-y-0.5 hover:border-skyGlass-300/70 hover:shadow-glow" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h3 className="text-[15px] font-semibold text-slate-700">{title}</h3>
      {action}
    </div>
  );
}

type BadgeTone = "brand" | "blue" | "danger" | "warning" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  brand: "bg-brand-500/12 text-brand-700 border-brand-500/20",
  blue: "bg-skyGlass-500/14 text-skyGlass-700 border-skyGlass-500/20",
  danger: "bg-danger-500/12 text-danger-600 border-danger-500/20",
  warning: "bg-warning-500/14 text-warning-500 border-warning-500/20",
  neutral: "bg-white/60 text-slate-500 border-white/70",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        badgeTones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "uiverse-cta-btn",
  secondary:
    "bg-white/62 text-slate-600 border border-white/70 shadow-soft hover:border-skyGlass-300 hover:text-skyGlass-800",
  ghost: "bg-transparent text-slate-500 hover:bg-white/45 hover:text-skyGlass-800",
  danger: "bg-danger-500/15 text-danger-400 border border-danger-500/30 hover:bg-danger-500/25",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12.5px]",
  md: "px-4 py-2.5 text-[13.5px]",
  lg: "px-5 py-3 text-[14.5px]",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  disabled,
  type = "button",
  className = "",
  fullWidth = false,
  hoverText,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  fullWidth?: boolean;
  hoverText?: string;
}) {
  const isUiverseCta = variant === "primary";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-smooth focus-ring disabled:cursor-not-allowed",
        variantClasses[variant],
        isUiverseCta ? "" : sizeClasses[size],
        disabled && !isUiverseCta ? "opacity-50" : "",
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {isUiverseCta ? (
        <>
          <span className="btn-text-one">
            {children}
          </span>
          <span className="btn-text-two">
            {hoverText ?? "Let’s Go"}
          </span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && icon}
          {children}
          {icon && iconPosition === "right" && icon}
        </>
      )}
    </button>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  className = "",
}: {
  value: number;
  max?: number;
  tone?: "brand" | "blue" | "neon" | "danger" | "warning";
  className?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const toneClasses: Record<string, string> = {
    brand: "bg-brand-500",
    blue: "bg-accentBlue-500",
    neon: "bg-gradient-to-r from-neon-500 to-neon-300 shadow-glowSm",
    danger: "bg-danger-500",
    warning: "bg-warning-500",
  };
  return (
    <div className={["h-2 w-full overflow-hidden rounded-full soft-inset", className].join(" ")}>
      <div
        className={["h-full rounded-full transition-smooth", toneClasses[tone]].join(" ")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/70 bg-white/45 px-8 py-14 text-center shadow-soft">
      {icon && <div className="mb-4 text-skyGlass-500">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Small inline spinner for buttons and async loading states. */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={["inline-block animate-ring-spin rounded-full border-2 border-current border-t-transparent opacity-80", className].join(" ")}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/** Shimmering skeleton block for premium loading placeholders. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer",
        className,
      ].join(" ")}
    />
  );
}

/** Uiverse.io cloud loader adapted into React for boot/analyze states. */
export function UiverseCloudLoader({ className = "" }: { className?: string }) {
  const id = "uiverse-cloud";
  return (
    <div className={["uiverse-cloud-loader", className].join(" ")} aria-hidden="true">
      <svg id="cloud" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <filter id={`${id}-roundness`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10" />
          </filter>
          <mask id="shapes">
            <g fill="white">
              <polygon points="50 37.5 80 75 20 75 50 37.5" />
              <circle cx="20" cy="60" r="15" />
              <circle cx="80" cy="60" r="15" />
              <g>
                <circle cx="20" cy="60" r="15" />
                <circle cx="20" cy="60" r="15" />
                <circle cx="20" cy="60" r="15" />
              </g>
            </g>
          </mask>
          <mask id={`${id}-clipping`} clipPathUnits="userSpaceOnUse">
            <g id="lines" filter={`url(#${id}-roundness)`}>
              <g mask="url(#shapes)" stroke="white">
                {Array.from({ length: 21 }).map((_, index) => {
                  const y = -40 + index * 9;
                  return <line key={y} x1="-50" y1={y} x2="150" y2={y} />;
                })}
              </g>
            </g>
          </mask>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="0" ry="0" mask={`url(#${id}-clipping)`} />
        <g>
          <path d="M33.52,68.12 C35.02,62.8 39.03,58.52 44.24,56.69 C49.26,54.93 54.68,55.61 59.04,58.4 C59.04,58.4 56.24,60.53 56.24,60.53 C55.45,61.13 55.68,62.37 56.63,62.64 C56.63,62.64 67.21,65.66 67.21,65.66 C67.98,65.88 68.75,65.3 68.74,64.5 C68.74,64.5 68.68,53.5 68.68,53.5 C68.67,52.51 67.54,51.95 66.75,52.55 C66.75,52.55 64.04,54.61 64.04,54.61 C57.88,49.79 49.73,48.4 42.25,51.03 C35.2,53.51 29.78,59.29 27.74,66.49 C27.29,68.08 28.22,69.74 29.81,70.19 C30.09,70.27 30.36,70.31 30.63,70.31 C31.94,70.31 33.14,69.44 33.52,68.12Z" />
          <path d="M69.95,74.85 C68.35,74.4 66.7,75.32 66.25,76.92 C64.74,82.24 60.73,86.51 55.52,88.35 C50.51,90.11 45.09,89.43 40.73,86.63 C40.73,86.63 43.53,84.51 43.53,84.51 C44.31,83.91 44.08,82.67 43.13,82.4 C43.13,82.4 32.55,79.38 32.55,79.38 C31.78,79.16 31.02,79.74 31.02,80.54 C31.02,80.54 31.09,91.54 31.09,91.54 C31.09,92.53 32.22,93.09 33.01,92.49 C33.01,92.49 35.72,90.43 35.72,90.43 C39.81,93.63 44.77,95.32 49.84,95.32 C52.41,95.32 55,94.89 57.51,94.01 C64.56,91.53 69.99,85.75 72.02,78.55 C72.47,76.95 71.54,75.3 69.95,74.85Z" />
        </g>
      </svg>
    </div>
  );
}

export function DonutWheel({
  value,
  label,
  sublabel,
  tone = "blue",
  size = 118,
}: {
  value: number;
  label: string;
  sublabel?: string;
  tone?: "blue" | "brand" | "warning" | "danger";
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const toneStroke: Record<string, string> = {
    blue: "#5d9ceb",
    brand: "#34c98a",
    warning: "#f0a85b",
    danger: "#f0635f",
  };
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90 drop-shadow-sm">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.76)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={toneStroke[tone]}
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <div className="text-[20px] font-extrabold text-slate-700">{label}</div>
        {sublabel && <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{sublabel}</div>}
      </div>
    </div>
  );
}
