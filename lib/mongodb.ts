import mongoose from "mongoose";
import dns from "dns";

// On Windows / local ISPs, Node's default resolver frequently fails with querySrv ECONNREFUSED on Atlas SRV records.
// Using public Google & Cloudflare DNS solves SRV record resolution reliably.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setServers is restricted
}

const MONGODB_URI = process.env.MONGODB_URI || "";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Connects to MongoDB with connection caching across Next.js reloads.
 * Returns null gracefully if MONGODB_URI is not set or if connection fails,
 * enabling fault-tolerant local fallback.
 */
export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.warn("MongoDB connection unavailable, using local configuration fallback:", error);
    return null;
  }
}
