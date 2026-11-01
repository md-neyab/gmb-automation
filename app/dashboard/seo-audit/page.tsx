"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Database,
  ExternalLink,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  Wrench,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiagnosticsResponse, ServiceDiagnostic } from "@/app/api/diagnostics/route";

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mongodb: Database,
  groq: Cpu,
  unsplash: ImageIcon,
  googleAuth: KeyRound,
  gmbApi: MapPin,
};

const DEFAULT_SERVICE_STUBS = [
  { id: "mongodb", name: "MongoDB Atlas", category: "Database" },
  { id: "groq", name: "Groq AI Engine", category: "AI Engine" },
  { id: "unsplash", name: "Unsplash Photo API", category: "Media Engine" },
  { id: "googleAuth", name: "Google Cloud Auth", category: "OAuth" },
  { id: "gmbApi", name: "Google Business Profile API", category: "Core Integration" },
];

export default function SystemHealthDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recheckingServices, setRecheckingServices] = useState<Record<string, boolean>>({});
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});

  // Full concurrent check for all services (no page reload)
  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      if (res.ok) {
        const json: DiagnosticsResponse = await res.json();
        setData(json);

        // Smoothly expand all failing services so users immediately see Actionable Fix Steps
        const initialExpanded: Record<string, boolean> = {};
        json.services.forEach((s) => {
          if (s.status === "fail") {
            initialExpanded[s.id] = true;
          }
        });
        setExpandedServices(initialExpanded);
      }
    } catch (err) {
      console.error("Diagnostics check failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Instant single-service recheck without page reload
  const recheckService = async (serviceId: string) => {
    setRecheckingServices((prev) => ({ ...prev, [serviceId]: true }));
    try {
      const res = await fetch(`/api/diagnostics?service=${encodeURIComponent(serviceId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const updatedService: ServiceDiagnostic = json.service;

        setData((prev) => {
          if (!prev) return prev;
          const nextServices = prev.services.map((s) =>
            s.id === updatedService.id ? updatedService : s,
          );
          const passedCount = nextServices.filter((s) => s.status === "pass").length;
          const totalCount = nextServices.length;
          const healthScore = Math.round((passedCount / totalCount) * 100);
          const isAllPassed = passedCount === totalCount;

          return {
            ...prev,
            services: nextServices,
            passedCount,
            totalCount,
            healthScore,
            isAllPassed,
            timestamp: new Date().toISOString(),
          };
        });

        // If the service just passed, collapse its drawer
        if (updatedService.status === "pass") {
          setExpandedServices((prev) => ({ ...prev, [serviceId]: false }));
        }
      }
    } catch (err) {
      console.error(`Recheck failed for ${serviceId}:`, err);
    } finally {
      setRecheckingServices((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedServices((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const healthScore = data ? data.healthScore : 0;
  const isUnlocked = data ? data.isAllPassed : false;
  const passedCount = data ? data.passedCount : 0;
  const totalCount = data ? data.totalCount : 5;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <Activity className="h-3 w-3" />
              Pre-Flight Command Center
            </span>
            {data?.timestamp && (
              <span className="text-[11px] font-mono text-zinc-500">
                Last checked: {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Live System Health & API Diagnostics
          </h1>
          <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
            Continuous real-time telemetry across MongoDB, Groq AI, Unsplash API, Google OAuth, and Google Business Profile APIs.
          </p>
        </div>

        {/* Global Recheck All Button */}
        <button
          type="button"
          onClick={runDiagnostics}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/95 hover:bg-zinc-800 hover:border-zinc-600 px-4 py-2.5 text-xs font-semibold text-zinc-100 transition shadow-xs disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-400", isLoading && "animate-spin")} />
          <span>{isLoading ? "Checking All Services..." : "Recheck All Systems"}</span>
        </button>
      </div>

      {/* TOP SECTION: THE UNLOCKER (Readiness & Massive Progress Bar) */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border p-6 sm:p-8 backdrop-blur-xl transition-all shadow-2xl",
          isLoading && !data
            ? "border-zinc-800 bg-zinc-900/60 text-zinc-300"
            : isUnlocked
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-zinc-900/90 to-zinc-950 text-emerald-100"
            : "border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-zinc-900/90 to-zinc-950 text-amber-100",
        )}
      >
        {/* Glow ambient background accent */}
        <div
          className={cn(
            "pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30",
            isUnlocked ? "bg-emerald-500" : "bg-amber-500",
          )}
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider font-mono",
                  isLoading && !data
                    ? "border-zinc-700 bg-zinc-800/80 text-zinc-400"
                    : isUnlocked
                    ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/20 text-amber-300",
                )}
              >
                {isLoading && !data ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    Pinging Services...
                  </>
                ) : isUnlocked ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    100% System Readiness • All Systems Operational
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {healthScore}% System Readiness • Action Required
                  </>
                )}
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {isLoading && !data
                ? "Running Pre-Flight Service Verification..."
                : isUnlocked
                ? "Autonomous Features Unlocked"
                : "Complete all system checks to unlock Autonomous Features."}
            </h2>

            <p className="text-xs text-zinc-300 sm:text-sm leading-relaxed">
              {isLoading && !data ? (
                "Pinging all 5 live APIs concurrently to verify authentication, database persistence, and API quota integrity..."
              ) : isUnlocked ? (
                "All 5 core systems have passed pre-flight verification. AI Auto-pilot, instant review generation, and automated posting are fully unlocked."
              ) : (
                <>
                  <strong className="text-white font-medium">{passedCount} of {totalCount}</strong> services operational. Autonomous post publishing, auto-reply cron workflows, and AI generation features remain strictly locked until all system checks pass with a 100% health score.
                </>
              )}
            </p>
          </div>

          {/* Right Hero Badge / CTA / Recheck Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl border shadow-xl backdrop-blur-md",
                isLoading && !data
                  ? "border-zinc-700 bg-zinc-800/50 text-zinc-400"
                  : isUnlocked
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400",
              )}
            >
              {isLoading && !data ? (
                <Loader2 className="h-9 w-9 animate-spin text-zinc-400" />
              ) : isUnlocked ? (
                <Unlock className="h-9 w-9 stroke-[2.2]" />
              ) : (
                <Lock className="h-9 w-9 stroke-[2.2]" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              {isUnlocked ? (
                <Link
                  href="/dashboard/automation"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-xs font-bold text-zinc-950 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Open Automation Command Center</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-950/40 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    <span>{isLoading ? "Checking..." : "Recheck Status"}</span>
                  </button>
                  <span className="text-[11px] text-amber-300/80 text-center">
                    Fix failing checks below to unlock
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Massive Progress Bar */}
        <div className="relative mt-8 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase tracking-wider">
              System Readiness Progress
            </span>
            <span className={cn("font-bold text-sm", isUnlocked ? "text-emerald-400" : "text-amber-400")}>
              {healthScore}%
            </span>
          </div>

          {/* Progress track */}
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-zinc-950/80 p-0.5 border border-zinc-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out shadow-lg",
                isUnlocked
                  ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-emerald-500/40"
                  : "bg-gradient-to-r from-red-500 via-amber-500 to-amber-400 shadow-amber-500/40",
              )}
              style={{ width: `${healthScore}%` }}
            />
          </div>

          {/* Scale markers */}
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1">
            <span>0% (Offline)</span>
            <span>20%</span>
            <span>40%</span>
            <span>60%</span>
            <span>80%</span>
            <span className={cn(isUnlocked ? "text-emerald-400 font-bold" : "")}>
              100% (Unlocked)
            </span>
          </div>
        </div>
      </section>

      {/* THE CHECKLIST UI (Vercel-style deployment log list) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Pre-Flight Service Checklist
            </h2>
            <p className="text-xs text-zinc-400">
              Vercel-style live telemetry. Click <strong className="text-zinc-200">Recheck</strong> on any item to re-test without page reload.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400">
              {passedCount} / {totalCount} verified
            </span>
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-850 px-2.5 py-1 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <RotateCw className={cn("h-3 w-3", isLoading && "animate-spin text-emerald-400")} />
              <span>Recheck All</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800/90 bg-zinc-900/50 shadow-xl backdrop-blur-md overflow-hidden">
          {isLoading && !data
            ? // Loading state: Show each service with a spinning indicator next to it as it's being pinged on page load
              DEFAULT_SERVICE_STUBS.map((stub) => {
                const IconComponent = SERVICE_ICONS[stub.id] || Activity;
                return (
                  <div
                    key={stub.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-zinc-900/30"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/60 text-zinc-400 shadow-xs">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-zinc-200">{stub.name}</span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                            {stub.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono">
                          Pinging service and verifying credentials...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-mono text-zinc-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                        <span>PINGING...</span>
                      </span>
                    </div>
                  </div>
                );
              })
            : data?.services.map((service) => {
                const IconComponent = SERVICE_ICONS[service.id] || Activity;
                const isPassed = service.status === "pass";
                const isExpanded = Boolean(expandedServices[service.id]);
                const isRecheckingThis = Boolean(recheckingServices[service.id]);

                return (
                  <div key={service.id} className="transition-colors hover:bg-zinc-900/70">
                    {/* Main Row */}
                    <div
                      onClick={() => !isPassed && toggleExpand(service.id)}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5",
                        !isPassed && "bg-red-950/5 cursor-pointer",
                      )}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition shadow-xs",
                            isPassed
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-red-500/30 bg-red-500/10 text-red-400",
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-100">
                              {service.name}
                            </span>
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                              {service.category}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {service.details}
                          </p>
                        </div>
                      </div>

                      {/* Right Badges, Single-Service Recheck & Toggle */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        {service.latencyMs !== undefined && (
                          <span className="font-mono text-[11px] text-zinc-500">
                            {service.latencyMs}ms
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold font-mono tracking-wide shadow-xs",
                            isPassed
                              ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                              : "border border-red-500/30 bg-red-500/15 text-red-300",
                          )}
                        >
                          {isRecheckingThis ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                              <span>CHECKING...</span>
                            </>
                          ) : isPassed ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span>✓ PASSED</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-red-400" />
                              <span>✕ FAILED</span>
                            </>
                          )}
                        </span>

                        {/* Instant Row Recheck Button */}
                        <button
                          type="button"
                          title={`Recheck ${service.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            recheckService(service.id);
                          }}
                          disabled={isRecheckingThis}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 hover:border-zinc-600 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition cursor-pointer disabled:opacity-50"
                        >
                          <RotateCw
                            className={cn(
                              "h-3 w-3 text-zinc-300",
                              isRecheckingThis && "animate-spin text-emerald-400",
                            )}
                          />
                          <span>{isRecheckingThis ? "Checking..." : "Recheck"}</span>
                        </button>

                        {!isPassed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(service.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                          >
                            <span>Fix Steps</span>
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 transition-transform duration-200",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Smoothly Expandable Actionable Fix Steps Drawer */}
                    {!isPassed && isExpanded && service.fixSteps && (
                      <div className="border-t border-red-500/20 bg-gradient-to-b from-red-950/20 via-zinc-950/90 to-zinc-950 p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                          <ShieldAlert className="h-4 w-4" />
                          <span>Actionable Fix Steps</span>
                        </div>

                        {/* Error Context Box */}
                        <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 font-mono text-[11px] text-red-200">
                          <strong>Error Details:</strong> {service.details}
                        </div>

                        <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside leading-relaxed pl-1">
                          {service.fixSteps.map((step, idx) => (
                            <li key={idx} className="marker:text-red-400 marker:font-mono">
                              <span className="text-zinc-200">{step}</span>
                            </li>
                          ))}
                        </ol>

                        {/* Drawer Actions: Resolution Link + Direct In-Drawer Recheck Button */}
                        <div className="pt-2 flex flex-wrap items-center gap-3">
                          {service.fixUrl && (
                            <a
                              href={service.fixUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                            >
                              <span>{service.fixUrlLabel || "Open Resolution Link"}</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {/* Primary In-Drawer Recheck Button */}
                          <button
                            type="button"
                            onClick={() => recheckService(service.id)}
                            disabled={isRecheckingThis}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-2.5 text-xs font-bold text-emerald-300 shadow-md shadow-emerald-950/30 transition cursor-pointer disabled:opacity-50"
                          >
                            <RotateCw
                              className={cn(
                                "h-3.5 w-3.5",
                                isRecheckingThis ? "animate-spin text-emerald-400" : "text-emerald-400",
                              )}
                            />
                            <span>
                              {isRecheckingThis
                                ? "Testing Connection..."
                                : "⚡ Recheck Connection Now"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </section>

      {/* Footer Navigation link */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-200">Looking for Automation Settings?</div>
            <div className="text-[11px] text-zinc-400">
              Autonomous posting schedules and AI auto-reply rules unlock automatically once health reaches 100%.
            </div>
          </div>
        </div>

        <Link
          href={isUnlocked ? "/dashboard/automation" : "#"}
          onClick={(e) => {
            if (!isUnlocked) {
              e.preventDefault();
              alert("Automation features are locked until all 5 system checks pass with 100% health.");
            }
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 self-start sm:self-auto",
            isUnlocked
              ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
              : "border border-zinc-700 bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-60",
          )}
        >
          <span>{isUnlocked ? "Go to Automation Flow" : "Automation Locked"}</span>
          {isUnlocked ? <ArrowRight className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        </Link>
      </div>
    </div>
  );
}
