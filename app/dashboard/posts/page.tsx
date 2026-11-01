"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Sparkles,
  Send,
  Search,
  Check,
  HelpCircle,
  FileText,
  Loader2,
  ExternalLink,
  Phone,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PostActivityItem } from "@/types/post-activity";
import { PostLivePreview } from "@/components/PostLivePreview";

type PostType = "STANDARD" | "OFFER" | "EVENT";
type CtaType = "CALL" | "BOOK" | "LEARN_MORE" | "ORDER";

export type UnsplashImage = {
  id: string;
  url: string;
  thumbnail: string;
  photographer: string;
  altText: string;
};

const SUGGESTED_SEO_KEYWORDS = [
  "Wooden Flooring",
  "Herringbone Parquet",
  "Waterproof SPC Flooring",
  "Balcony Deck Tiles",
  "Laminate Flooring",
  "Engineered Hardwood",
  "Luxury Vinyl Planks",
  "Commercial Flooring",
];

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

function formatExactTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<"posts" | "history">("posts");

  // Post Creator State
  const [postType, setPostType] = useState<PostType>("STANDARD");
  const [postTitle, setPostTitle] = useState("Transform Your Living Spaces with Goals Floors");
  const [postBody, setPostBody] = useState(
    "Looking to elevate your home interiors? Explore Goals Floors' exclusive collection of herringbone wooden floors, waterproof SPC flooring, and outdoor balcony deck tiles. Visit our showroom in Gurgaon or book a free on-site design consultation today.",
  );
  const [postCta, setPostCta] = useState<CtaType>("CALL");
  const [hashtags, setHashtags] = useState<string[]>([
    "#woodenflooring",
    "#gurgaoninteriors",
    "#goalsfloors",
    "#spcflooring",
  ]);

  // AI Copy Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [modalKeyword, setModalKeyword] = useState("Wooden Flooring");
  const [modalCustomPrompt, setModalCustomPrompt] = useState("");
  const [showModalAdvanced, setShowModalAdvanced] = useState(false);
  const [isModalGenerating, setIsModalGenerating] = useState(false);

  // Collapsible Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // Photo Media State (Unsplash 3-Row Scrollable Box)
  const [unsplashQuery, setUnsplashQuery] = useState("wooden flooring");
  const [unsplashPage, setUnsplashPage] = useState(1);
  const [unsplashPhotos, setUnsplashPhotos] = useState<UnsplashImage[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashImage | null>(null);
  const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);
  const [isLoadingMoreUnsplash, setIsLoadingMoreUnsplash] = useState(false);
  const [hasMoreUnsplash, setHasMoreUnsplash] = useState(true);

  // Unsplash Dialog Modal (Popup before select)
  const [dialogPhoto, setDialogPhoto] = useState<UnsplashImage | null>(null);

  // Offer / Event specifics
  const [couponCode, setCouponCode] = useState("GOALS15");
  const [offerTerms, setOfferTerms] = useState("Valid for consultations booked this month.");

  // Action states
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // History Tab State
  const [historyItems, setHistoryItems] = useState<PostActivityItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Toast Helper
  // Toast Helper
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/gmb/posts/history");
      const data = await res.json();
      if (data.ok && Array.isArray(data.activities)) {
        setHistoryItems(data.activities);
      }
    } catch (err) {
      console.warn("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch photos from Unsplash API & persist to localStorage + DB cache
  const fetchUnsplashPhotos = async (queryText: string, pageNum: number, append = false) => {
    if (append) {
      setIsLoadingMoreUnsplash(true);
    } else {
      setIsSearchingUnsplash(true);
    }

    try {
      const res = await fetch(
        `/api/unsplash?query=${encodeURIComponent(queryText)}&page=${pageNum}&per_page=12`,
      );
      const data = await res.json();

      if (Array.isArray(data.photos) && data.photos.length > 0) {
        if (append) {
          setUnsplashPhotos((prev) => {
            const updated = [...prev, ...data.photos];
            try {
              localStorage.setItem("pinpilot_cached_photos", JSON.stringify(updated.slice(0, 48)));
            } catch {}
            return updated;
          });
        } else {
          setUnsplashPhotos(data.photos);
          if (!selectedPhoto) {
            setSelectedPhoto(data.photos[0]);
          }
          try {
            localStorage.setItem("pinpilot_cached_photos", JSON.stringify(data.photos));
          } catch {}
        }
        setHasMoreUnsplash(data.has_more !== false && data.photos.length >= 6);
      } else {
        if (!append) setUnsplashPhotos([]);
        setHasMoreUnsplash(false);
      }
    } catch (err) {
      console.warn("Unsplash fetch failed:", err);
    } finally {
      setIsSearchingUnsplash(false);
      setIsLoadingMoreUnsplash(false);
    }
  };

  const handleSelectPhoto = (photo: UnsplashImage | null) => {
    setSelectedPhoto(photo);
    try {
      if (photo) {
        localStorage.setItem("pinpilot_selected_photo", JSON.stringify(photo));
      } else {
        localStorage.removeItem("pinpilot_selected_photo");
      }
    } catch {}
  };

  const handleUnsplashSearch = () => {
    const q = unsplashQuery.trim();
    if (!q) return; // Block empty-keyword searches strictly
    setUnsplashPage(1);
    fetchUnsplashPhotos(q, 1, false);
  };

  const handleLoadMoreUnsplash = () => {
    const q = unsplashQuery.trim() || "wooden flooring";
    const nextPage = unsplashPage + 1;
    setUnsplashPage(nextPage);
    fetchUnsplashPhotos(q, nextPage, true);
  };

  // 1. Initial photos: client localStorage -> DB recent cache -> GMB auto keyword derivation
  useEffect(() => {
    const initPhotos = async () => {
      // Step A: Check client localStorage first for instant 0ms photo load
      try {
        const local = localStorage.getItem("pinpilot_cached_photos");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUnsplashPhotos(parsed);
            const savedPhoto = localStorage.getItem("pinpilot_selected_photo");
            if (savedPhoto) {
              try {
                setSelectedPhoto(JSON.parse(savedPhoto));
              } catch {
                setSelectedPhoto(parsed[0]);
              }
            } else {
              setSelectedPhoto(parsed[0]);
            }
            return; // ✅ Instant client cache hit — no API call made
          }
        }
      } catch {
        // ignore storage error
      }

      // Step B: Load from recent cache in DB (/api/unsplash/recent)
      try {
        const cacheRes = await fetch("/api/unsplash/recent?limit=12");
        const cacheData = await cacheRes.json();
        if (cacheData.ok && Array.isArray(cacheData.photos) && cacheData.photos.length > 0) {
          setUnsplashPhotos(cacheData.photos);
          setSelectedPhoto(cacheData.photos[0]);
          try {
            localStorage.setItem("pinpilot_cached_photos", JSON.stringify(cacheData.photos));
          } catch {}
          return; // ✅ DB cache hit — no new Unsplash API call needed
        }
      } catch {
        // ignore and continue
      }

      // Step C: First-time auto-search — derive keyword from GMB profile
      let autoKeyword = "";
      try {
        const overviewRes = await fetch("/api/gmb/overview?range=7d");
        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          const cats: string[] = overviewData?.profile?.categories ?? [];
          if (cats.length > 0) {
            autoKeyword = cats[0].replace(/_/g, " ").toLowerCase();
          } else if (overviewData?.profile?.title) {
            autoKeyword = overviewData.profile.title;
          }
        }
      } catch {
        // silently skip — GMB may not be connected yet
      }

      const seedQuery = autoKeyword || "wooden flooring";
      setUnsplashQuery(seedQuery);
      fetchUnsplashPhotos(seedQuery, 1, false);
    };
    initPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Load History when tab changes
  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  // ==========================================
  // AI COPY GENERATION VIA POPUP MODAL
  // ==========================================
  const handleModalGenerate = async () => {
    setIsModalGenerating(true);

    try {
      const promptKeyword = modalCustomPrompt.trim() || modalKeyword;
      const res = await fetch("/api/gmb/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: promptKeyword,
          type: postType,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok && data.content?.body) {
        const c = data.content;
        setPostTitle(c.title || `Goals Floors ${postType === "OFFER" ? "Special Offer" : "Update"}`);
        setPostBody(c.body);
        if (c.cta) setPostCta(c.cta);
        if (Array.isArray(c.hashtags)) setHashtags(c.hashtags);

        setIsAiModalOpen(false);
        showToast(`✨ Generated headline & copy for "${promptKeyword}"!`, "success");
      } else {
        const errorMsg = data.error || "Failed to generate copy. Please retry.";
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("AI copy generate error:", err);
      showToast("Network error generating copy. Please retry.", "error");
    } finally {
      setIsModalGenerating(false);
    }
  };

  // ==========================================
  // PUBLISH POST TO GOOGLE MAPS
  // ==========================================
  const handlePublishPost = async () => {
    if (!postBody.trim()) {
      showToast("Post body cannot be empty", "error");
      return;
    }

    setIsPublishingPost(true);
    try {
      const payload: Record<string, unknown> = {
        title: postTitle,
        summary: postBody.trim(),
        topicType: postType,
        cta: postCta,
        mediaUrl: selectedPhoto?.url || selectedPhoto?.thumbnail,
      };

      if (postType === "OFFER") {
        payload.couponCode = couponCode;
        payload.terms = offerTerms;
      }

      const res = await fetch("/api/gmb/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        showToast("🚀 Successfully published to Google Maps Knowledge Panel!");
        loadHistory();
      } else {
        showToast(data.error || "Failed to publish post", "error");
      }
    } catch {
      showToast("Network error publishing post", "error");
    } finally {
      setIsPublishingPost(false);
    }
  };



  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-xs font-medium shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3",
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-200"
              : "border-rose-500/30 bg-rose-950/90 text-rose-200",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* AI COPY GENERATOR POPUP MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    AI Copy Generator
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Target a local SEO keyword for {postType === "OFFER" ? "Offer post" : postType === "EVENT" ? "Event post" : "What's New post"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Keyword Chips from GMB Profile */}
            {/* Keyword Chips from GMB Profile */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 block">
                Select target keyword / category:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {SUGGESTED_SEO_KEYWORDS.map((kw) => {
                  const isSelected = modalKeyword === kw && !modalCustomPrompt.trim();
                  return (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => {
                        setModalKeyword(kw);
                        setModalCustomPrompt("");
                        setShowModalAdvanced(false);
                      }}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition border",
                        isSelected
                          ? "border-emerald-500/60 bg-emerald-950/50 text-emerald-300 font-semibold shadow-xs"
                          : "border-zinc-800/70 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700",
                      )}
                    >
                      {kw}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Option Toggle (Mutually exclusive with keyword chips) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowModalAdvanced(!showModalAdvanced)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                {showModalAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <span>Advanced: Write custom prompt / instructions</span>
              </button>

              {showModalAdvanced && (
                <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  <textarea
                    rows={2}
                    value={modalCustomPrompt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setModalCustomPrompt(val);
                      if (val.trim()) {
                        setModalKeyword("");
                      }
                    }}
                    placeholder="e.g. Announce a 20% discount on teak balcony deck tiles with fast 48-hr Gurgaon installation..."
                    className="w-full rounded-lg border border-zinc-800/70 bg-zinc-900/50 p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Entering a custom prompt overrides preset keywords.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
              <span className="text-xs text-zinc-400">
                Target:{" "}
                <strong className="text-zinc-200 font-medium">
                  {modalCustomPrompt.trim()
                    ? `Custom ("${modalCustomPrompt.trim().slice(0, 32)}${modalCustomPrompt.trim().length > 32 ? "..." : ""}")`
                    : modalKeyword || "Select a keyword"}
                </strong>
              </span>

              <button
                type="button"
                onClick={handleModalGenerate}
                disabled={isModalGenerating || (!modalKeyword && !modalCustomPrompt.trim())}
                className="rounded-lg bg-zinc-100 hover:bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isModalGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                )}
                <span>{isModalGenerating ? "Writing Copy..." : "Generate Headline & Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Unsplash Image Dialog Modal (Popup before manual select) */}
      {dialogPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 truncate max-w-md">
                  {dialogPhoto.altText || "Unsplash Flooring Photography"}
                </h3>
                <p className="text-xs text-zinc-400">
                  Photo by {dialogPhoto.photographer} on Unsplash
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogPhoto(null)}
                className="text-zinc-500 hover:text-zinc-200 transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* High-Res Preview */}
            <div className="relative h-72 sm:h-84 w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
              <Image
                src={dialogPhoto.url}
                alt={dialogPhoto.altText}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                ID: {dialogPhoto.id}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDialogPhoto(null)}
                  className="rounded-lg border border-zinc-800 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhoto(dialogPhoto);
                    setDialogPhoto(null);
                    showToast("Photo selected for Google Maps post!");
                  }}
                  className="rounded-lg bg-zinc-100 hover:bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Select Image for Post</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Posts Studio
          </h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Publish high-converting Google Maps posts with Groq AI & Unsplash photos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/dashboard/automation"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition"
          >
            <span>Automation Schedule</span>
            <ExternalLink className="h-3 w-3 text-zinc-500" />
          </a>
        </div>
      </div>

      {/* Underline Tabs: Studio | History */}
      <div className="border-b border-zinc-800/80">
        <div className="flex items-center gap-6 text-xs overflow-x-auto overflow-y-hidden no-scrollbar -mb-px">
          <button
            onClick={() => setActiveTab("posts")}
            className={cn(
              "pb-2.5 font-medium transition border-b-2 flex items-center gap-2 shrink-0 text-sm",
              activeTab === "posts"
                ? "border-zinc-100 text-zinc-100 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Local Posts Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "pb-2.5 font-medium transition border-b-2 flex items-center gap-2 shrink-0 text-sm",
              activeTab === "history"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            <History className="h-4 w-4 text-sky-400" />
            <span>History & Logs</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LOCAL POSTS STUDIO */}
      {/* ========================================================= */}
      {activeTab === "posts" && (
        <div
          className={cn(
            "grid items-start gap-8 transition-all duration-300 ease-in-out",
            isPreviewOpen
              ? "grid-cols-1 lg:grid-cols-[1fr_340px]"
              : "grid-cols-1 lg:grid-cols-[1fr_48px]",
          )}
        >
          {/* LEFT: SCROLLABLE FORM COLUMN */}
          <div className="space-y-8 bg-transparent min-w-0">
            {/* 1. Post Type Header (Clean & Uncluttered) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-100">
                  Select post type
                </h2>
                <span className="text-xs text-zinc-500">
                  Powered by <span className="text-zinc-300 font-medium">Groq AI</span>
                </span>
              </div>

              {/* Segmented Control for Post Type */}
              <div className="inline-flex p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/80 gap-1">
                {(
                  [
                    { id: "STANDARD", label: "What's New" },
                    { id: "OFFER", label: "Special Offer" },
                    { id: "EVENT", label: "Event" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPostType(tab.id)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                      postType === tab.id
                        ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Post Copy & AI Generate Button with Popup Trigger */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-100">
                  Post copy & details
                </h2>

                {/* PROMINENT AI GENERATOR BUTTON OPENING POPUP */}
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 to-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:border-emerald-500/60 transition shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Generate with AI</span>
                </button>
              </div>

              {/* Headline / Title */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">
                  Headline (optional)
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Catchy headline for your Google post"
                  className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition"
                />
              </div>

              {/* Body Copy with character count on right */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-400">
                    Body copy
                  </label>
                  <span className="text-xs text-zinc-500 font-mono">
                    {postBody.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Write your Google Business post copy here..."
                  className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5 text-sm sm:text-base text-zinc-200 leading-relaxed placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition resize-y overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                />
              </div>

              {/* Hashtags display */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-zinc-500">
                {hashtags.map((h) => (
                  <span key={h} className="text-zinc-400">
                    {h}
                  </span>
                ))}
              </div>

              {/* Offer-specific inputs */}
              {postType === "OFFER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Coupon code
                    </label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. GOALS15"
                      className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Terms & conditions
                    </label>
                    <input
                      type="text"
                      value={offerTerms}
                      onChange={(e) => setOfferTerms(e.target.value)}
                      placeholder="e.g. Valid for consultations booked this month"
                      className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 transition"
                    />
                  </div>
                </div>
              )}

              {/* Call to Action Button Picker */}
              <div className="pt-1">
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                  Action button on Google Maps
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "CALL", label: "Call Now", icon: Phone },
                      { id: "BOOK", label: "Book Online", icon: Calendar },
                      { id: "LEARN_MORE", label: "Learn More", icon: ExternalLink },
                      { id: "ORDER", label: "Order / Quote", icon: ShoppingBag },
                    ] as const
                  ).map((cta) => {
                    const Icon = cta.icon;
                    return (
                      <button
                        key={cta.id}
                        type="button"
                        onClick={() => setPostCta(cta.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition",
                          postCta === cta.id
                            ? "border-zinc-400 bg-zinc-800 text-zinc-100 font-semibold"
                            : "border-zinc-800/60 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{cta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Photo Media: 3-Rows Scrollable Box */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100 block">
                    Photo media (Unsplash)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Click any photo thumbnail to preview and select for your post
                  </p>
                </div>

                {selectedPhoto && (
                  <button
                    type="button"
                    onClick={() => handleSelectPhoto(null)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
                  >
                    <X className="h-3 w-3" />
                    <span>Clear photo</span>
                  </button>
                )}
              </div>

              {/* Dedicated Box Container with 3 Visible Rows & Internal Scroll */}
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/20 p-3.5 space-y-3">
                {/* Search Bar inside Box (strictly disabled when empty) */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search Unsplash for flooring & interior photos..."
                    value={unsplashQuery}
                    onChange={(e) => setUnsplashQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && unsplashQuery.trim() && handleUnsplashSearch()}
                    className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 py-2 pl-10 pr-24 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition"
                  />
                  <button
                    type="button"
                    onClick={handleUnsplashSearch}
                    disabled={isSearchingUnsplash || !unsplashQuery.trim()}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!unsplashQuery.trim() ? "Enter a keyword to search" : "Search Unsplash"}
                  >
                    {isSearchingUnsplash ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
                  </button>
                </div>

                {/* 3-Row Scrollable Grid Container */}
                <div className="max-h-[310px] overflow-y-auto pr-1 space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {unsplashPhotos.map((photo) => {
                      const isSelected = selectedPhoto?.url === photo.url;
                      return (
                        <div
                          key={photo.id}
                          className={cn(
                            "group relative h-24 rounded-lg overflow-hidden border cursor-pointer transition-all",
                            isSelected
                              ? "border-emerald-400 ring-2 ring-emerald-400/30"
                              : "border-zinc-800/70 hover:border-zinc-600",
                          )}
                          onClick={() => setDialogPhoto(photo)}
                        >
                          <Image
                            src={photo.thumbnail || photo.url}
                            alt={photo.altText}
                            fill
                            sizes="160px"
                            className="object-cover transition-transform group-hover:scale-105"
                          />

                          {/* Direct Select Corner Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPhoto(photo);
                              showToast("✓ Photo selected for your Google post!");
                            }}
                            className={cn(
                              "absolute top-1.5 right-1.5 z-20 rounded-md p-1 transition shadow-md backdrop-blur-sm",
                              isSelected
                                ? "bg-emerald-500 text-zinc-950 font-bold"
                                : "bg-black/65 text-zinc-300 hover:bg-emerald-600 hover:text-white opacity-85 group-hover:opacity-100",
                            )}
                            title={isSelected ? "Selected for post" : "Select directly for post"}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          </button>

                          {/* Hover Overlay Hint */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                            <span className="text-[10px] font-medium text-white bg-black/60 px-2 py-0.5 rounded">
                              Preview
                            </span>
                          </div>

                          {/* Selected Tint */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-950/20 pointer-events-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Box Footer & Load More */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                  <span>
                    Showing {unsplashPhotos.length} photos (scroll inside box to view all)
                  </span>

                  {hasMoreUnsplash ? (
                    <button
                      type="button"
                      onClick={handleLoadMoreUnsplash}
                      disabled={isLoadingMoreUnsplash}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:text-zinc-100 transition disabled:opacity-50"
                    >
                      {isLoadingMoreUnsplash ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3 text-zinc-400" />
                      )}
                      <span>Load More</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic">
                      That&apos;s all • All photos loaded
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Final Publish Action Bar */}
            <div className="pt-4 flex items-center justify-between border-t border-zinc-800/80">
              <span className="text-xs text-zinc-500">
                Ready to publish directly to Google Business Profile
              </span>

              <button
                type="button"
                onClick={handlePublishPost}
                disabled={isPublishingPost}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 hover:bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 shadow-md transition disabled:opacity-50"
              >
                {isPublishingPost ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Publish to Google Maps</span>
              </button>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW COMPONENT (sticky, never scrolls with page) */}
          <PostLivePreview
            postType={postType}
            postTitle={postTitle}
            postBody={postBody}
            postCta={postCta}
            hashtags={hashtags}
            selectedPhoto={selectedPhoto}
            couponCode={couponCode}
            offerTerms={offerTerms}
            isOpen={isPreviewOpen}
            onToggle={() => setIsPreviewOpen((v) => !v)}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ACTION HISTORY & AUDIT LOG (VISUAL CARD GRID) */}
      {/* ========================================================= */}
      {activeTab === "history" && (
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-base sm:text-lg font-medium text-zinc-100">
                Action History & Audit Log
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Audit cards showing all AI-generated posts, manual updates, and seeded Q&As with timestamps.
              </p>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition"
            >
              <RotateCw className={cn("h-3.5 w-3.5", isLoadingHistory && "animate-spin")} />
              <span>Refresh History</span>
            </button>
          </div>

          {/* Visual Cards Grid */}
          {isLoadingHistory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-xl border border-zinc-800/60 bg-zinc-900/30 animate-pulse" />
              ))}
            </div>
          ) : historyItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {historyItems.map((item) => {
                const isAi = item.isAiGenerated !== false;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-800/70 bg-zinc-950/80 hover:border-zinc-700 transition overflow-hidden flex flex-col justify-between shadow-lg shadow-black/20"
                  >
                    <div>
                      {/* Top Media / Thumbnail (+20px image height: 206px -> 226px) */}
                      {item.mediaUrl ? (
                        <div className="relative h-[226px] w-full bg-zinc-900 overflow-hidden border-b border-zinc-800/60">
                          <Image
                            src={item.mediaUrl}
                            alt={item.title || "Post thumbnail"}
                            fill
                            sizes="(max-width: 768px) 100vw, 360px"
                            className="object-cover transition-transform hover:scale-105 duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm shadow-xs",
                                item.type === "POST"
                                  ? "bg-sky-950/80 text-sky-300 border border-sky-500/30"
                                  : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30",
                              )}
                            >
                              {item.type === "POST" ? item.topicType || "GOOGLE POST" : "GOOGLE Q&A"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[105px] w-full bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800/60 px-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                              {item.type === "POST" ? (
                                <FileText className="h-4 w-4" />
                              ) : (
                                <HelpCircle className="h-4 w-4 text-emerald-400" />
                              )}
                            </div>
                            <span className="text-xs font-semibold text-zinc-300 uppercase">
                              {item.type === "POST" ? item.topicType || "GOOGLE POST" : "GOOGLE Q&A"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Card Content Body (-10px+ height compact layout) */}
                      <div className="p-3 space-y-2">
                        {/* AI Detection & Timestamp Row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                          {/* AI Generated Badge vs Manual Post */}
                          {isAi ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
                              <span>AI Generated ✨</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                              <User className="h-2.5 w-2.5" />
                              <span>Manual GMB Post</span>
                            </span>
                          )}

                          {/* Time & Relative Date */}
                          <span
                            className="text-zinc-500 flex items-center gap-1"
                            title={formatExactTime(item.publishedAt)}
                          >
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(item.publishedAt)}</span>
                          </span>
                        </div>

                        {/* Title / Headline */}
                        {item.title && (
                          <h4 className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-1">
                            {item.title}
                          </h4>
                        )}

                        {/* Body Summary */}
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                          {item.summary}
                        </p>

                        {/* Q&A Owner Answer */}
                        {item.answer && (
                          <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-0.5">
                            <span className="text-[10px] font-semibold text-emerald-400 block uppercase">
                              Owner Answer:
                            </span>
                            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                              {item.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Live Status & View Link */}
                    <div className="px-3 py-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <Check className="h-3 w-3" />
                        <span>Live on Google Maps</span>
                      </span>

                      <a
                        href={item.googleUrl || "https://maps.google.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
              <FileText className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400 font-medium">No published posts or Q&As logged yet</p>
              <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                Actions published from the Local Posts Studio or Auto Q&A Seeder will appear here automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
