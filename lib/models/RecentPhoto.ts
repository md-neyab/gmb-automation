import mongoose, { Schema, Document, Model } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";

export interface IRecentPhoto extends Document {
  photoId: string;
  url: string;
  thumbnail: string;
  photographer: string;
  altText: string;
  query: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecentPhotoSchema = new Schema<IRecentPhoto>(
  {
    photoId: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    photographer: { type: String, default: "Unsplash Creator" },
    altText: { type: String, default: "" },
    query: { type: String, default: "flooring" },
  },
  { timestamps: true }
);

export const RecentPhoto: Model<IRecentPhoto> =
  mongoose.models.RecentPhoto ||
  mongoose.model<IRecentPhoto>("RecentPhoto", RecentPhotoSchema);

// In-memory fallback if MongoDB connection is unavailable (max 100 items)
let memoryRecentPhotos: Array<{
  photoId: string;
  url: string;
  thumbnail: string;
  photographer: string;
  altText: string;
  query: string;
  createdAt: Date;
}> = [];

const MAX_CACHED_PHOTOS = 100;

/**
 * Saves photos to MongoDB (or memory fallback), maintaining a FIFO limit of 100 photos.
 */
export async function saveRecentPhotos(
  photos: Array<{
    id: string;
    url: string;
    thumbnail: string;
    photographer: string;
    altText: string;
  }>,
  query: string = "flooring"
): Promise<void> {
  if (!photos || photos.length === 0) return;

  try {
    const db = await connectToDatabase();

    if (db) {
      // Upsert photos in MongoDB
      for (const p of photos) {
        if (!p.id || !p.url) continue;
        await RecentPhoto.findOneAndUpdate(
          { photoId: p.id },
          {
            photoId: p.id,
            url: p.url,
            thumbnail: p.thumbnail || p.url,
            photographer: p.photographer || "Unsplash Creator",
            altText: p.altText || query,
            query,
            updatedAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      // Enforce max 100 FIFO queue: delete oldest if count exceeds 100
      const totalCount = await RecentPhoto.countDocuments();
      if (totalCount > MAX_CACHED_PHOTOS) {
        const excess = totalCount - MAX_CACHED_PHOTOS;
        const oldestDocs = await RecentPhoto.find()
          .sort({ updatedAt: 1 })
          .limit(excess)
          .select("_id")
          .lean();

        if (oldestDocs.length > 0) {
          const idsToDelete = oldestDocs.map((d) => d._id);
          await RecentPhoto.deleteMany({ _id: { $in: idsToDelete } });
        }
      }
      return;
    }
  } catch (err) {
    console.warn("MongoDB recent photo save failed, updating memory cache:", err);
  }

  // Memory fallback
  for (const p of photos) {
    if (!p.id || !p.url) continue;
    const existingIndex = memoryRecentPhotos.findIndex((item) => item.photoId === p.id);
    const item = {
      photoId: p.id,
      url: p.url,
      thumbnail: p.thumbnail || p.url,
      photographer: p.photographer || "Unsplash Creator",
      altText: p.altText || query,
      query,
      createdAt: new Date(),
    };

    if (existingIndex >= 0) {
      memoryRecentPhotos.splice(existingIndex, 1);
    }
    memoryRecentPhotos.unshift(item);
  }

  if (memoryRecentPhotos.length > MAX_CACHED_PHOTOS) {
    memoryRecentPhotos = memoryRecentPhotos.slice(0, MAX_CACHED_PHOTOS);
  }
}

/**
 * Retrieves the most recently saved photos (default 12 for initial view).
 */
export async function getRecentPhotos(limit: number = 12): Promise<
  Array<{
    id: string;
    url: string;
    thumbnail: string;
    photographer: string;
    altText: string;
  }>
> {
  try {
    const db = await connectToDatabase();
    if (db) {
      const docs = await RecentPhoto.find()
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      if (docs.length > 0) {
        return docs.map((d) => ({
          id: d.photoId,
          url: d.url,
          thumbnail: d.thumbnail,
          photographer: d.photographer,
          altText: d.altText,
        }));
      }
    }
  } catch (err) {
    console.warn("MongoDB getRecentPhotos failed, using memory cache:", err);
  }

  if (memoryRecentPhotos.length > 0) {
    return memoryRecentPhotos.slice(0, limit).map((d) => ({
      id: d.photoId,
      url: d.url,
      thumbnail: d.thumbnail,
      photographer: d.photographer,
      altText: d.altText,
    }));
  }

  return [];
}
