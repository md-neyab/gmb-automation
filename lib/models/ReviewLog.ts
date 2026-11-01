import mongoose, { Schema, Model, Document } from "mongoose";

export interface IReviewLog extends Document {
  reviewId: string;
  reviewerName: string;
  starRating: number;
  customerComment: string;
  aiReplyText: string;
  status: "drafted" | "published";
  publishedToGmb: boolean;
  seoKeywordsUsed: string[];
  createdAt: Date;
  publishedAt?: Date;
}

const ReviewLogSchema = new Schema<IReviewLog>(
  {
    reviewId: {
      type: String,
      required: true,
      index: true,
    },
    reviewerName: {
      type: String,
      required: true,
    },
    starRating: {
      type: Number,
      required: true,
    },
    customerComment: {
      type: String,
      default: "",
    },
    aiReplyText: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["drafted", "published"],
      default: "published",
    },
    publishedToGmb: {
      type: Boolean,
      default: false,
    },
    seoKeywordsUsed: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
  },
  { timestamps: false },
);

export const ReviewLog: Model<IReviewLog> =
  mongoose.models.ReviewLog || mongoose.model<IReviewLog>("ReviewLog", ReviewLogSchema);
