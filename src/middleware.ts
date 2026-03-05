import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

/**
 * Hostnames that identify the app subdomain.
 * Requests to these hosts that land on marketing pages
 * are redirected to /app/login.
 *
 * Set APP_HOST env var to override (e.g. "app.dispatchtogo.test" for local dev).
 * Defaults to the production hostname.
 */
const APP_HOSTS = [
  process.env.APP_HOST ?? "app.dispatchtogo.com",
];

/**
 * Base URL for the app subdomain, used to redirect /app/* paths
 * that arrive on the www/marketing host.
 * Set APP_BASE_URL in .env.local for local dev.
 */
const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";

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
  // Strip port so "app.dispatchtogo.com:3000" matches the same as "app.dispatchtogo.com"
  const host = (request.headers.get("host") ?? "").split(":")[0];

  // On the www/marketing host, redirect all /app and /app/* paths to the app subdomain
  if (!APP_HOSTS.includes(host) && (pathname === "/app" || pathname.startsWith("/app/"))) {
    const search = request.nextUrl.search;
    return NextResponse.redirect(`${APP_BASE_URL}${pathname}${search}`);
  }

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
    "/app/:path*",
  ],
};
