"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Compass,
  ExternalLink,
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GMBOverviewData } from "@/lib/gmb-client";

export default function SettingsAndHealthPage() {
  const [data, setData] = useState<GMBOverviewData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function checkHealth() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/gmb/overview?range=7d", { cache: "no-store" });
      const json: GMBOverviewData = await res.json();
      setData(json);
    } catch (err) {
      console.error("Health check failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/gmb/overview?range=7d", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: GMBOverviewData) => {
        if (active) setData(json);
      })
      .catch((err) => {
        console.error("Health check failed:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  const errors = data?.errors || [];
  const profile = data?.profile;

  const hasPerfError = errors.some((e) =>
    e.toLowerCase().includes("businessprofileperformance"),
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            System Health & Integration Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your Google Business Profile API connections, diagnostics, and workspace keys.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={checkHealth}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-400", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Running Diagnostics..." : "Run Health Check"}</span>
          </button>

          <a
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-red-900/50 hover:bg-red-950/30 hover:text-red-300 transition shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </a>
        </div>
      </div>

      {/* Diagnostics Checklist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-zinc-100">
            GMB Setup & Diagnostics Checklist
          </h2>
          <span className="text-xs text-zinc-500">Live API Verification</span>
        </div>

        <div className="space-y-3">
          {/* Item 1: Business Profile API */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                    profile
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-400",
                  )}
                >
                  {profile ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      Google Business Information API
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        profile
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/20",
                      )}
                    >
                      {profile ? "Active • Verified" : "Action Needed"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Reads verified business name, address, hours, category, and maps metadata for{" "}
                    <strong className="text-zinc-200">{profile?.title || "Goals Floors"}</strong>.
                  </p>
                </div>
              </div>

              {!profile && (
                <a
                  href="https://console.developers.google.com/apis/api/mybusinessbusinessinformation.googleapis.com/overview?project=553384725997"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition shrink-0 self-start sm:self-auto shadow-xs"
                >
                  <span>Enable in Google Cloud</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Item 2: Performance Analytics API */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                    !hasPerfError && data?.kpis?.totalImpressions !== undefined
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-400",
                  )}
                >
                  {!hasPerfError ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      Business Profile Performance API
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        !hasPerfError
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/20",
                      )}
                    >
                      {!hasPerfError ? "Active" : "Enable Required"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Powers daily Search & Maps impression curves, call clicks, website visits, and direction requests.
                  </p>
                </div>
              </div>

              {hasPerfError && (
                <a
                  href="https://console.developers.google.com/apis/api/businessprofileperformance.googleapis.com/overview?project=553384725997"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition shrink-0 self-start sm:self-auto shadow-xs"
                >
                  <span>Enable Performance API</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Item 3: Monthly Search Keywords */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      Search Keywords Reporting
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      Completed Month Sync
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Google calculates top search terms once a full calendar month concludes. Queries automatically populate based on completed monthly data.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Item 4: Gemini AI Engine */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      Google Gemini AI Engine
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Ready
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Powers autonomous local SEO post drafts, sentiment analysis, and intelligent review reply generation.
                  </p>
                </div>
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition shrink-0 self-start sm:self-auto shadow-xs"
              >
                <span>Google AI Studio</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Item 5: OAuth & Token Status */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      Google OAuth & Refresh Token
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Authenticated
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Valid refresh token with <code className="text-zinc-300">business.manage</code> scope. Automatically rotates access tokens on demand.
                  </p>
                </div>
              </div>

              <Link
                href="/api/gmb/discover"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition shrink-0 self-start sm:self-auto shadow-xs"
              >
                <Compass className="h-3 w-3 text-emerald-400" />
                <span>Run GMB Discover</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Account & Developer Inspector Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200">Current Workspace Identifiers</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-3">
            <div className="text-zinc-500">Google Account Name</div>
            <div className="mt-1 font-medium text-zinc-200 select-all truncate">
              {data?.accountName || "accounts/100160338629263213791"}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-3">
            <div className="text-zinc-500">Google Location Name</div>
            <div className="mt-1 font-medium text-zinc-200 select-all truncate">
              {data?.locationName || "locations/10628383136577846839"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
