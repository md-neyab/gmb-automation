import fs from "fs";
import path from "path";
import { PinPilotReviewConfig, DEFAULT_REVIEW_CONFIG } from "@/types/config";

export * from "@/types/config";

const CONFIG_PATH = path.join(process.cwd(), ".pinpilot-config.json");

export function getReviewConfig(): PinPilotReviewConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_REVIEW_CONFIG,
        ...(parsed.reviews || {}),
      };
    }
  } catch (e) {
    console.warn("Could not read .pinpilot-config.json, using defaults:", e);
  }
  return DEFAULT_REVIEW_CONFIG;
}

export function saveReviewConfig(updates: Partial<PinPilotReviewConfig>): PinPilotReviewConfig {
  try {
    let currentConfig: Record<string, unknown> = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      } catch {
        currentConfig = {};
      }
    }

    const mergedReviews = {
      ...DEFAULT_REVIEW_CONFIG,
      ...((currentConfig.reviews as Record<string, unknown>) || {}),
      ...updates,
    };

    currentConfig.reviews = mergedReviews;
    currentConfig.updatedAt = new Date().toISOString();

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), "utf-8");
    return mergedReviews;
  } catch (e) {
    console.error("Failed to save .pinpilot-config.json:", e);
    throw new Error("Failed to save review configuration.");
  }
}
