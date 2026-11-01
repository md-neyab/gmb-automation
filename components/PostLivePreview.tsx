"use client";

import Image from "next/image";
import {
  Phone,
  Calendar,
  ExternalLink,
  ShoppingBag,
  CheckCircle2,
  Share2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

type PostType = "STANDARD" | "OFFER" | "EVENT";
type CtaType = "CALL" | "BOOK" | "LEARN_MORE" | "ORDER";

export type PreviewUnsplashImage = {
  id: string;
  url: string;
  thumbnail: string;
  photographer: string;
  altText: string;
};

interface PostLivePreviewProps {
  postType: PostType;
  postTitle: string;
  postBody: string;
  postCta: CtaType;
  hashtags: string[];
  selectedPhoto: PreviewUnsplashImage | null;
  couponCode: string;
  offerTerms: string;
  isOpen: boolean;
  onToggle: () => void;
}

const CTA_LABEL: Record<CtaType, string> = {
  CALL: "Call Now",
  BOOK: "Book Online",
  LEARN_MORE: "Learn More",
  ORDER: "Order Now",
};

export function PostLivePreview({
  postType,
  postTitle,
  postBody,
  postCta,
  hashtags,
  selectedPhoto,
  couponCode,
  offerTerms,
  isOpen,
  onToggle,
}: PostLivePreviewProps) {
  /* ── collapsed strip ─────────────────────────── */
  if (!isOpen) {
    return (
      <div
        onClick={onToggle}
        className="sticky top-6 self-start w-12 flex flex-col items-center py-4 rounded-xl border border-zinc-800/60 bg-zinc-950/80 hover:border-zinc-700 transition cursor-pointer group shadow-sm"
        title="Expand Live Preview"
      >
        <button
          type="button"
          className="p-1.5 text-zinc-400 group-hover:text-zinc-100 transition"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <span className="mt-6 text-[10px] font-medium tracking-widest text-zinc-500 group-hover:text-zinc-300 uppercase [writing-mode:vertical-lr] rotate-180 transition">
          Live Preview
        </span>
      </div>
    );
  }

  /* ── expanded preview ────────────────────────── */
  return (
    <div className="sticky top-6 self-start space-y-3 w-[340px]">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-zinc-300">Live preview</span>
          <span className="text-xs text-zinc-500 block">Google Knowledge Panel</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-zinc-900/60 transition"
          title="Collapse preview"
        >
          <PanelRightClose className="h-4 w-4" />
          <span className="text-[11px]">Hide</span>
        </button>
      </div>

      {/* Mobile-width Google Maps card — fixed 340 px */}
      <div className="w-[340px] rounded-2xl border border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden flex flex-col">
        {/* Maps header */}
        <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-900/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
              G
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1">
                <span>Goals Floors</span>
                <CheckCircle2 className="h-3 w-3 text-sky-400 inline" />
              </div>
              <div className="text-[10px] text-zinc-400">Gurgaon • 4.9 ★ (57 reviews)</div>
            </div>
          </div>
          <Share2 className="h-3.5 w-3.5 text-zinc-500" />
        </div>

        {/* Photo area */}
        <div className="shrink-0 relative h-40 w-full bg-zinc-900/50 overflow-hidden">
          {selectedPhoto ? (
            <Image
              src={selectedPhoto.url || selectedPhoto.thumbnail}
              alt={selectedPhoto.altText || "Google post visual"}
              fill
              sizes="340px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-600">
              No image selected (text-only post)
            </div>
          )}
          {postType !== "STANDARD" && (
            <span className="absolute top-2.5 left-2.5 rounded bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-sm">
              {postType}
            </span>
          )}
        </div>

        {/* Post content — scrollable inside so card never pushes page */}
        <div className="p-4 space-y-3 bg-zinc-950 overflow-y-auto max-h-[calc(100vh-22rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="text-[11px] text-zinc-500">Posted on Google • Just now</div>

          {postTitle && (
            <div className="text-sm font-medium text-zinc-100 leading-snug">{postTitle}</div>
          )}

          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap overflow-x-hidden">
            {postBody}
          </p>

          {/* Offer coupon box */}
          {postType === "OFFER" && (
            <div className="rounded-lg border border-dashed border-zinc-700/50 bg-zinc-900/30 p-2.5 space-y-1.5 overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-zinc-500 uppercase font-medium">Coupon Code</span>
                <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  {couponCode || "GOALS15"}
                </span>
              </div>
              {offerTerms && (
                <p className="text-[11px] text-zinc-400 break-words line-clamp-2 leading-relaxed overflow-hidden">
                  {offerTerms}
                </p>
              )}
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-xs text-blue-400/80">
              {hashtags.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          )}

          {/* CTA button */}
          <div className="pt-2">
            <div className="w-full rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 py-2.5 text-center text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer">
              {postCta === "CALL" && <Phone className="h-3.5 w-3.5" />}
              {postCta === "BOOK" && <Calendar className="h-3.5 w-3.5" />}
              {postCta === "LEARN_MORE" && <ExternalLink className="h-3.5 w-3.5" />}
              {postCta === "ORDER" && <ShoppingBag className="h-3.5 w-3.5" />}
              <span>{CTA_LABEL[postCta]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
