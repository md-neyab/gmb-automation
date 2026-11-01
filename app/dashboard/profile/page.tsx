"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Tag,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessLogo } from "@/components/BusinessLogo";

interface GMBPeriod {
  openDay: string;
  openTime?: { hours?: number; minutes?: number } | string;
  closeDay?: string;
  closeTime?: { hours?: number; minutes?: number } | string;
}

interface ProfileFormData {
  businessName: string;
  logoUrl?: string;
  primaryCategory: string;
  additionalCategories: string[];
  phone: string;
  website: string;
  businessDescription: string;
  regularHours?: {
    periods?: GMBPeriod[];
  } | null;
}

const EMPTY_PROFILE: ProfileFormData = {
  businessName: "",
  logoUrl: undefined,
  primaryCategory: "",
  additionalCategories: [],
  phone: "",
  website: "",
  businessDescription: "",
  regularHours: null,
};

function formatGMBTime(time?: { hours?: number; minutes?: number } | string): string {
  if (!time) return "";
  if (typeof time === "string") return time;
  const h = time.hours ?? 0;
  const m = time.minutes ?? 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMin = m > 0 ? `:${String(m).padStart(2, "0")}` : ":00";
  return `${displayHour}${displayMin} ${ampm}`;
}

function formatDayName(day: string): string {
  const map: Record<string, string> = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
  };
  return map[day.toUpperCase()] || day;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFormData>(EMPTY_PROFILE);
  const [initialProfile, setInitialProfile] = useState<ProfileFormData>(EMPTY_PROFILE);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Loading & status states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch real GMB Profile from API on mount (Zero hardcoded data)
  useEffect(() => {
    let isMounted = true;

    async function loadGMBProfile() {
      try {
        const res = await fetch("/api/gmb/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const json = await res.json();

        if (isMounted && json.profile) {
          const loaded: ProfileFormData = {
            businessName: json.profile.businessName || "",
            logoUrl: json.profile.logoUrl || undefined,
            primaryCategory: json.profile.primaryCategory || "",
            additionalCategories: Array.isArray(json.profile.additionalCategories)
              ? json.profile.additionalCategories
              : [],
            phone: json.profile.phone || "",
            website: json.profile.website || "",
            businessDescription: json.profile.businessDescription || "",
            regularHours: json.profile.regularHours || null,
          };
          setProfile(loaded);
          setInitialProfile(loaded);
        }
      } catch (err) {
        console.error("Could not load GMB profile from API:", err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    }

    loadGMBProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute dirty state
  const isDirty =
    JSON.stringify(profile) !== JSON.stringify(initialProfile);

  // Character counter for description
  const charCount = profile.businessDescription.length;
  const isOverLimit = charCount > 750;

  // 2. Groq AI Description Generator using real profile context
  const handleAutoOptimizeDescription = async () => {
    setIsGeneratingAi(true);

    try {
      const res = await fetch("/api/gmb/profile/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: profile.businessName,
          primaryCategory: profile.primaryCategory,
          additionalCategories: profile.additionalCategories,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Groq generation failed");
      }

      startTransition(() => {
        setProfile((prev) => ({
          ...prev,
          businessDescription: data.description,
        }));
      });

      showToast("✨ AI SEO description generated with Groq LLaMA 3!");
    } catch (err) {
      console.error("AI description generation failed:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to generate AI description",
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 3. Save / PATCH changes to Google Business Profile API
  const handleUpdateGMB = async () => {
    if (isOverLimit) {
      showToast("Description cannot exceed 750 characters before publishing.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/gmb/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setInitialProfile(profile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showToast("✓ Google Business Profile updated and synced successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      showToast(
        err instanceof Error ? err.message : "Error updating Google Business Profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Category Chips Management
  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!profile.additionalCategories.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        additionalCategories: [...prev.additionalCategories, trimmed],
      }));
    }
    setNewCategoryInput("");
    setIsAddingCategory(false);
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      additionalCategories: prev.additionalCategories.filter(
        (c) => c !== catToRemove,
      ),
    }));
  };

  const handleReset = () => {
    setProfile(initialProfile);
    showToast("Changes reverted to saved Google Business Profile.");
  };

  return (
    <div className="relative mx-auto max-w-4xl pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-zinc-700/80 bg-zinc-900/95 px-4 py-3 text-xs font-medium text-zinc-100 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header with Business Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-8 border-b border-zinc-800/80">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div className="relative shrink-0">
            <BusinessLogo
              businessTitle={profile.businessName || "Business"}
              remoteLogoUrl={profile.logoUrl}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-zinc-700/80 shadow-xl object-cover ring-4 ring-emerald-500/10"
            />
            <div
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-md ring-2 ring-zinc-950"
              title="Verified Google Location"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                {profile.businessName || (isLoadingProfile ? "Loading profile..." : "Business Profile")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Verified GMB Location
              </span>
            </div>
            {profile.primaryCategory && (
              <p className="mt-1 text-xs sm:text-sm text-zinc-400 truncate">
                {profile.primaryCategory}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              {profile.website && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-zinc-400" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </span>
              )}
              {profile.website && profile.phone && <span>•</span>}
              {profile.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoadingProfile && (
          <div className="inline-flex items-center gap-2 text-xs text-zinc-500 shrink-0 self-start sm:self-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            <span>Syncing with Google...</span>
          </div>
        )}
      </div>

      {/* Unified Minimalist Form with Horizontal Dividers */}
      <div className="divide-y divide-zinc-800/80">
        {/* ============================================================ */}
        {/* SECTION 1: CORE IDENTITY */}
        {/* ============================================================ */}
        <section className="grid grid-cols-1 gap-6 py-8 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Core identity
            </h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Business title, phone number, and official website appearing directly on Google Knowledge Panels.
            </p>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Business name
              </label>
              <div className="mt-1.5 flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 transition focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/20">
                <Building2 className="mr-2.5 h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  type="text"
                  value={profile.businessName}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, businessName: e.target.value }))
                  }
                  placeholder="Business name"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Primary phone
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 transition focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/20">
                  <Phone className="mr-2.5 h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="Primary phone number"
                    className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Website URL
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 transition focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/20">
                  <Globe className="mr-2.5 h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    type="url"
                    value={profile.website}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, website: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
                  />
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-zinc-500 hover:text-zinc-300"
                      title="Open website"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 2: GMB CATEGORIES */}
        {/* ============================================================ */}
        <section className="grid grid-cols-1 gap-6 py-8 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              GMB categories
            </h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Google Maps algorithms use primary and secondary categories to match buyer search intent in your area.
            </p>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Primary category
              </label>
              <div className="mt-1.5 flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 transition focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/20">
                <Tag className="mr-2.5 h-4 w-4 shrink-0 text-emerald-400" />
                <input
                  type="text"
                  value={profile.primaryCategory}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      primaryCategory: e.target.value,
                    }))
                  }
                  placeholder="Primary GMB Category"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Main business classification driving Map Pack ranking (Google allows 1 primary category).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-zinc-300">
                  Additional categories
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {profile.additionalCategories.length} / 9 max used (Google limit)
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {profile.additionalCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-xs"
                  >
                    <span>{category}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(category)}
                      className="text-zinc-500 hover:text-red-400 transition"
                      title={`Remove ${category}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {profile.additionalCategories.length < 9 ? (
                  isAddingCategory ? (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-zinc-950 px-2 py-1">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCategory();
                          } else if (e.key === "Escape") {
                            setIsAddingCategory(false);
                            setNewCategoryInput("");
                          }
                        }}
                        placeholder="Category name..."
                        className="w-36 bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-500"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setNewCategoryInput("");
                        }}
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add category</span>
                    </button>
                  )
                ) : (
                  <span className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                    Maximum 9 secondary categories reached (Google 10-category limit). Remove one to add another.
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 3: AI BUSINESS DESCRIPTION OPTIMIZER */}
        {/* ============================================================ */}
        <section className="grid grid-cols-1 gap-6 py-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">
                Business description
              </h2>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                Max 750 Chars
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Google allows up to 750 characters. Use our Groq AI optimizer to generate a natural, high-converting summary incorporating your business offerings and local SEO.
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            {/* Header / Trigger row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleAutoOptimizeDescription}
                disabled={isGeneratingAi}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 transition disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Optimizing with Groq LLaMA 3...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>✨ Auto-Optimize SEO Description</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "font-mono font-medium transition",
                    isOverLimit
                      ? "text-red-400 font-bold"
                      : charCount > 650
                        ? "text-amber-400"
                        : "text-zinc-400",
                  )}
                >
                  {charCount} / 750
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500 text-[11px]">
                  {750 - charCount >= 0 ? `${750 - charCount} left` : `${charCount - 750} over limit!`}
                </span>
              </div>
            </div>

            {/* Description Textarea (Scrollbar-Free) */}
            <div className="relative">
              <textarea
                rows={8}
                value={profile.businessDescription}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    businessDescription: e.target.value,
                  }))
                }
                placeholder="Write a clear, compelling business overview under 750 characters..."
                className={cn(
                  "w-full min-h-[190px] resize-none overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-xl border bg-zinc-950 p-3.5 text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 outline-none transition",
                  isOverLimit
                    ? "border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    : "border-zinc-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20",
                )}
              />
            </div>

            {isOverLimit && (
              <p className="text-xs text-red-400">
                Warning: Google Business Profile strictly rejects descriptions longer than 750 characters. Please trim {charCount - 750} characters before updating.
              </p>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 4: REAL OPERATING HOURS FROM GMB */}
        {/* ============================================================ */}
        <section className="grid grid-cols-1 gap-6 py-8 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Operating hours
            </h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Active operating hours fetched directly from your verified Google Business Profile.
            </p>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            {profile.regularHours?.periods && profile.regularHours.periods.length > 0 ? (
              profile.regularHours.periods.map((period, idx) => (
                <div
                  key={`${period.openDay}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock3 className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium text-zinc-200">
                      {formatDayName(period.openDay)}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-zinc-300">
                    {formatGMBTime(period.openTime)} – {formatGMBTime(period.closeTime)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-500">
                {isLoadingProfile
                  ? "Loading hours from Google..."
                  : "No regular hours configured on Google Business Profile."}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/* STICKY ACTION BAR (Centered in main content) */}
      {/* ============================================================ */}
      <div className="sticky bottom-6 z-30 mt-10">
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/95 px-5 py-3.5 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
              )}
            />
            <span className="text-xs text-zinc-300">
              {isDirty ? (
                <span className="text-amber-300 font-medium">
                  Unsaved changes in profile
                </span>
              ) : saveSuccess ? (
                <span className="text-emerald-300 font-medium">
                  ✓ Synced with Google Business Profile
                </span>
              ) : (
                <span className="text-zinc-400">
                  Profile in sync with Google Business Profile
                </span>
              )}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 transition shadow-xs disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleUpdateGMB}
              disabled={isSaving || isOverLimit}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating Google...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Update Google Business Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
