import crypto from "crypto";

/**
 * PBKDF2 Password Hashing (Node.js native, salt + hash)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against the stored salt:hash string
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split(":");
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
  } catch {
    return false;
  }
}
