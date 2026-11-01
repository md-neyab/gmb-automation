import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signSession, verifySignedSession } from "@/lib/auth";

const dashboardMatcher = "/dashboard";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedDashboard =
    pathname === dashboardMatcher || pathname.startsWith(`${dashboardMatcher}/`);
  const isProtectedGmbApi = pathname === "/api/gmb" || pathname.startsWith("/api/gmb/");

  if (
    (pathname.startsWith("/api/gmb/discover") ||
      pathname.startsWith("/api/gmb/overview") ||
      pathname.startsWith("/api/gmb/logo") ||
      pathname.startsWith("/api/gmb/reviews") ||
      pathname.startsWith("/api/gmb/keywords") ||
      pathname.startsWith("/api/gmb/posts") ||
      pathname.startsWith("/api/gmb/qa") ||
      pathname.startsWith("/api/gmb/automation") ||
      pathname.startsWith("/api/gmb/profile")) &&
    process.env.NODE_ENV === "development"
  ) {
    return NextResponse.next();
  }

  if (!isProtectedDashboard && !isProtectedGmbApi) {
    return NextResponse.next();
  }

  const session = request.cookies.get("pinpilot_session")?.value;
  const passkey = process.env.ADMIN_PASSKEY ?? "pinpilot-admin";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "development-secret";

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Check email-based signed session: "email:signature"
  if (session.includes(":")) {
    const colonIdx = session.indexOf(":");
    const email = session.slice(0, colonIdx);
    const sig = session.slice(colonIdx + 1);
    const expectedSig = await signSession(email, secret);
    if (sig === expectedSig) {
      return NextResponse.next();
    }
  }

  // Fallback check legacy passkey session
  if (await verifySignedSession(session, secret, passkey)) {
    return NextResponse.next();
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/gmb/:path*"],
};
