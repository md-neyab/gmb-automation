"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BusinessLogoProps {
  businessTitle?: string;
  remoteLogoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function BusinessLogo({
  businessTitle = "",
  remoteLogoUrl,
  size = "md",
  className,
}: BusinessLogoProps) {
  const [hasError, setHasError] = useState(false);

  // Generate 2-letter monogram for fallback avatar if image fails to load
  const initials =
    businessTitle
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "B";

  const sizeClasses = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
    xl: "h-14 w-14 text-base",
  };

  const imageSrc = remoteLogoUrl || "/api/gmb/logo";

  if (!hasError && imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={businessTitle || "Business Logo"}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={cn(
          "shrink-0 rounded-xl object-cover border border-zinc-700/80 shadow-xs transition-opacity duration-200",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  // Clean fallback monogram avatar
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-950/80 to-zinc-900 border border-emerald-500/30 text-emerald-300 font-bold tracking-wider shadow-xs",
        sizeClasses[size],
        className,
      )}
      title={businessTitle}
    >
      {initials}
    </div>
  );
}
