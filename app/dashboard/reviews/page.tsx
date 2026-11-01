"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  History,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GMBReview } from "@/lib/gmb-client";
import { ReviewLogItem } from "@/types/review-log";

type ReviewItemState = GMBReview & {
  draftReply: string;
  isEditing: boolean;
  isGenerating: boolean;
  isPublishing: boolean;
};

type BatchDraftItem = {
  reviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string;
  draftReply: string;
  isSelected: boolean;
  keywordsUsed: string[];
};

function ReviewerAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [imgError, setImgError] = useState(false);

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-8 w-8 rounded-full border border-zinc-800 object-cover shrink-0"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = name ? name.trim().charAt(0).toUpperCase() : "G";
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300 shrink-0">
      {initial}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItemState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"unreplied" | "published" | "history" | "all" | "low_rating">("unreplied");
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // AI History state
  const [historyLogs, setHistoryLogs] = useState<ReviewLogItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Batch Auto-Reply Modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);
  const [batchDrafts, setBatchDrafts] = useState<BatchDraftItem[]>([]);
  const [publishProgress, setPublishProgress] = useState<{ current: number; total: number } | null>(null);

  const showToast = (msg: string, _type?: "success" | "error") => {
    void _type;
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch reviews from GMB API
  const loadReviews = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch("/api/gmb/reviews", { cache: "no-store" });
      const data = await res.json();
      if (data.reviews && Array.isArray(data.reviews)) {
        setReviews(
          data.reviews.map((r: GMBReview) => ({
            ...r,
            draftReply: r.replyText || "",
            isEditing: false,
            isGenerating: false,
            isPublishing: false,
          })),
        );
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // 2. Fetch AI Reply History from MongoDB
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/gmb/reviews/history", { cache: "no-store" });
      const data = await res.json();
      if (data.logs && Array.isArray(data.logs)) {
        setHistoryLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadReviews(true);
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  // 3. Generate AI reply for a single review
  const handleGenerateReply = async (reviewId: string) => {
    const target = reviews.find((r) => r.reviewId === reviewId);
    if (!target) return;

    setReviews((prev) =>
      prev.map((r) => (r.reviewId === reviewId ? { ...r, isGenerating: true } : r)),
    );

    try {
      const res = await fetch("/api/gmb/reviews/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName: target.reviewer,
          starRating: target.starRating,
          comment: target.comment,
        }),
      });

      const data = await res.json();
      if (data.ok && data.replyText) {
        setReviews((prev) =>
          prev.map((r) =>
            r.reviewId === reviewId
              ? {
                  ...r,
                  draftReply: data.replyText,
                  isEditing: true,
                  isGenerating: false,
                }
              : r,
          ),
        );

        // Save draft to MongoDB ReviewLog
        fetch("/api/gmb/reviews/log-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId: target.reviewId,
            reviewerName: target.reviewer,
            starRating: target.starRating,
            customerComment: target.comment,
            aiReplyText: data.replyText,
            status: "drafted",
            publishedToGmb: false,
            seoKeywordsUsed: data.keywords || [],
          }),
        }).catch(() => null);
      }
    } catch {
      showToast("Failed to generate AI reply");
      setReviews((prev) =>
        prev.map((r) => (r.reviewId === reviewId ? { ...r, isGenerating: false } : r)),
      );
    }
  };

  // 4. Publish reply live to Google Business Profile
  const handlePublishReply = async (reviewId: string) => {
    const target = reviews.find((r) => r.reviewId === reviewId);
    if (!target) return;

    const replyText = target.draftReply.trim();
    if (!replyText) {
      showToast("Reply text cannot be empty");
      return;
    }

    setReviews((prev) =>
      prev.map((r) => (r.reviewId === reviewId ? { ...r, isPublishing: true } : r)),
    );

    try {
      const res = await fetch("/api/gmb/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          replyText,
          reviewerName: target.reviewer,
          starRating: target.starRating,
          customerComment: target.comment,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setReviews((prev) =>
          prev.map((r) =>
            r.reviewId === reviewId
              ? {
                  ...r,
                  replyText,
                  replyTime: data.reply?.updateTime || new Date().toISOString(),
                  isEditing: false,
                  isPublishing: false,
                }
              : r,
          ),
        );
        showToast(`Published reply to ${target.reviewer} on Google Maps`);
        if (activeTab === "history") loadHistory();
      } else {
        showToast(data.error || "Failed to publish reply to Google");
        setReviews((prev) =>
          prev.map((r) => (r.reviewId === reviewId ? { ...r, isPublishing: false } : r)),
        );
      }
    } catch {
      showToast("Error connecting to Google API");
      setReviews((prev) =>
        prev.map((r) => (r.reviewId === reviewId ? { ...r, isPublishing: false } : r)),
      );
    }
  };

  // 5. Open Batch Auto-Reply Modal and generate drafts
  const handleStartBatchPreview = async () => {
    const unreplied = reviews.filter((r) => !r.replyText);
    if (unreplied.length === 0) {
      showToast("No pending reviews to auto-reply.");
      return;
    }

    setShowBatchModal(true);
    setIsBatchGenerating(true);
    setBatchDrafts([]);

    try {
      const res = await fetch("/api/gmb/reviews/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviews: unreplied.map((r) => ({
            reviewId: r.reviewId,
            reviewerName: r.reviewer,
            starRating: r.starRating,
            comment: r.comment,
          })),
        }),
      });

      const data = await res.json();
      if (data.ok && Array.isArray(data.drafts)) {
        setBatchDrafts(
          data.drafts.map((d: { reviewId: string; reviewerName: string; starRating: number; comment?: string; generatedReply: string; keywordsUsed?: string[] }) => ({
            reviewId: d.reviewId,
            reviewerName: d.reviewerName,
            starRating: d.starRating,
            comment: d.comment || "",
            draftReply: d.generatedReply,
            isSelected: true,
            keywordsUsed: d.keywordsUsed || [],
          })),
        );
      } else {
        showToast(data.error || "Failed to generate batch drafts", "error");
      }
    } catch {
      showToast("Error generating batch preview drafts.");
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // 6. Confirm & Publish All Selected Drafts to Google Maps
  const handleConfirmBatchPublish = async () => {
    const selected = batchDrafts.filter((d) => d.isSelected && d.draftReply.trim());
    if (selected.length === 0) {
      showToast("Please select at least one review with a reply.");
      return;
    }

    setIsBatchPublishing(true);
    setPublishProgress({ current: 0, total: selected.length });

    let successCount = 0;

    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      setPublishProgress({ current: i + 1, total: selected.length });

      try {
        const res = await fetch("/api/gmb/reviews/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId: item.reviewId,
            replyText: item.draftReply.trim(),
            reviewerName: item.reviewerName,
            starRating: item.starRating,
            customerComment: item.comment,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          successCount++;
          // Update local review state
          setReviews((prev) =>
            prev.map((r) =>
              r.reviewId === item.reviewId
                ? {
                    ...r,
                    replyText: item.draftReply.trim(),
                    draftReply: item.draftReply.trim(),
                    replyTime: new Date().toISOString(),
                    isEditing: false,
                  }
                : r,
            ),
          );
        }
      } catch (err) {
        console.error(`Batch publish error for ${item.reviewId}:`, err);
      }
    }

    setIsBatchPublishing(false);
    setPublishProgress(null);
    setShowBatchModal(false);
    showToast(`Published replies to ${successCount} reviews on Google Maps!`);

    // Reload history if currently on history tab
    if (activeTab === "history") loadHistory();
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (activeTab === "unreplied" && r.replyText) return false;
      if (activeTab === "published" && !r.replyText) return false;
      if (activeTab === "low_rating" && r.starRating > 3) return false;

      if (starFilter !== "all" && r.starRating !== starFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.reviewer?.toLowerCase().includes(q);
        const matchComment = r.comment?.toLowerCase().includes(q);
        const matchReply = r.replyText?.toLowerCase().includes(q);
        if (!matchName && !matchComment && !matchReply) return false;
      }

      return true;
    });
  }, [reviews, activeTab, starFilter, searchQuery]);

  // Aggregate counts
  const unrepliedCount = useMemo(() => reviews.filter((r) => !r.replyText).length, [reviews]);
  const publishedCount = useMemo(() => reviews.filter((r) => !!r.replyText).length, [reviews]);
  const lowRatingCount = useMemo(() => reviews.filter((r) => r.starRating <= 3).length, [reviews]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-200 shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Clean Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Reviews</h1>
            <span className="text-xs text-zinc-500 tabular-nums">
              {reviews.length} total • {unrepliedCount} unreplied
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === "history") loadHistory();
              else loadReviews(false);
            }}
            disabled={isLoading || isLoadingHistory}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 transition disabled:opacity-50"
            title="Sync latest reviews from Google"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (isLoading || isLoadingHistory) && "animate-spin text-zinc-300",
              )}
            />
          </button>

          <button
            onClick={handleStartBatchPreview}
            disabled={unrepliedCount === 0}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition duration-150 shadow-xs",
              unrepliedCount > 0
                ? "bg-zinc-100 text-zinc-950 hover:bg-white active:scale-[0.98]"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
            )}
          >
            <Zap className="h-3 w-3" />
            <span>Auto-Reply Pending ({unrepliedCount})</span>
          </button>
        </div>
      </div>

      {/* Clean Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80">
        {/* Underline Tabs */}
        <div className="flex items-center gap-5 text-xs overflow-x-auto overflow-y-hidden no-scrollbar -mb-px">
          <button
            onClick={() => setActiveTab("unreplied")}
            className={cn(
              "pb-2 font-medium transition border-b-2 flex items-center gap-1.5 shrink-0",
              activeTab === "unreplied"
                ? "border-zinc-100 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            <span>Unreplied</span>
            <span className="text-[11px] text-zinc-500 tabular-nums">{unrepliedCount}</span>
          </button>

          <button
            onClick={() => setActiveTab("published")}
            className={cn(
              "pb-2 font-medium transition border-b-2 flex items-center gap-1.5 shrink-0",
              activeTab === "published"
                ? "border-zinc-100 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            <span>Published</span>
            <span className="text-[11px] text-zinc-500 tabular-nums">{publishedCount}</span>
          </button>

          {/* AI History Tab */}
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "pb-2 font-medium transition border-b-2 flex items-center gap-1.5 shrink-0",
              activeTab === "history"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            <History className="h-3 w-3 inline text-emerald-400" />
            <span>AI History</span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "pb-2 font-medium transition border-b-2 flex items-center gap-1.5 shrink-0",
              activeTab === "all"
                ? "border-zinc-100 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            <span>All</span>
            <span className="text-[11px] text-zinc-500 tabular-nums">{reviews.length}</span>
          </button>

          {lowRatingCount > 0 && (
            <button
              onClick={() => setActiveTab("low_rating")}
              className={cn(
                "pb-2 font-medium transition border-b-2 flex items-center gap-1.5 shrink-0",
                activeTab === "low_rating"
                  ? "border-rose-400 text-rose-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200",
              )}
            >
              <span>Low Rating (1–3★)</span>
              <span className="text-[11px] text-rose-400 tabular-nums">{lowRatingCount}</span>
            </button>
          )}
        </div>

        {/* Star & Search Controls (Hidden on History tab) */}
        {activeTab !== "history" && (
          <div className="flex items-center gap-2 pb-2">
            <select
              value={starFilter}
              onChange={(e) =>
                setStarFilter(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">All Stars</option>
              <option value={5}>5 Stars ★★★★★</option>
              <option value={4}>4 Stars ★★★★</option>
              <option value={3}>3 Stars ★★★</option>
              <option value={2}>2 Stars ★★</option>
              <option value={1}>1 Star ★</option>
            </select>

            <div className="relative min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1 pl-8 pr-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* VIEW A: AI HISTORY LOGS FEED */}
      {/* ========================================================= */}
      {activeTab === "history" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-emerald-400" />
              <span>MongoDB Audit Log of AI-generated responses</span>
            </span>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition inline-flex items-center gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", isLoadingHistory && "animate-spin")} />
              <span>Refresh History</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 divide-y divide-zinc-850">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 space-y-2 animate-pulse">
                  <div className="h-4 w-40 bg-zinc-900 rounded" />
                  <div className="h-3 w-3/4 bg-zinc-900/60 rounded" />
                </div>
              ))}
            </div>
          ) : historyLogs.length > 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 divide-y divide-zinc-850">
              {historyLogs.map((log) => (
                <div key={log._id || log.reviewId} className="p-4 sm:p-5 space-y-2.5 transition hover:bg-zinc-900/20">
                  {/* Log Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-100">{log.reviewerName}</span>
                      <span className="text-xs text-amber-400 font-medium tabular-nums flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 inline" />
                        <span>{log.starRating}.0</span>
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {log.publishedToGmb || log.status === "published" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Published to Google
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                          <Clock className="h-3 w-3" />
                          Drafted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Review Text */}
                  {log.customerComment ? (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Customer said: &quot;{log.customerComment}&quot;
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      Rating-only review (No written customer comment).
                    </p>
                  )}

                  {/* Generated AI Response */}
                  <div className="pl-3 border-l-2 border-emerald-500/40 bg-zinc-900/30 p-2.5 rounded-r-md space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <Sparkles className="h-3 w-3" />
                      <span>AI Generated Reply</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed">
                      &quot;{log.aiReplyText}&quot;
                    </p>

                    {/* SEO Keywords tags if recorded */}
                    {log.seoKeywordsUsed && log.seoKeywordsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {log.seoKeywordsUsed.map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-zinc-800/80 text-zinc-400 px-1.5 py-0.2 rounded"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500">
              <History className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="font-medium text-zinc-300 text-sm">No AI reply history yet</p>
              <p className="mt-1 text-zinc-500 max-w-sm mx-auto">
                Responses generated via AI or published to Google Business Profile will be logged here.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW B: REVIEWS LIST (LINEAR MINIMALIST FEED) */
        /* ========================================================= */
        isLoading ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 divide-y divide-zinc-850">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 space-y-2 animate-pulse">
                <div className="h-4 w-40 bg-zinc-900 rounded" />
                <div className="h-3 w-3/4 bg-zinc-900/60 rounded" />
              </div>
            ))}
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 divide-y divide-zinc-850">
            {filteredReviews.map((review) => {
              const isReplied = !!review.replyText;
              const isRatingOnly =
                !review.comment ||
                review.comment.trim() === "" ||
                review.comment.toLowerCase().includes("(no written comment)");

              return (
                <div key={review.reviewId} className="p-4 sm:p-5 transition hover:bg-zinc-900/20">
                  {/* 1. Customer Review Row */}
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <ReviewerAvatar name={review.reviewer} photoUrl={review.reviewerPhotoUrl} />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-zinc-100">{review.reviewer}</span>
                          <span className="text-xs text-amber-400 font-medium tabular-nums flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400 inline" />
                            <span>{review.starRating}.0</span>
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-xs text-zinc-500">
                            {new Date(review.createdTime).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div>
                        {isReplied ? (
                          <span className="text-[11px] font-medium text-emerald-400/90">
                            Published
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-400/90">
                            Needs reply
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comment Body */}
                    <div className="mt-2 text-sm text-zinc-300 leading-relaxed font-normal">
                      {isRatingOnly ? (
                        <span className="text-xs text-zinc-500 italic">
                          Rated {review.starRating} out of 5 stars with no written comment.
                        </span>
                      ) : (
                        review.comment
                      )}
                    </div>
                  </div>

                  {/* 2. Minimalist Reply Thread (Directly Below Customer Comment) */}
                  <div className="mt-3 pl-3.5 border-l-2 border-zinc-800 space-y-2">
                    {/* Reply Input or Typography Preview */}
                    {review.isEditing || (!isReplied && !review.draftReply) ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={review.draftReply}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReviews((prev) =>
                              prev.map((r) =>
                                r.reviewId === review.reviewId ? { ...r, draftReply: val } : r,
                              ),
                            );
                          }}
                          placeholder="Generate an AI reply or write your response..."
                          className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 leading-relaxed"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {review.draftReply || review.replyText}
                        </p>
                        {review.replyTime && (
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Published on Google Maps •{" "}
                            {new Date(review.replyTime).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Row */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {!isReplied || review.isEditing ? (
                        <button
                          type="button"
                          onClick={() => handlePublishReply(review.reviewId)}
                          disabled={review.isPublishing || !review.draftReply?.trim()}
                          className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium transition shadow-xs",
                            review.draftReply?.trim() && !review.isPublishing
                              ? "bg-zinc-100 text-zinc-950 hover:bg-white active:scale-[0.98]"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
                          )}
                        >
                          {review.isPublishing ? "Publishing..." : isReplied ? "Update on Google" : "Publish Reply"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleGenerateReply(review.reviewId)}
                        disabled={review.isGenerating}
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 transition disabled:opacity-50"
                      >
                        <Sparkles className={cn("h-3 w-3 text-emerald-400", review.isGenerating && "animate-spin")} />
                        <span>{review.isGenerating ? "Generating..." : "Regenerate AI"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReviews((prev) =>
                            prev.map((r) =>
                              r.reviewId === review.reviewId ? { ...r, isEditing: !r.isEditing } : r,
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 transition"
                      >
                        <Edit3 className="h-3 w-3 text-zinc-500" />
                        <span>{review.isEditing ? "Done" : "Edit"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500">
            <p className="font-medium text-zinc-300 text-sm">No reviews found</p>
            <p className="mt-1 text-zinc-500 max-w-sm mx-auto">
              Try adjusting your search query or star filter to inspect your Google Business reviews.
            </p>
          </div>
        )
      )}

      {/* ========================================================= */}
      {/* 4. AI BATCH REPLY PREVIEW MODAL */}
      {/* ========================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-100">AI Batch Reply Preview</h3>
                <span className="text-xs text-zinc-500">• Goals Floors</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                disabled={isBatchPublishing}
                className="text-zinc-400 hover:text-zinc-200 transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isBatchGenerating ? (
                <div className="py-16 text-center space-y-3">
                  <Sparkles className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-zinc-200">
                    Generating contextual AI replies tailored to Goals Floors...
                  </p>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Gemini 2.5 Flash is analyzing each customer&apos;s star rating and comments to craft warm, SEO-optimized responses.
                  </p>
                </div>
              ) : batchDrafts.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                    <span>
                      Review and edit the AI drafts below before publishing live to Google Maps:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = batchDrafts.every((d) => d.isSelected);
                        setBatchDrafts((prev) =>
                          prev.map((d) => ({ ...d, isSelected: !allSelected })),
                        );
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {batchDrafts.every((d) => d.isSelected) ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  {batchDrafts.map((draft, idx) => (
                    <div
                      key={draft.reviewId}
                      className={cn(
                        "rounded-lg border p-3.5 space-y-2.5 transition",
                        draft.isSelected
                          ? "border-zinc-800 bg-zinc-900/40"
                          : "border-zinc-900 bg-zinc-950 opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.isSelected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setBatchDrafts((prev) =>
                                prev.map((d, i) => (i === idx ? { ...d, isSelected: checked } : d)),
                              );
                            }}
                            className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                          />
                          <span className="text-xs font-semibold text-zinc-200">
                            {draft.reviewerName}
                          </span>
                          <span className="text-xs text-amber-400 font-medium flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-amber-400 inline" />
                            <span>{draft.starRating}.0</span>
                          </span>
                        </div>

                        {draft.keywordsUsed?.length > 0 && (
                          <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            #{draft.keywordsUsed[0]}
                          </span>
                        )}
                      </div>

                      {/* Customer comment snippet */}
                      <p className="text-xs text-zinc-400 leading-relaxed italic pl-5">
                        {draft.comment ? `"${draft.comment}"` : "★ Rating-only review"}
                      </p>

                      {/* Editable AI reply textarea */}
                      <div className="pl-5">
                        <textarea
                          rows={2}
                          value={draft.draftReply}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBatchDrafts((prev) =>
                              prev.map((d, i) => (i === idx ? { ...d, draftReply: val } : d)),
                            );
                          }}
                          className="w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 leading-relaxed resize-none"
                          placeholder="AI response draft..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No pending drafts generated.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950">
              <span className="text-xs text-zinc-400 tabular-nums">
                {batchDrafts.filter((d) => d.isSelected).length} of {batchDrafts.length} selected for publishing
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={isBatchPublishing}
                  className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBatchPublish}
                  disabled={isBatchPublishing || isBatchGenerating || batchDrafts.filter((d) => d.isSelected).length === 0}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white active:scale-[0.98] transition disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                >
                  {isBatchPublishing ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>
                        Publishing {publishProgress?.current} of {publishProgress?.total}...
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Confirm & Publish All to Google Maps</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
