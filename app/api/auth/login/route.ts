import { connection, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/lib/models";
import { signSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function GET() {
  await connection();
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({
        needsSetup: false,
        hasDatabase: false,
      });
    }

    const count = await AdminUser.countDocuments();
    return NextResponse.json({
      needsSetup: count === 0,
      hasDatabase: true,
      totalAdmins: count,
    });
  } catch (error) {
    console.warn("Auth status check fallback:", error);
    return NextResponse.json({
      needsSetup: false,
      hasDatabase: false,
    });
  }
}

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      isSetup?: boolean;
      passkey?: string;
    };

    const secret = process.env.ADMIN_SESSION_SECRET ?? "development-secret";
    const db = await connectToDatabase();

    // 1. First-Run Setup: Create initial Admin in MongoDB
    if (body.isSetup && body.email && body.password) {
      if (!db) {
        return NextResponse.json(
          { error: "MongoDB is not connected. Please add MONGODB_URI to .env.local." },
          { status: 400 },
        );
      }

      const count = await AdminUser.countDocuments();
      if (count > 0) {
        return NextResponse.json(
          { error: "Admin already exists. Please log in directly." },
          { status: 400 },
        );
      }

      const cleanEmail = body.email.trim().toLowerCase();
      if (!cleanEmail.includes("@") || body.password.length < 6) {
        return NextResponse.json(
          { error: "Please provide a valid email and password (minimum 6 characters)." },
          { status: 400 },
        );
      }

      const passwordHash = hashPassword(body.password);
      await AdminUser.create({
        email: cleanEmail,
        passwordHash,
        lastLoginAt: new Date(),
      });

      const sig = await signSession(cleanEmail, secret);
      const sessionToken = `${cleanEmail}:${sig}`;

      const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
      res.cookies.set("pinpilot_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return res;
    }

    // 2. Email & Password Login against MongoDB
    if (body.email && body.password) {
      if (db) {
        const cleanEmail = body.email.trim().toLowerCase();
        const user = await AdminUser.findOne({ email: cleanEmail });

        if (user && verifyPassword(body.password, user.passwordHash)) {
          user.lastLoginAt = new Date();
          await user.save().catch(() => null);

          const sig = await signSession(cleanEmail, secret);
          const sessionToken = `${cleanEmail}:${sig}`;

          const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
          res.cookies.set("pinpilot_session", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
          return res;
        }

        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }
    }

    // 3. Fallback Passkey Support
    const passkey = body.passkey ?? "";
    const expectedPasskey = process.env.ADMIN_PASSKEY ?? "pinpilot-admin";

    if (passkey && passkey === expectedPasskey) {
      const signed = await signSession(passkey, secret);
      const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
      res.cookies.set("pinpilot_session", signed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return res;
    }

    return NextResponse.json(
      { error: "Authentication failed. Please verify your credentials." },
      { status: 401 },
    );
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Server error during authentication." },
      { status: 500 },
    );
  }
}
