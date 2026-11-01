"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, Settings } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    title: string;
    logoUrl?: string;
  }>({
    title: "Goals Floors",
    logoUrl: undefined,
  });

  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile drawer on route change
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  // Fetch light overview summary to populate sidebar business name & logo
  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const res = await fetch("/api/gmb/overview?range=7d");
        if (!res.ok) throw new Error("Status check failed");
        const data = await res.json();

        if (isMounted && data.profile) {
          setProfileData({
            title: data.profile.title || "Goals Floors",
            logoUrl: data.profile.logoUrl,
          });
        }
      } catch {
        // Fallback already set to Goals Floors
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar businessTitle={profileData.title} logoUrl={profileData.logoUrl} />

      {/* Mobile Top Navbar (Visible only on < lg screens) */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-zinc-800/80 bg-zinc-950/85 px-4 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-zinc-100">PinPilot</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:text-zinc-100 transition"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:text-zinc-100 transition"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="relative w-72 bg-zinc-950 border-r border-zinc-800/80 shadow-2xl animate-in slide-in-from-left duration-200">
              <Sidebar
                businessTitle={profileData.title}
                logoUrl={profileData.logoUrl}
                onClose={() => setIsMobileMenuOpen(false)}
                isMobile
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (No top workspace bar on desktop) */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
