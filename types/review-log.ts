export type ReviewLogStatus = "drafted" | "published";

export interface ReviewLogItem {
  _id?: string;
  reviewId: string;
  reviewerName: string;
  starRating: number;
  customerComment: string;
  aiReplyText: string;
  status: ReviewLogStatus;
  publishedToGmb: boolean;
  seoKeywordsUsed: string[];
  createdAt: string;
  publishedAt?: string;
}
