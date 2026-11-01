export type PinPilotReviewConfig = {
  autoReplyEnabled: boolean;
  minStarThreshold: number; // 1 | 3 | 4 | 5
  defaultTone: "warm" | "professional" | "concise";
  seoKeywords: string[];
};

export const DEFAULT_REVIEW_CONFIG: PinPilotReviewConfig = {
  autoReplyEnabled: true,
  minStarThreshold: 4,
  defaultTone: "warm",
  seoKeywords: [
    "wooden flooring",
    "laminate flooring",
    "SPC flooring",
    "deck tiles",
    "flooring installation",
    "herringbone flooring",
  ],
};
