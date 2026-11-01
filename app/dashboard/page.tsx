"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Compass,
  ExternalLink,
  Eye,
  Globe,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessLogo } from "@/components/BusinessLogo";
import type { GMBOverviewData } from "@/lib/gmb-client";

type DateRange = "7d" | "30d" | "90d";
type MetricFilter = "all" | "impressions" | "actions";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<GMBOverviewData | null>(null);
  const [range, setRange] = useState<DateRange>("30d");
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, startTransition] = useTransition();

  async function fetchOverview(selectedRange: DateRange, isRefresh = false) {
    if (isRefresh) setIsSyncing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(`/api/gmb/overview?range=${selectedRange}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json: GMBOverviewData = await res.json();
      startTransition(() => {
        setData(json);
      });
    } catch (err) {
      console.error("Failed to load GMB overview:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    fetchOverview(range);
  }, [range]);

  const profile = data?.profile;
  const kpis = data?.kpis;
  const dailySeries = data?.dailySeries || [];
  const searchKeywords = data?.searchKeywords || [];
  const recentReviews = data?.recentReviews || [];
  const errors = data?.errors || [];

  const businessName = profile?.title || "Goals Floors";

  const totalImpressions = kpis?.totalImpressions ?? 0;
  const totalActions = kpis?.totalActions ?? 0;
  const totalReviews = kpis?.totalReviewCount ?? 0;

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* TOP HEADER BAR */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          {/* Real Business Logo or Monogram Avatar with Browser Cache */}
          <BusinessLogo
            businessTitle={businessName}
            remoteLogoUrl={profile?.logoUrl}
            size="lg"
          />

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                {businessName}
              </h1>

              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Verified
              </span>
            </div>

            {/* Clean Action Links (No category description) */}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              {profile?.metadata?.mapsUri && (
                <a
                  href={profile.metadata.mapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition underline-offset-4 hover:underline"
                >
                  <span>View on Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {profile?.websiteUri && (
                <>
                  <span className="text-zinc-600">•</span>
                  <a
                    href={profile.websiteUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition"
                  >
                    <span>Website</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Date Range Selector & Sync Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Segmented Control */}
          <div className="flex items-center rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-1 shadow-xs">
            {(["7d", "30d", "90d"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition duration-150 uppercase tabular-nums",
                  range === r
                    ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={() => fetchOverview(range, true)}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/80 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-50 transition shadow-xs disabled:opacity-50"
            title="Refresh from Google API"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-400", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 1: 4 ULTRA-CLEAN KPI CARDS */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Impressions */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Total Impressions</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Eye className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                {isLoading ? "---" : totalImpressions.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500">views</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60">
            {totalImpressions > 0 ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 tabular-nums mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Search {kpis?.searchSharePct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    Maps {kpis?.mapsSharePct}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${kpis?.searchSharePct}%` }}
                  />
                  <div
                    className="bg-indigo-400 h-full transition-all duration-500"
                    style={{ width: `${kpis?.mapsSharePct}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                <span>No impressions recorded yet</span>
                <span className="text-zinc-600">0%</span>
              </div>
            )}
          </div>
        </div>

        {/* KPI 2: Customer Actions */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Customer Actions</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                {isLoading ? "---" : totalActions.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500">interactions</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60">
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-zinc-950/60 rounded px-1.5 py-1 border border-zinc-800/50">
                <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
                  <Phone className="h-2.5 w-2.5 text-emerald-400" />
                  Calls
                </div>
                <div className="text-xs font-medium text-zinc-200 mt-0.5 tabular-nums">
                  {kpis?.callClicks ?? 0}
                </div>
              </div>
              <div className="bg-zinc-950/60 rounded px-1.5 py-1 border border-zinc-800/50">
                <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
                  <Globe className="h-2.5 w-2.5 text-indigo-400" />
                  Web
                </div>
                <div className="text-xs font-medium text-zinc-200 mt-0.5 tabular-nums">
                  {kpis?.websiteClicks ?? 0}
                </div>
              </div>
              <div className="bg-zinc-950/60 rounded px-1.5 py-1 border border-zinc-800/50">
                <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
                  <Navigation className="h-2.5 w-2.5 text-amber-400" />
                  Routes
                </div>
                <div className="text-xs font-medium text-zinc-200 mt-0.5 tabular-nums">
                  {kpis?.directionRequests ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Review Rating & Velocity */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Review Rating</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 flex items-center gap-1 tabular-nums">
                {isLoading
                  ? "---"
                  : totalReviews > 0
                    ? (kpis?.averageRating ?? 0).toFixed(1)
                    : "0.0"}
                <span className="text-amber-400 text-xl">★</span>
              </span>
              <span className="text-xs text-zinc-500 tabular-nums">
                ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Response queue:</span>
            {(kpis?.unrepliedReviewsCount ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 tabular-nums">
                {kpis?.unrepliedReviewsCount} pending reply
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                All replied
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Profile Completeness / System Health */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">SEO Completeness</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                {isLoading ? "---" : `${kpis?.seoScore ?? 100}/100`}
              </span>

              {/* Status Pill linking to Settings if warnings exist */}
              {errors.length > 0 ? (
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition"
                  title="Click to resolve pending API items"
                >
                  <span>{errors.length} Setup Item Pending →</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  System Healthy
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span
                className={cn(
                  "flex items-center gap-0.5",
                  kpis?.seoChecks?.hasWebsite ? "text-emerald-400" : "text-zinc-500",
                )}
                title="Website URL connected"
              >
                <Check className="h-3 w-3" /> Web
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5",
                  kpis?.seoChecks?.hasPhone ? "text-emerald-400" : "text-zinc-500",
                )}
                title="Phone number verified"
              >
                <Check className="h-3 w-3" /> Phone
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5",
                  kpis?.seoChecks?.hasHours ? "text-emerald-400" : "text-zinc-500",
                )}
                title="Business hours configured"
              >
                <Check className="h-3 w-3" /> Hours
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5",
                  kpis?.seoChecks?.hasCategories ? "text-emerald-400" : "text-zinc-500",
                )}
                title="Multi-category optimization"
              >
                <Check className="h-3 w-3" /> Tags
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ROW 2: RESPONSIVE CHARTS & BREAKDOWN */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                Search vs. Maps Traffic Time Series
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Daily visibility metrics aggregated across Google Search and Maps
              </p>
            </div>

            {/* Metric Filter Switcher */}
            <div className="flex items-center rounded-lg border border-zinc-800/80 bg-zinc-950 p-1 text-xs self-start sm:self-auto">
              <button
                onClick={() => setMetricFilter("all")}
                className={cn(
                  "rounded px-2.5 py-1 transition duration-150 text-xs font-medium",
                  metricFilter === "all"
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                All Metrics
              </button>
              <button
                onClick={() => setMetricFilter("impressions")}
                className={cn(
                  "rounded px-2.5 py-1 transition duration-150 text-xs font-medium",
                  metricFilter === "impressions"
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                Impressions
              </button>
              <button
                onClick={() => setMetricFilter("actions")}
                className={cn(
                  "rounded px-2.5 py-1 transition duration-150 text-xs font-medium",
                  metricFilter === "actions"
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                Actions
              </button>
            </div>
          </div>

          {/* Chart Area */}
          <div className="h-72 w-full">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-zinc-500 animate-pulse">
                Loading time series data...
              </div>
            ) : dailySeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailySeries}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="mapsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="actionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />

                  <XAxis
                    dataKey="label"
                    stroke="#52525b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                    labelStyle={{ color: "#f4f4f5", fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: unknown, name: unknown) => {
                      const labels: Record<string, string> = {
                        searchImpressions: "Search Views",
                        mapsImpressions: "Maps Views",
                        totalActions: "Customer Actions",
                      };
                      const key = String(name || "");
                      return [Number(value || 0).toLocaleString(), labels[key] || key];
                    }}
                  />

                  {(metricFilter === "all" || metricFilter === "impressions") && (
                    <Area
                      type="monotone"
                      dataKey="searchImpressions"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#searchGrad)"
                      dot={false}
                    />
                  )}

                  {(metricFilter === "all" || metricFilter === "impressions") && (
                    <Area
                      type="monotone"
                      dataKey="mapsImpressions"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#mapsGrad)"
                      dot={false}
                    />
                  )}

                  {(metricFilter === "all" || metricFilter === "actions") && (
                    <Area
                      type="monotone"
                      dataKey="totalActions"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#actionsGrad)"
                      dot={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                <Compass className="h-8 w-8 text-zinc-600 mb-2" />
                <p className="font-medium text-zinc-400">No time series points available yet</p>
                <p className="max-w-md mt-1 text-xs text-zinc-500">
                  Daily trend points accumulate as customers discover and interact with your verified Google Business Profile.
                </p>
              </div>
            )}
          </div>

          {/* Chart Legend */}
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Search Impressions</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span>Maps Views</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Customer Actions</span>
            </div>
          </div>
        </div>

        {/* Action Breakdown Card (1 col) */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-100">
              Customer Actions
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              High-intent visitor conversion across calls and direct store navigation
            </p>

            <div className="mt-6 space-y-4">
              {/* Phone Calls */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    Phone Calls
                  </span>
                  <span className="text-zinc-100 font-semibold tabular-nums">
                    {kpis?.callClicks ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        totalActions > 0
                          ? Math.round(((kpis?.callClicks ?? 0) / totalActions) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Website Visits */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Globe className="h-3.5 w-3.5 text-indigo-400" />
                    Website Clicks
                  </span>
                  <span className="text-zinc-100 font-semibold tabular-nums">
                    {kpis?.websiteClicks ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        totalActions > 0
                          ? Math.round(((kpis?.websiteClicks ?? 0) / totalActions) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Driving Directions */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Navigation className="h-3.5 w-3.5 text-amber-400" />
                    Directions Requested
                  </span>
                  <span className="text-zinc-100 font-semibold tabular-nums">
                    {kpis?.directionRequests ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        totalActions > 0
                          ? Math.round(((kpis?.directionRequests ?? 0) / totalActions) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/80 rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Total Conversions:</span>
              <span className="font-semibold text-emerald-400 tabular-nums">
                {totalActions}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ROW 3: SEARCH QUERIES & RECENT REVIEWS FEED */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Real Search Queries */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-xs flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                <span>Top Search Queries</span>
                {searchKeywords.length > 0 && (
                  <span className="text-xs font-normal text-zinc-500 tabular-nums">
                    ({searchKeywords.length})
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Keyword impressions driving customer search discoveries
              </p>
            </div>
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          </div>

          {searchKeywords.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-3.5">
              {searchKeywords.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span className="font-medium truncate min-w-0 flex-1 pr-3">
                      {item.keyword}
                    </span>
                    <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                      {item.impressions} {item.impressions === 1 ? "view" : "views"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              <Search className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
              <p className="font-medium text-zinc-400">Search keywords will appear here</p>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Google populates monthly search terms once a full calendar month concludes.
              </p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs shrink-0 text-zinc-500">
            <span>Showing all captured keywords</span>
            <span className="tabular-nums font-medium text-zinc-400">
              {searchKeywords.length} total queries
            </span>
          </div>
        </div>

        {/* Real Customer Reviews Feed */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-xs flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                <span>Recent GMB Reviews</span>
                {recentReviews.length > 0 && (
                  <span className="text-xs font-normal text-zinc-500 tabular-nums">
                    ({recentReviews.length})
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Live verified reviews and automated reply queue status
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Feed</span>
            </div>
          </div>

          {recentReviews.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {recentReviews.map((rev) => {
                const safeStars = Math.max(0, Math.min(5, Math.round(rev.starRating || 0)));
                return (
                  <div
                    key={rev.reviewId}
                    className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3 text-xs space-y-1.5 transition hover:border-zinc-700/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200">{rev.reviewer}</span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: safeStars }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-amber-400" />
                          ))}
                        </div>
                      </div>

                      {rev.replyText ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Replied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                          Needs Reply
                        </span>
                      )}
                    </div>

                    <p className="text-zinc-400 text-xs line-clamp-3 leading-relaxed">
                      &quot;{rev.comment}&quot;
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              <CheckCircle2 className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
              <p className="font-medium text-zinc-400">No customer reviews yet</p>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Once your customers post reviews on your Google Business Profile, they will automatically sync to this feed.
              </p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs shrink-0">
            <span className="text-zinc-500">Customer sentiment tracker</span>
            <Link
              href="/dashboard/reviews"
              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 transition"
            >
              <span>Manage all reviews</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
