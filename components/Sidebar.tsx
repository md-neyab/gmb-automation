"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BriefcaseBusiness,
  ChartColumn,
  FileText,
  Lock,
  MessageSquareQuote,
  PanelLeftClose,
  PanelLeftOpen,
  SearchCheck,
  Settings,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessLogo } from "@/components/BusinessLogo";

export const navItems = [
  { href: "/dashboard", label: "Overview", icon: ChartColumn },
  { href: "/dashboard/reviews", label: "Reviews", icon: MessageSquareQuote },
  { href: "/dashboard/posts", label: "Posts", icon: FileText },
  { href: "/dashboard/profile", label: "Profile", icon: BriefcaseBusiness },
  { href: "/dashboard/seo-audit", label: "System Health", icon: Activity },
  { href: "/dashboard/automation", label: "Automation", icon: Wrench },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  businessTitle?: string;
  logoUrl?: string;
  onClose?: () => void;
  isMobile?: boolean;
  healthScore?: number;
  isAllPassed?: boolean;
}

export function Sidebar({
  businessTitle = "Goals Floors",
  logoUrl,
  onClose,
  isMobile = false,
  healthScore: propHealthScore,
  isAllPassed: propIsAllPassed,
}: SidebarProps) {
  const pathname = usePathname();
  const [internalHealth, setInternalHealth] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (propHealthScore !== undefined && propIsAllPassed !== undefined) return;
    let isMounted = true;
    fetch("/api/diagnostics")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && typeof data.healthScore === "number") {
          setInternalHealth({ score: data.healthScore, passed: Boolean(data.isAllPassed) });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [propHealthScore, propIsAllPassed]);

  const effectiveHealthScore = propHealthScore ?? internalHealth?.score ?? 100;
  const effectiveIsAllPassed = propIsAllPassed ?? internalHealth?.passed ?? true;

  const [isCollapsed, setIsCollapsed] = useState(() => {

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pinpilot_sidebar_collapsed");
        if (stored !== null) return stored === "true";
      } catch {
        // Ignore
      }
    }
    return false;
  });

  function handleToggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pinpilot_sidebar_collapsed", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-zinc-950 text-zinc-100 transition-all duration-300 ease-in-out select-none",
        isMobile
          ? "h-full w-72 p-4"
          : cn(
              "hidden lg:flex shrink-0 min-h-screen border-r border-zinc-800/80 sticky top-0 h-screen",
              isCollapsed ? "w-16 p-2 overflow-hidden" : "w-64 p-4",
            ),
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "mb-5 flex items-center pb-3 border-b border-zinc-800/80",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          className={cn(
            "flex items-center gap-2.5 transition hover:opacity-85",
            isCollapsed && "justify-center",
          )}
          title="PinPilot Local SEO"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-xs mx-auto">
            <Sparkles className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="text-base font-semibold tracking-tight text-zinc-100">PinPilot</span>
          )}
        </Link>

        {/* When Expanded: Show Collapse Button in Header */}
        {!isMobile && !isCollapsed && (
          <button
            onClick={handleToggleCollapse}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition shadow-xs"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}

        {/* Mobile Close Button */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Business Profile Logo & Title Card */}
      <div
        className={cn(
          "mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 shadow-xs transition-all overflow-hidden",
          isCollapsed && "flex justify-center p-1.5 border-transparent bg-transparent",
        )}
        title={businessTitle}
      >
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className={cn(isCollapsed && "mx-auto")}>
            <BusinessLogo
              businessTitle={businessTitle}
              remoteLogoUrl={logoUrl}
              size="md"
            />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="truncate text-sm font-bold tracking-tight text-zinc-100">
                {businessTitle}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-0 overflow-x-hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          const isAutomationLocked = href === "/dashboard/automation" && !effectiveIsAllPassed;

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={isCollapsed ? `${label}${isAutomationLocked ? " (Locked)" : ""}` : undefined}
              className={cn(
                "group flex items-center rounded-lg transition duration-150 overflow-hidden relative",
                isCollapsed
                  ? "justify-center p-2.5 w-11 h-11 mx-auto"
                  : "gap-3.5 px-3 py-2.5 text-[15px] font-medium",
                isActive
                  ? "bg-zinc-900 text-zinc-100 border border-zinc-800/80 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "shrink-0 transition",
                    isCollapsed ? "h-5 w-5 mx-auto" : "h-4 w-4",
                    isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                {isCollapsed && isAutomationLocked && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-zinc-950" />
                )}
              </div>

              {!isCollapsed && <span className="flex-1 truncate">{label}</span>}

              {!isCollapsed && isAutomationLocked && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-400">
                  <Lock className="h-2.5 w-2.5" />
                  Locked
                </span>
              )}

              {!isCollapsed && !isAutomationLocked && isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      {isCollapsed ? (
        /* When Collapsed: Place Expand Button at the Very Bottom in the Empty Space */
        <div className="mt-auto pt-4 flex justify-center overflow-hidden">
          <button
            onClick={handleToggleCollapse}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 transition shadow-xs mx-auto"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5 text-emerald-400" />
          </button>
        </div>
      ) : (
        /* When Expanded: Show Footer Link directly pointing to Diagnostics */
        <div className="mt-auto pt-4 border-t border-zinc-800/80">
          <Link
            href="/dashboard/seo-audit"
            className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5 hover:bg-zinc-900/80 transition"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  effectiveIsAllPassed
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-amber-400 animate-pulse",
                )}
              />
              <span className="text-xs font-medium text-zinc-300">
                {effectiveIsAllPassed ? "All Systems Operational" : `System Health: ${effectiveHealthScore}%`}
              </span>
            </div>
            <span className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300">
              {effectiveIsAllPassed ? "100% →" : "Fix →"}
            </span>
          </Link>
        </div>
      )}
    </aside>
  );
}
