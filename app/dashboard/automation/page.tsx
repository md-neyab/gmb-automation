"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  FileText,
  Loader2,
  Lock,
  MessageSquareQuote,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AutomationSettings, DEFAULT_AUTOMATION_SETTINGS } from "@/types/automation";
import type { DiagnosticsResponse } from "@/app/api/diagnostics/route";

const WEEK_DAYS = [
  { id: "MON", label: "M", title: "Monday" },
  { id: "TUE", label: "T", title: "Tuesday" },
  { id: "WED", label: "W", title: "Wednesday" },
  { id: "THU", label: "T", title: "Thursday" },
  { id: "FRI", label: "F", title: "Friday" },
  { id: "SAT", label: "S", title: "Saturday" },
  { id: "SUN", label: "S", title: "Sunday" },
];

const STAR_OPTIONS = [
  { value: 4, label: "4 & 5 Stars (Hold 1–3★ for Approval)" },
  { value: 1, label: "All 1★ to 5★ (100% Autonomous)" },
  { value: 3, label: "3★, 4★ & 5★ (Hold 1–2★ for Approval)" },
  { value: 5, label: "5★ Only (Hold 1–4★ for Approval)" },
  { value: 99, label: "Manual Approval Only (Draft All)" },
];

const TONE_OPTIONS = [
  { value: "warm", label: "Warm & Grateful" },
  { value: "professional", label: "Professional & Polished" },
  { value: "concise", label: "Short & Crisp" },
];

const CTA_OPTIONS = [
  { value: "CALL", label: "Call Now (Recommended for flooring inquiries)" },
  { value: "BOOK", label: "Book Appointment / Site Visit" },
  { value: "LEARN_MORE", label: "Learn More (Direct to website)" },
  { value: "ORDER", label: "Order Online" },
];

