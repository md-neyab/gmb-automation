export type AutomationSettings = {
  autoReplyEnabled: boolean;
  minStarThreshold: number;
  replyTone: "warm" | "professional" | "concise";
  autoPostEnabled: boolean;
  postFrequencyDays: string[];
  postTime?: string;
  postCta: "CALL" | "BOOK" | "LEARN_MORE" | "ORDER";
  seoKeywords: string[];
  lastSyncedAt?: string;
  source?: "mongodb" | "local_fallback";
};

export const DEFAULT_AUTOMATION_KEYWORDS = [
  "wooden flooring",
  "laminate flooring",
  "herringbone flooring",
  "deck tiles",
  "vinyl flooring",
  "SPC flooring installation",
  "balcony flooring",
];

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  autoReplyEnabled: true,
  minStarThreshold: 4,
  replyTone: "warm",
  autoPostEnabled: true,
  postFrequencyDays: ["MON", "WED", "FRI"],
  postTime: "10:00",
  postCta: "CALL",
  seoKeywords: DEFAULT_AUTOMATION_KEYWORDS,
  source: "local_fallback",
};
