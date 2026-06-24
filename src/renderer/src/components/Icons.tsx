import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps, children: React.ReactNode) {
  const { size = 18, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const GridIcon = (p: IconProps) =>
  base(p, <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>);

export const UploadIcon = (p: IconProps) =>
  base(p, <><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>);

export const FileSearchIcon = (p: IconProps) =>
  base(p, <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7" /><path d="M14 2l5 5v3" /><circle cx="16.5" cy="16.5" r="2.5" /><path d="M18.5 18.5L21 21" /></>);

export const LayersIcon = (p: IconProps) =>
  base(p, <><path d="M12 2l8 4-8 4-8-4 8-4z" /><path d="M4 11l8 4 8-4" /><path d="M4 16l8 4 8-4" /></>);

export const UserDetailIcon = (p: IconProps) =>
  base(p, <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /><path d="M16 4l1.6 1.6L21 2" /></>);

export const MailIcon = (p: IconProps) =>
  base(p, <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);

export const TrackerIcon = (p: IconProps) =>
  base(p, <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h12" /><circle cx="20" cy="18" r="1.6" /></>);

export const UsersIcon = (p: IconProps) =>
  base(p, <><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><circle cx="17.5" cy="9" r="2.4" /><path d="M15 14.5c2.7.4 4.5 2.3 4.5 5.5" /></>);

export const SettingsIcon = (p: IconProps) =>
  base(p, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.32.22.66.22 1H21a2 2 0 1 1 0 4h-.09c-.14.32-.22.66-.51 1z" /></>);

export const LockIcon = (p: IconProps) =>
  base(p, <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);

export const SearchIcon = (p: IconProps) =>
  base(p, <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>);

export const BellIcon = (p: IconProps) =>
  base(p, <><path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8z" /><path d="M9.5 17a2.5 2.5 0 0 0 5 0" /></>);

export const ChevronRightIcon = (p: IconProps) => base(p, <path d="M9 6l6 6-6 6" />);
export const ChevronDownIcon = (p: IconProps) => base(p, <path d="M6 9l6 6 6-6" />);
export const ArrowUpRightIcon = (p: IconProps) => base(p, <><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>);
export const SunIcon = (p: IconProps) =>
  base(p, <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" /></>);
export const MoonIcon = (p: IconProps) =>
  base(p, <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z" />);
export const PlusIcon = (p: IconProps) => base(p, <><path d="M12 5v14" /><path d="M5 12h14" /></>);
export const FileTextIcon = (p: IconProps) =>
  base(p, <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h8M8 9h2" /></>);
export const DownloadIcon = (p: IconProps) =>
  base(p, <><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></>);
export const SendIcon = (p: IconProps) =>
  base(p, <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>);
export const SaveIcon = (p: IconProps) =>
  base(p, <><path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><path d="M8 4v5h8V4" /><rect x="8" y="13" width="8" height="6" /></>);
export const CheckCircleIcon = (p: IconProps) =>
  base(p, <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.3 2.3L16 9.6" /></>);
export const AlertTriangleIcon = (p: IconProps) =>
  base(p, <><path d="M10.6 3.6a1.6 1.6 0 0 1 2.8 0l8 14.2a1.6 1.6 0 0 1-1.4 2.4H4a1.6 1.6 0 0 1-1.4-2.4z" /><path d="M12 9.5v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></>);
export const SparklesIcon = (p: IconProps) =>
  base(p, <><path d="M12 3l1.4 3.7L17 8l-3.6 1.3L12 13l-1.4-3.7L7 8l3.6-1.3z" /><path d="M5 16l.8 2 2 .8-2 .8L5 21l-.8-2-2-.8 2-.8z" /><path d="M18 14l.7 1.8 1.8.7-1.8.7L18 19l-.7-1.8-1.8-.7 1.8-.7z" /></>);
export const TrashIcon = (p: IconProps) =>
  base(p, <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>);
export const XIcon = (p: IconProps) => base(p, <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>);
export const ChevronLeftIcon = (p: IconProps) => base(p, <path d="M15 18l-6-6 6-6" />);
export const EditIcon = (p: IconProps) =>
  base(p, <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>);
export const BuildingIcon = (p: IconProps) =>
  base(p, <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" /></>);
export const FilterIcon = (p: IconProps) =>
  base(p, <path d="M4 5h16M7 12h10M10 19h4" />);
export const ScaleIcon = (p: IconProps) =>
  base(p, <><path d="M12 3v18" /><path d="M5 7l-3 6a4 4 0 0 0 8 0z" /><path d="M19 7l-3 6a4 4 0 0 0 8 0z" /><path d="M5 7h14" /></>);
export const KeyIcon = (p: IconProps) =>
  base(p, <><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8" /><path d="M16 7l2 2" /><path d="M19 4l2 2" /></>);
export const WifiOffIcon = (p: IconProps) =>
  base(p, <><path d="M2 8.5a16.7 16.7 0 0 1 5.3-3.4" /><path d="M16.7 5.1A16.7 16.7 0 0 1 22 8.5" /><path d="M5 12.5a11.6 11.6 0 0 1 3.4-2.1" /><path d="M15.6 10.4a11.6 11.6 0 0 1 3.4 2.1" /><path d="M8.5 16.3a6.6 6.6 0 0 1 7 0" /><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" /><path d="M2 2l20 20" /></>);
export const ShieldIcon = (p: IconProps) =>
  base(p, <><path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" /><path d="M9 12l2.2 2.2L15.5 9.5" /></>);
export const PhoneIcon = (p: IconProps) =>
  base(p, <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 5.6 13a19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.7 2h3a2 2 0 0 1 2 1.7c.1.7.3 1.5.6 2.2a2 2 0 0 1-.5 2.1L8.9 9a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.1-.4c.7.2 1.5.4 2.2.5A2 2 0 0 1 22 16.9z" /></>);
export const HomeIcon = (p: IconProps) =>
  base(p, <><path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 21h18" /></>);