export default function AutomationCommandCenter() {
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_AUTOMATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingKeywords, setIsSyncingKeywords] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Diagnostics / Lock State
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [isCheckingDiagnostics, setIsCheckingDiagnostics] = useState(true);

  // Manual Trigger States & Logs
  const [isTriggeringReview, setIsTriggeringReview] = useState(false);
  const [reviewTriggerLog, setReviewTriggerLog] = useState<string | null>(null);

  const [isTriggeringPost, setIsTriggeringPost] = useState(false);
  const [postTriggerLog, setPostTriggerLog] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  const fetchDiagnostics = async () => {
    setIsCheckingDiagnostics(true);
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      if (res.ok) {
        const diagJson: DiagnosticsResponse = await res.json();
        setDiagnostics(diagJson);
      }
    } catch (err) {
      console.error("Failed to fetch diagnostics:", err);
    } finally {
      setIsCheckingDiagnostics(false);
    }
  };

  // Load diagnostics and settings on mount
  useEffect(() => {
    async function initData() {
      try {
        const [diagRes, settingsRes] = await Promise.all([
          fetch("/api/diagnostics", { cache: "no-store" }).catch(() => null),
          fetch("/api/gmb/automation").catch(() => null),
        ]);

        if (diagRes && diagRes.ok) {
          const diagJson: DiagnosticsResponse = await diagRes.json();
          setDiagnostics(diagJson);
        }

        if (settingsRes && settingsRes.ok) {
          const settingsJson = await settingsRes.json();
          if (settingsJson.settings) {
            setSettings(settingsJson.settings);
          }
        }
      } catch (err) {
        console.error("Failed to fetch automation initialization data:", err);
      } finally {
        setIsLoading(false);
        setIsCheckingDiagnostics(false);
      }
    }
    initData();
  }, []);

  // Save changes
  const handleSave = async (updated?: Partial<AutomationSettings>) => {
    setIsSaving(true);
    const toSave = updated ? { ...settings, ...updated } : settings;
    if (updated) setSettings(toSave);

    try {
      const res = await fetch("/api/gmb/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.ok) {
        setSettings(data.settings);
        showToast("Automation settings saved successfully!");
      } else {
        showToast("Failed to save settings.", "error");
      }
    } catch {
      showToast("Network error while saving settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-refresh keywords from GMB
  const handleSyncKeywords = async () => {
    setIsSyncingKeywords(true);
    try {
      const res = await fetch("/api/gmb/keywords/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.keywords)) {
        setSettings((prev) => ({
          ...prev,
          seoKeywords: data.keywords,
          lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
        }));
        showToast(`AI extracted ${data.keywords.length} fresh SEO keywords from GMB profile!`);
      } else {
        showToast("Keyword extraction failed.", "error");
      }
    } catch {
      showToast("Error connecting to Gemini keywords service.", "error");
    } finally {
      setIsSyncingKeywords(false);
    }
  };

  const handleAddKeyword = () => {
    const kw = newKeywordInput.trim().toLowerCase();
    if (!kw) return;
    if (settings.seoKeywords.includes(kw)) {
      showToast("Keyword already exists in your list.", "error");
      return;
    }
    const next = [...settings.seoKeywords, kw];
    setSettings((prev) => ({ ...prev, seoKeywords: next }));
    setNewKeywordInput("");
    handleSave({ seoKeywords: next });
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    const next = settings.seoKeywords.filter((k) => k !== kwToRemove);
    setSettings((prev) => ({ ...prev, seoKeywords: next }));
    handleSave({ seoKeywords: next });
  };

  const toggleDay = (day: string) => {
    const current = settings.postFrequencyDays || [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setSettings((prev) => ({ ...prev, postFrequencyDays: next }));
    handleSave({ postFrequencyDays: next });
  };

  // Manual Trigger: Review Engine (Calls authenticated internal proxy route with CRON_SECRET_KEY)
  const triggerReviewEngine = async () => {
    setIsTriggeringReview(true);
    try {
      const res = await fetch("/api/internal/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "review" }),
      });
      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (res.ok && data.ok) {
        const msg = `Ran successfully at ${timeStr} (${data.processed ?? 0} reviews processed)`;
        setReviewTriggerLog(msg);
        showToast(msg, "success");
      } else {
        const errMsg = data.message || data.error || `Completed with status ${res.status}`;
        setReviewTriggerLog(`Completed at ${timeStr}: ${errMsg}`);
        showToast(`Review Engine: ${errMsg}`, res.ok ? "success" : "error");
      }
    } catch {
      showToast("Network error executing Review Engine.", "error");
    } finally {
      setIsTriggeringReview(false);
    }
  };

  // Manual Trigger: Post Engine (Calls authenticated internal proxy route with CRON_SECRET_KEY)
  const triggerPostEngine = async () => {
    setIsTriggeringPost(true);
    try {
      const res = await fetch("/api/internal/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "post" }),
      });
      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (res.ok && data.ok) {
        const msg = `Ran successfully at ${timeStr}`;
        setPostTriggerLog(msg);
        showToast("Post Engine ran successfully! Live update dispatched.", "success");
      } else {
        const errMsg = data.error || data.message || `Status ${res.status}`;
        setPostTriggerLog(`Execution at ${timeStr}: ${errMsg}`);
        showToast(`Post Engine: ${errMsg}`, "error");
      }
    } catch {
      showToast("Network error executing Post Engine.", "error");
    } finally {
      setIsTriggeringPost(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
        <p className="text-xs font-mono text-zinc-400">Loading Automation Command Center...</p>
      </div>
    );
  }

  // Strict Lock Check: Is Health below 100%?
  const healthScore = diagnostics?.healthScore ?? 0;
  const isLocked = !diagnostics || !diagnostics.isAllPassed || healthScore < 100;

  return (
    <div className="relative max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
            toast.type === "success"
              ? "border-emerald-500/40 bg-zinc-950 text-emerald-300"
              : "border-rose-500/40 bg-zinc-950 text-rose-300",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. STRICT FULL-PAGE LOCK OVERLAY (When Health < 100%)    */}
      {/* ========================================================= */}
      {isLocked && (
        <div className="absolute inset-0 z-40 flex items-start justify-center pt-16 sm:pt-24 bg-zinc-950/80 backdrop-blur-md rounded-2xl min-h-[700px] p-4 select-none animate-in fade-in duration-200">
          <div className="sticky top-28 max-w-md w-full overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-950/50 via-zinc-900/95 to-zinc-950 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />

            {/* Lock Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-xl mb-4">
              <Lock className="h-8 w-8 stroke-[2.2]" />
            </div>

            {/* Health Score Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300 font-mono mb-3">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Health: {healthScore}% • Verification Required</span>
            </div>

            {/* Strict Lock Message */}
            <h2 className="text-xl font-bold tracking-tight text-white mb-2">
              Autonomous Features Locked
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
              Autonomous Features Locked. Your system health is currently failing. Complete all system checks to 100% to unlock autonomous review replies and scheduled GMB posting.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/dashboard/seo-audit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-950/40 transition hover:scale-[1.02] cursor-pointer"
              >
                <span>Run Pre-Flight Diagnostics</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={fetchDiagnostics}
                disabled={isCheckingDiagnostics}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 hover:text-white px-3.5 py-2.5 text-xs font-medium text-zinc-200 transition cursor-pointer disabled:opacity-50"
              >
                <RotateCw
                  className={cn(
                    "h-3.5 w-3.5 text-zinc-400",
                    isCheckingDiagnostics && "animate-spin text-amber-400",
                  )}
                />
                <span>Recheck Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SETTINGS FORM CONTENT (Inert & Blurred when Locked)   */}
      {/* ========================================================= */}
      <div
        className={cn(
          "space-y-10 transition-all duration-300",
          isLocked && "pointer-events-none opacity-30 select-none",
        )}
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Command Center
              </span>
              <span className="text-zinc-600">•</span>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <Database className="h-3 w-3 text-emerald-400" />
                <span>{settings.source === "mongodb" ? "MongoDB Persistence Active" : "Local Storage Mode"}</span>
              </div>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-100">
              Automation & AI Rules
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Streamlined configuration for autonomous review replies, scheduled Google posts, and local SEO keywords.
            </p>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={isSaving || isLocked}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white active:scale-[0.98] transition shadow-xs self-start sm:self-auto disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Saving..." : "Save All Changes"}</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* SECTION 1: REVIEW AUTO-PILOT ENGINE                      */}
        {/* ========================================================= */}
        <section className="border-b border-zinc-800/80 pb-8 space-y-5">
          {/* Section Header with Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-xs">
                <MessageSquareQuote className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Review Auto-Pilot Engine</h2>
                <p className="text-xs text-zinc-400">
                  Automated contextual replies published to Google Maps verified customer reviews.
                </p>
              </div>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSave({ autoReplyEnabled: !settings.autoReplyEnabled })}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  settings.autoReplyEnabled ? "bg-emerald-500" : "bg-zinc-700",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    settings.autoReplyEnabled ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
              <span
                className={cn(
                  "text-xs font-semibold font-mono",
                  settings.autoReplyEnabled ? "text-emerald-400" : "text-zinc-500",
                )}
              >
                {settings.autoReplyEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* Sleek Horizontal Inline Form (Kills the large grid cards) */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
              <span>Automatically reply to reviews with:</span>

              {/* Star Threshold Dropdown */}
              <div className="relative inline-block">
                <select
                  value={settings.minStarThreshold}
                  onChange={(e) => handleSave({ minStarThreshold: Number(e.target.value) })}
                  className="appearance-none rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-850 px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-100 shadow-xs focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {STAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-200">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              </div>

              <span>using a</span>

              {/* Tone Dropdown */}
              <div className="relative inline-block">
                <select
                  value={settings.replyTone}
                  onChange={(e) =>
                    handleSave({ replyTone: e.target.value as "warm" | "professional" | "concise" })
                  }
                  className="appearance-none rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-850 px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-100 shadow-xs focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-200">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              </div>

              <span>tone.</span>
            </div>
          </div>

          {/* Mini-Section: Live Testing & Logs (Requirement 3) */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">Live Testing & Verification</span>
                {reviewTriggerLog ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {reviewTriggerLog}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500">Ready for manual execution</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Manually run the review reply cron to scan for new pending reviews and publish AI replies.
              </p>
            </div>

            <button
              type="button"
              onClick={triggerReviewEngine}
              disabled={isTriggeringReview || isLocked}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 hover:text-white px-3 py-1.5 text-xs font-semibold text-zinc-200 transition cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto shadow-xs"
            >
              {isTriggeringReview ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span>Executing Review Engine...</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-emerald-400 fill-emerald-400" />
                  <span>▶ Trigger Review Engine Now</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: WEEKLY GMB POSTS AUTO-PILOT                   */}
        {/* ========================================================= */}
        <section className="border-b border-zinc-800/80 pb-8 space-y-5">
          {/* Section Header with Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-xs">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Weekly GMB Posts Auto-Pilot</h2>
                <p className="text-xs text-zinc-400">
                  AI generates and schedules weekly local showcase posts with photos, hashtags, and CTA.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSave({ autoPostEnabled: !settings.autoPostEnabled })}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  settings.autoPostEnabled ? "bg-emerald-500" : "bg-zinc-700",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    settings.autoPostEnabled ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
              <span
                className={cn(
                  "text-xs font-semibold font-mono",
                  settings.autoPostEnabled ? "text-emerald-400" : "text-zinc-500",
                )}
              >
                {settings.autoPostEnabled ? "Armed" : "Paused"}
              </span>
            </div>
          </div>

          {/* Flattened Frequency Schedule & Controls */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Flattened Days Toggle Group */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  Publishing Days
                </label>
                <div className="flex items-center gap-1.5">
                  {WEEK_DAYS.map((day) => {
                    const active = (settings.postFrequencyDays || []).includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        title={day.title}
                        onClick={() => toggleDay(day.id)}
                        className={cn(
                          "h-8 w-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs",
                          active
                            ? "bg-emerald-500 text-zinc-950 shadow-emerald-950/40"
                            : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  Publish Time
                </label>
                <div className="relative flex items-center">
                  <Clock className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="time"
                    value={settings.postTime || "10:00"}
                    onChange={(e) => handleSave({ postTime: e.target.value })}
                    className="w-full sm:w-40 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 pl-9 text-xs font-semibold text-zinc-100 shadow-xs focus:border-emerald-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* CTA Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  Google Button CTA
                </label>
                <div className="relative">
                  <select
                    value={settings.postCta}
                    onChange={(e) =>
                      handleSave({ postCta: e.target.value as "CALL" | "BOOK" | "LEARN_MORE" | "ORDER" })
                    }
                    className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-100 shadow-xs focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {CTA_OPTIONS.map((cta) => (
                      <option key={cta.value} value={cta.value} className="bg-zinc-900 text-zinc-200">
                        {cta.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Mini-Section: Live Testing & Logs (Requirement 3) */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">Live Testing & Verification</span>
                {postTriggerLog ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {postTriggerLog}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500">Ready for manual execution</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Manually dispatch the local post generator to compose and broadcast a live showcase post.
              </p>
            </div>

            <button
              type="button"
              onClick={triggerPostEngine}
              disabled={isTriggeringPost || isLocked}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 hover:text-white px-3 py-1.5 text-xs font-semibold text-zinc-200 transition cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto shadow-xs"
            >
              {isTriggeringPost ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span>Generating Post...</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-emerald-400 fill-emerald-400" />
                  <span>▶ Trigger Post Engine Now</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: AI-EXTRACTED LOCAL SEO KEYWORDS               */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  AI-Extracted Local SEO Keywords
                </h2>
                <p className="text-xs text-zinc-400">
                  Real business categories and search phrases injected into auto-replies and scheduled posts.
                </p>
              </div>
            </div>

            <button
              onClick={handleSyncKeywords}
              disabled={isSyncingKeywords || isLocked}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 transition self-start sm:self-auto disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-400", isSyncingKeywords && "animate-spin")} />
              <span>{isSyncingKeywords ? "Extracting..." : "Auto-Refresh from GMB"}</span>
            </button>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-4">
            {/* Keyword Pills */}
            <div className="flex flex-wrap gap-2">
              {(settings.seoKeywords || []).map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 transition"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-zinc-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
                    title="Remove keyword"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Custom Keyword Input */}
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Add custom SEO keyword..."
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-3 pr-8 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddKeyword}
                disabled={isLocked}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>

            {settings.lastSyncedAt && (
              <p className="text-[11px] text-zinc-500 font-mono">
                Last synced: {new Date(settings.lastSyncedAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
