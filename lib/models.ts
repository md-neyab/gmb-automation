import mongoose, { Schema, Model, Document } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getReviewConfig, saveReviewConfig } from "@/lib/config";
import {
  AutomationSettings,
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_AUTOMATION_KEYWORDS,
} from "@/types/automation";

export * from "@/types/automation";

// ==========================================
// 1. ADMIN USER SCHEMA & INTERFACE
// ==========================================

export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

// ==========================================
// 2. AUTOMATION CONFIG SCHEMA & INTERFACE
// ==========================================

export interface IAutomationConfig extends Document {
  locationId: string;
  autoReplyEnabled: boolean;
  minStarThreshold: number;
  replyTone: "warm" | "professional" | "concise";
  autoPostEnabled: boolean;
  postFrequencyDays: string[];
  postTime?: string;
  postCta: "CALL" | "BOOK" | "LEARN_MORE" | "ORDER";
  seoKeywords: string[];
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationConfigSchema = new Schema<IAutomationConfig>(
  {
    locationId: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    autoReplyEnabled: {
      type: Boolean,
      default: true,
    },
    minStarThreshold: {
      type: Number,
      default: 4,
    },
    replyTone: {
      type: String,
      enum: ["warm", "professional", "concise"],
      default: "warm",
    },
    autoPostEnabled: {
      type: Boolean,
      default: true,
    },
    postFrequencyDays: {
      type: [String],
      default: ["MON", "WED", "FRI"],
    },
    postTime: {
      type: String,
      default: "10:00",
    },
    postCta: {
      type: String,
      enum: ["CALL", "BOOK", "LEARN_MORE", "ORDER"],
      default: "CALL",
    },
    seoKeywords: {
      type: [String],
      default: DEFAULT_AUTOMATION_KEYWORDS,
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export const AutomationConfig: Model<IAutomationConfig> =
  mongoose.models.AutomationConfig ||
  mongoose.model<IAutomationConfig>("AutomationConfig", AutomationConfigSchema);

export { ReviewLog, type IReviewLog } from "./models/ReviewLog";

// ==========================================
// 3. FAULT-TOLERANT SERVICE HELPERS
// ==========================================

/**
 * Loads automation settings from MongoDB with local file fallback.
 */
export async function getAutomationSettings(
  locationId = "default",
): Promise<AutomationSettings> {
  const db = await connectToDatabase();

  if (db) {
    try {
      let doc = await AutomationConfig.findOne({ locationId });
      if (!doc) {
        doc = await AutomationConfig.create({
          locationId,
          ...DEFAULT_AUTOMATION_SETTINGS,
        });
      }
      return {
        autoReplyEnabled: doc.autoReplyEnabled,
        minStarThreshold: doc.minStarThreshold,
        replyTone: doc.replyTone as "warm" | "professional" | "concise",
        autoPostEnabled: doc.autoPostEnabled,
        postFrequencyDays: doc.postFrequencyDays || ["MON", "WED", "FRI"],
        postTime: doc.postTime || "10:00",
        postCta: doc.postCta as "CALL" | "BOOK" | "LEARN_MORE" | "ORDER",
        seoKeywords: doc.seoKeywords || DEFAULT_AUTOMATION_KEYWORDS,
        lastSyncedAt: doc.lastSyncedAt?.toISOString(),
        source: "mongodb",
      };
    } catch (err) {
      console.warn("MongoDB query failed, falling back to local file:", err);
    }
  }

  // Graceful local file fallback
  const local = getReviewConfig();
  return {
    autoReplyEnabled: local.autoReplyEnabled,
    minStarThreshold: local.minStarThreshold,
    replyTone: local.defaultTone,
    autoPostEnabled: true,
    postFrequencyDays: ["MON", "WED", "FRI"],
    postTime: "10:00",
    postCta: "CALL",
    seoKeywords: local.seoKeywords?.length ? local.seoKeywords : DEFAULT_AUTOMATION_KEYWORDS,
    source: "local_fallback",
  };
}

/**
 * Saves automation settings to MongoDB and syncs with local fallback.
 */
export async function saveAutomationSettings(
  updates: Partial<AutomationSettings>,
  locationId = "default",
): Promise<AutomationSettings> {
  // Sync to local config
  saveReviewConfig({
    autoReplyEnabled: updates.autoReplyEnabled,
    minStarThreshold: updates.minStarThreshold,
    defaultTone: updates.replyTone,
    seoKeywords: updates.seoKeywords,
  });

  const db = await connectToDatabase();
  if (db) {
    try {
      const doc = await AutomationConfig.findOneAndUpdate(
        { locationId },
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
        { new: true, upsert: true },
      );
      return {
        autoReplyEnabled: doc.autoReplyEnabled,
        minStarThreshold: doc.minStarThreshold,
        replyTone: doc.replyTone as "warm" | "professional" | "concise",
        autoPostEnabled: doc.autoPostEnabled,
        postFrequencyDays: doc.postFrequencyDays || ["MON", "WED", "FRI"],
        postTime: doc.postTime || "10:00",
        postCta: doc.postCta as "CALL" | "BOOK" | "LEARN_MORE" | "ORDER",
        seoKeywords: doc.seoKeywords || DEFAULT_AUTOMATION_KEYWORDS,
        lastSyncedAt: doc.lastSyncedAt?.toISOString(),
        source: "mongodb",
      };
    } catch (err) {
      console.warn("MongoDB update failed:", err);
    }
  }

  return getAutomationSettings(locationId);
}
