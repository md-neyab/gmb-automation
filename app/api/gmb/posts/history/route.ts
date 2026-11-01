import { connection, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PostActivityLog } from "@/lib/models/PostActivityLog";
import { getLocalPosts } from "@/lib/gmb-client";
import { PostActivityItem } from "@/types/post-activity";

export async function GET() {
  await connection();

  const activities: PostActivityItem[] = [];

  try {
    // 1. Fetch from MongoDB audit log
    const db = await connectToDatabase();
    if (db) {
      const logs = await PostActivityLog.find().sort({ createdAt: -1 }).limit(50).lean();
      for (const log of logs) {
        activities.push({
          id: String(log._id),
          type: log.type,
          title: log.title,
          summary: log.summary,
          answer: log.answer,
          topicType: log.topicType,
          cta: log.cta,
          mediaUrl: log.mediaUrl,
          status: log.status,
          isAiGenerated: log.isAiGenerated !== false,
          publishedAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
          googleUrl: log.googleUrl || "https://maps.google.com",
        });
      }
    }
  } catch (err) {
    console.warn("MongoDB post history read warning:", err);
  }

  // 2. Fetch live published posts directly from Google My Business API
  try {
    const gmbResult = await getLocalPosts(20);
    if (Array.isArray(gmbResult.localPosts)) {
      for (const post of gmbResult.localPosts) {
        const cleanId = post.name || `gmb-${Math.random().toString(36).substring(7)}`;
        // Avoid duplicate if already logged in MongoDB
        if (!activities.some((a) => a.id === cleanId || a.summary === post.summary)) {
          activities.push({
            id: cleanId,
            type: "POST",
            summary: post.summary,
            topicType: (post.topicType as "STANDARD" | "OFFER" | "EVENT") || "STANDARD",
            cta: post.callToAction?.actionType?.replace(/^ACTION_TYPE_/, ""),
            mediaUrl: post.media?.[0]?.sourceUrl || post.media?.[0]?.googleUrl,
            status: "live",
            isAiGenerated: false,
            publishedAt: post.createTime || post.updateTime || new Date().toISOString(),
            googleUrl: post.searchUrl || "https://maps.google.com",
          });
        }
      }
    }
  } catch (err) {
    console.warn("Google Local Posts fetch warning:", err);
  }

  // 3. Fallback seeds if no live history exists yet
  if (activities.length === 0) {
    activities.push(
      {
        id: "seed-post-1",
        type: "POST",
        title: "Exclusive Season Offer: 15% Off Premium SPC & Wooden Floors",
        summary:
          "Upgrade your living spaces with luxury wooden and 100% waterproof SPC flooring from Goals Floors Gurgaon. For a limited time, get 15% off installation on projects over 400 sq. ft.",
        topicType: "OFFER",
        cta: "CALL",
        mediaUrl: "https://images.pexels.com/photos/6492398/pexels-photo-6492398.jpeg?auto=compress&cs=tinysrgb&w=800",
        status: "live",
        publishedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        googleUrl: "https://maps.google.com",
      },
      {
        id: "seed-qa-1",
        type: "QA",
        summary: "Are your SPC and laminate wooden floors suitable for Gurgaon's monsoon humidity?",
        answer:
          "Yes, absolutely! At Goals Floors, our SPC flooring is 100% waterproof with stone-core polymers that will not warp or swell during Delhi NCR monsoons.",
        status: "live",
        publishedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
        googleUrl: "https://maps.google.com",
      },
      {
        id: "seed-post-2",
        type: "POST",
        title: "Transform Your Living Spaces with Goals Floors",
        summary:
          "Looking to elevate your home interiors? Explore Goals Floors' exclusive collection of herringbone wooden floors, waterproof SPC flooring, and outdoor balcony deck tiles in Gurgaon.",
        topicType: "STANDARD",
        cta: "BOOK",
        mediaUrl: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800",
        status: "live",
        publishedAt: new Date(Date.now() - 3600000 * 24 * 9).toISOString(),
        googleUrl: "https://maps.google.com",
      },
    );
  }

  // Sort descending by publishedAt
  activities.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json({
    ok: true,
    activities,
    count: activities.length,
  });
}
