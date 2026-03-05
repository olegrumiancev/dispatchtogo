import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

/**
 * Hostnames that identify the app subdomain.
 * Requests to these hosts that land on marketing pages
 * are redirected to /app/login.
 */
const APP_HOSTS = ["app.dispatchtogo.com"];

/**
 * Paths that belong to the marketing site.
 * If a request arrives on an APP_HOST for one of these,
 * redirect to /app/login instead.
 */
function isMarketingPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/")
  );
}

// Auth middleware for dashboard routes
const authMiddleware = withAuth({
  pages: {
    signIn: "/app/login",
  },
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // On the app subdomain, redirect marketing pages to /app/login
  if (APP_HOSTS.includes(host) && isMarketingPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/login";
    return NextResponse.redirect(url);
  }

  // For dashboard routes, run auth middleware
  if (
    pathname.startsWith("/app/operator") ||
    pathname.startsWith("/app/vendor") ||
    pathname.startsWith("/app/admin")
  ) {
    return (authMiddleware as any)(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match:
     * - / and /pricing (for app-subdomain redirect)
     * - /app/operator/*, /app/vendor/*, /app/admin/* (for auth)
     */
    "/",
    "/pricing/:path*",
    "/app/operator/:path*",
    "/app/vendor/:path*",
    "/app/admin/:path*",
  ],
};
