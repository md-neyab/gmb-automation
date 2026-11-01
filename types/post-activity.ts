export type PostActivityItem = {
  id: string;
  type: "POST" | "QA";
  title?: string;
  summary: string;
  answer?: string;
  topicType?: "STANDARD" | "OFFER" | "EVENT";
  cta?: string;
  mediaUrl?: string;
  status: "live" | "draft" | "error";
  isAiGenerated?: boolean;
  publishedAt: string;
  googleUrl?: string;
};
