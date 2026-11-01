import mongoose, { Schema, Model, Document } from "mongoose";

export interface IPostActivityLog extends Document {
  type: "POST" | "QA";
  title?: string;
  summary: string;
  answer?: string;
  topicType?: "STANDARD" | "OFFER" | "EVENT";
  cta?: string;
  mediaUrl?: string;
  status: "live" | "draft" | "error";
  isAiGenerated?: boolean;
  googleUrl?: string;
  createdAt: Date;
}

const PostActivityLogSchema = new Schema<IPostActivityLog>(
  {
    type: {
      type: String,
      enum: ["POST", "QA"],
      required: true,
      index: true,
    },
    title: {
      type: String,
    },
    summary: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
    },
    topicType: {
      type: String,
      enum: ["STANDARD", "OFFER", "EVENT"],
      default: "STANDARD",
    },
    cta: {
      type: String,
    },
    mediaUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["live", "draft", "error"],
      default: "live",
    },
    isAiGenerated: {
      type: Boolean,
      default: true,
    },
    googleUrl: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

export const PostActivityLog: Model<IPostActivityLog> =
  mongoose.models.PostActivityLog ||
  mongoose.model<IPostActivityLog>("PostActivityLog", PostActivityLogSchema);
